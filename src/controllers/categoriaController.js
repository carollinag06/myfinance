const { Categoria, Usuario, Transacao, Orcamento } = require('../models');
const createCrudController = require('./crudController');
const { ensureDefaultCategories } = require('../services/defaultCategories');

const crud = createCrudController({
  model: Categoria,
  resourceName: 'categoria',
  fields: ['nome', 'descricao', 'tipo', 'usuarioId'],
  include: [
    { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
    { model: Transacao, as: 'transacoes' },
    { model: Orcamento, as: 'orcamentos' }
  ]
});

const protegerCategoriaPadrao = (operacao, nomeOperacao) => async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    const isAdmin = req.usuario && req.usuario.tipoUsuario === 'admin';
    if (!categoria || (!isAdmin && Number(categoria.usuarioId) !== Number(req.usuario.id))) {
      return operacao(req, res);
    }

    if (categoria.isPadrao) {
      return res.status(400).json({ error: 'Categorias padrao nao podem ser ' + nomeOperacao });
    }

    return operacao(req, res);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar categoria', detalhes: error.message });
  }
};

module.exports = {
  ...crud,
  listar: async (req, res) => {
    try {
      if (req.usuario && req.usuario.tipoUsuario !== 'admin') {
        await ensureDefaultCategories(req.usuario.id);
      }
      return crud.listar(req, res);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao preparar categorias padrao', detalhes: error.message });
    }
  },
  atualizar: protegerCategoriaPadrao(crud.atualizar, 'editadas'),
  remover: protegerCategoriaPadrao(crud.remover, 'removidas')
};
