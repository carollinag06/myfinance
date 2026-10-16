const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cartao = sequelize.define('Cartao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  numero: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  limite: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      isNonNegative(value) {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          throw new Error('O limite do cartao nao pode ser negativo');
        }
      }
    }
  },
  vencimento: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isDiaValido(value) {
        if (value !== null && value !== undefined &&
            (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 31)) {
          throw new Error('O dia de vencimento deve ser um numero inteiro entre 1 e 31');
        }
      }
    }
  }
}, {
  tableName: 'cartoes',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Cartao;