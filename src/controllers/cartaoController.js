const { Cartao, Usuario, Transacao, Fatura } = require('../models');
const createCrudController = require('./crudController');

module.exports = createCrudController({
  model: Cartao,
  resourceName: 'cartao',
  fields: ['nome', 'numero', 'limite', 'vencimento', 'usuarioId'],
  include: [
    { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
    { model: Transacao, as: 'transacoes' },
    { model: Fatura, as: 'faturas' }
  ]
});