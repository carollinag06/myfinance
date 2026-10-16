const { Transacao, Usuario, Categoria, Cartao } = require('../models');
const createCrudController = require('./crudController');

module.exports = createCrudController({
  model: Transacao,
  resourceName: 'transacao',
  fields: ['descricao', 'valor', 'tipo', 'data', 'usuarioId', 'categoriaId', 'cartaoId'],
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