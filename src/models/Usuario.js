const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  senha: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  googleSub: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    field: 'google_sub'
  },
  tipoUsuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'tipo_usuario',
    validate: {
      isIn: [['usuario', 'admin']]
    }
  },
  foto: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  freezeTableName: true,
  timestamps: true,
  underscored: true
});

module.exports = Usuario;
