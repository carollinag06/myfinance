const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Cartao = require('./Cartao');
const Transacao = require('./Transacao');
const Orcamento = require('./Orcamento');
const Fatura = require('./Fatura');

Categoria.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Usuario.hasMany(Categoria, {
  foreignKey: 'usuarioId',
  as: 'categorias'
});

Cartao.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Usuario.hasMany(Cartao, {
  foreignKey: 'usuarioId',
  as: 'cartoes'
});

Transacao.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Usuario.hasMany(Transacao, {
  foreignKey: 'usuarioId',
  as: 'transacoes'
});

Transacao.belongsTo(Categoria, {
  foreignKey: 'categoriaId',
  as: 'categoria',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Categoria.hasMany(Transacao, {
  foreignKey: 'categoriaId',
  as: 'transacoes'
});

Transacao.belongsTo(Cartao, {
  foreignKey: 'cartaoId',
  as: 'cartao',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Cartao.hasMany(Transacao, {
  foreignKey: 'cartaoId',
  as: 'transacoes'
});

Orcamento.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Usuario.hasMany(Orcamento, {
  foreignKey: 'usuarioId',
  as: 'orcamentos'
});

Orcamento.belongsTo(Categoria, {
  foreignKey: 'categoriaId',
  as: 'categoria',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Categoria.hasMany(Orcamento, {
  foreignKey: 'categoriaId',
  as: 'orcamentos'
});

Fatura.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Usuario.hasMany(Fatura, {
  foreignKey: 'usuarioId',
  as: 'faturas'
});

Fatura.belongsTo(Cartao, {
  foreignKey: 'cartaoId',
  as: 'cartao',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Cartao.hasMany(Fatura, {
  foreignKey: 'cartaoId',
  as: 'faturas'
});

module.exports = {
  sequelize,
  Usuario,
  Categoria,
  Cartao,
  Transacao,
  Orcamento,
  Fatura
};
