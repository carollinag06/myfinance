const { Categoria, Usuario, Transacao, Orcamento } = require('../models');
const createCrudController = require('./crudController');

module.exports = createCrudController({
  model: Categoria,
  resourceName: 'categoria',
  fields: ['nome', 'descricao', 'usuarioId'],
  include: [
    { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
    { model: Transacao, as: 'transacoes' },
    { model: Orcamento, as: 'orcamentos' }
  ]
});