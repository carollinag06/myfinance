const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Orcamento = sequelize.define('Orcamento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isPositive(value) {
        if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
          throw new Error('O valor do orcamento deve ser maior que zero');
        }
      }
    }
  },
  mes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isMesValido(value) {
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 12) {
          throw new Error('O mes deve ser um numero inteiro entre 1 e 12');
        }
      }
    }
  },
  ano: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isAnoValido(value) {
        if (!Number.isInteger(Number(value)) || Number(value) < 1900 || Number(value) > 9999) {
          throw new Error('O ano deve ser um numero inteiro entre 1900 e 9999');
        }
      }
    }
  }
}, {
  tableName: 'orcamentos',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Orcamento;