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
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'previsto',
    validate: { isIn: [['previsto', 'realizado']] }
  },
  formaPagamento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'forma_pagamento',
    validate: { isIn: [['a_vista', 'cartao']] }
  },
  grupoParcelamento: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'grupo_parcelamento'
  },
  numeroParcela: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'numero_parcela',
    validate: { min: 1 }
  },
  totalParcelas: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_parcelas',
    validate: { min: 2, max: 48 }
  }
}, {
  hooks: {
    beforeValidate(instance) {
      if (instance.tipo === 'receita') { instance.formaPagamento = null; instance.cartaoId = null; }
      else if (instance.tipo === 'despesa' && instance.formaPagamento == null) {
        instance.formaPagamento = instance.cartaoId != null ? 'cartao' : 'a_vista';
      }
    }
  },
  validate: {
    pagamentoCompativel() {
      if (this.tipo !== 'despesa') return;
      if (this.formaPagamento === 'a_vista' && this.cartaoId != null) throw new Error('Despesas à vista não devem ter cartão associado.');
    },
    realizadoSemDataFutura() {
      const hoje = new Date();
      const hojeISO = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
      if (this.status === 'realizado' && this.data > hojeISO) {
        throw new Error('Um lançamento futuro deve ficar previsto. Para antecipar, use a data do pagamento ou recebimento.');
      }
    }
  },
  tableName: 'transacoes',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Transacao;
