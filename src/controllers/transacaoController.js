const crypto = require('crypto');
const { sequelize, Transacao, Usuario, Categoria, Cartao } = require('../models');
const createCrudController = require('./crudController');
const { adicionarMeses } = require('../services/parcelas');

const crud = createCrudController({
  model: Transacao,
  resourceName: 'transacao',
  fields: ['descricao', 'valor', 'tipo', 'data', 'usuarioId', 'categoriaId', 'cartaoId', 'status', 'formaPagamento'],
  preparePayload(payload, existing) {
    const tipo = payload.tipo ?? existing?.tipo;
    if (tipo === 'receita') {
      payload.formaPagamento = null;
      payload.cartaoId = null;
    } else if (tipo === 'despesa' && payload.formaPagamento === undefined && (!existing || existing.tipo !== 'despesa' || Object.hasOwn(payload, 'cartaoId'))) {
      const cartaoId = Object.hasOwn(payload, 'cartaoId') ? payload.cartaoId : existing?.cartaoId;
      payload.formaPagamento = cartaoId != null ? 'cartao' : 'a_vista';
    }
    return payload;
  },
  ownershipRelations: [
    { field: 'categoriaId', model: Categoria },
    { field: 'cartaoId', model: Cartao }
  ],
  include: [
    { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
    { model: Categoria, as: 'categoria' },
    { model: Cartao, as: 'cartao' }
  ]
});

async function criarParceladas(req, res) {
  try {
    const { descricao, valor, tipo, data, categoriaId, cartaoId, totalParcelas, status, formaPagamento } = req.body || {};
    if (status !== undefined && !['previsto', 'realizado'].includes(status)) return res.status(400).json({ error: 'Situacao invalida.' });
    const pagamento = formaPagamento ?? (cartaoId != null ? 'cartao' : 'a_vista');
    if (!['a_vista', 'cartao'].includes(pagamento) || (pagamento === 'a_vista' && cartaoId != null)) {
      return res.status(400).json({ error: 'Forma de pagamento invalida ou incompativel com o cartao informado.' });
    }
    const total = Number(valor);
    const quantidade = Number(totalParcelas);
    const dataValida = typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data) &&
      !Number.isNaN(Date.parse(data + 'T00:00:00.000Z')) && new Date(data + 'T00:00:00.000Z').toISOString().slice(0, 10) === data;

    if (typeof descricao !== 'string' || !descricao.trim() || descricao.trim().length > 255 ||
        !Number.isFinite(total) || total <= 0 || total > 99999999.99 || tipo !== 'despesa' || !dataValida ||
        !Number.isInteger(quantidade) || quantidade < 2 || quantidade > 48) {
      return res.status(400).json({ error: 'Informe descricao, valor total, data e de 2 a 48 parcelas para uma despesa.' });
    }

    const usuarioId = req.usuario.id;
    if (categoriaId !== undefined && categoriaId !== null) {
      const categoria = await Categoria.findOne({ where: { id: categoriaId, usuarioId } });
      if (!categoria) return res.status(400).json({ error: 'A categoria nao pertence ao usuario.' });
      if (categoria.tipo !== tipo) return res.status(400).json({ error: 'A categoria deve ser do tipo despesa.' });
    }
    if (cartaoId !== undefined && cartaoId !== null) {
      const cartao = await Cartao.findOne({ where: { id: cartaoId, usuarioId } });
      if (!cartao) return res.status(400).json({ error: 'O cartao nao pertence ao usuario.' });
    }

    const totalCentavos = Math.round(total * 100);
    if (totalCentavos < quantidade) {
      return res.status(400).json({ error: 'O valor de cada parcela precisa ser de pelo menos R$ 0,01.' });
    }

    const grupoParcelamento = crypto.randomUUID();
    const valorBaseCentavos = Math.floor(totalCentavos / quantidade);
    const sobraCentavos = totalCentavos % quantidade;
    const parcelas = Array.from({ length: quantidade }, (_, indice) => ({
      descricao: descricao.trim(),
      valor: (valorBaseCentavos + (indice < sobraCentavos ? 1 : 0)) / 100,
      tipo,
      formaPagamento: pagamento,
      status: indice === 0 ? (status || 'previsto') : 'previsto',
      data: adicionarMeses(data, indice),
      usuarioId,
      categoriaId: categoriaId ?? null,
      cartaoId: cartaoId ?? null,
      grupoParcelamento,
      numeroParcela: indice + 1,
      totalParcelas: quantidade
    }));

    const criadas = await sequelize.transaction((transaction) =>
      Transacao.bulkCreate(parcelas, { transaction, returning: true, validate: true })
    );
    return res.status(201).json(criadas);
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'AggregateError') {
      return res.status(400).json({ error: 'Dados invalidos', detalhes: (error.errors || []).map(({ message }) => message) });
    }
    console.error('Falha ao criar parcelas:', error.name, error.message);
    return res.status(500).json({ error: 'Erro ao criar as parcelas' });
  }
}

async function removerGrupoParcelado(req, res) {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.grupoId)) {
      return res.status(400).json({ error: 'Identificador de parcelamento invalido' });
    }
    const where = { grupoParcelamento: req.params.grupoId };
    if (req.usuario.tipoUsuario !== 'admin') where.usuarioId = req.usuario.id;
    const removidas = await Transacao.destroy({ where });
    if (!removidas) return res.status(404).json({ error: 'Parcelamento nao encontrado' });
    return res.status(204).send();
  } catch (error) {
    console.error('Falha ao remover parcelamento:', error.name, error.message);
    return res.status(500).json({ error: 'Erro ao remover parcelamento' });
  }
}

module.exports = { ...crud, criarParceladas, removerGrupoParcelado };
