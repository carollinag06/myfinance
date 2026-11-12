const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fatura = sequelize.define('Fatura', {
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
          throw new Error('O valor da fatura deve ser maior que zero');
        }
      }
    }
  },
  vencimento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDataISOValida(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('O vencimento deve usar o formato AAAA-MM-DD');
        }

        const data = new Date(value + 'T00:00:00.000Z');
        if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== value) {
          throw new Error('A data de vencimento informada nao e valida');
        }
      }
    }
  },
  paga: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'faturas',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Fatura;