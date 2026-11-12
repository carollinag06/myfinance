// Define o armazenamento temporário dos tokens de recuperação.
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  usuarioId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'usuario_id',
    references: { model: 'usuarios', key: 'id' },
    onDelete: 'CASCADE'
  },
  tokenHash: {
    type: DataTypes.CHAR(64),
    allowNull: false,
    field: 'token_hash'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  solicitadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'solicitado_em'
  }
}, {
  tableName: 'password_reset_tokens',
  freezeTableName: true,
  timestamps: false,
  underscored: true
});

module.exports = PasswordResetToken;
