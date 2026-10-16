const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descricao: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'categorias',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Categoria;
