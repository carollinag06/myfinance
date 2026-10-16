const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transacao = sequelize.define('Transacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descricao: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isPositive(value) {
        if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
          throw new Error('O valor da transacao deve ser maior que zero');
        }
      }
    }
  },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['receita', 'despesa']]
    }
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDataISOValida(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error('A data deve usar o formato AAAA-MM-DD');
        }

        const data = new Date(value + 'T00:00:00.000Z');
        if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== value) {
          throw new Error('A data informada nao e valida');
        }
      }
    }
  }
}, {
  tableName: 'transacoes',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Transacao;