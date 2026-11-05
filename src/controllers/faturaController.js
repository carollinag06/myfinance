const { Fatura, Usuario, Cartao } = require('../models');
const createCrudController = require('./crudController');

module.exports = createCrudController({
  model: Fatura,
  resourceName: 'fatura',
  fields: ['valor', 'vencimento', 'paga', 'usuarioId', 'cartaoId'],
  ownershipRelations: [
    { field: 'cartaoId', model: Cartao }
  ],
  include: [
    { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
    { model: Cartao, as: 'cartao' }
  ]
});