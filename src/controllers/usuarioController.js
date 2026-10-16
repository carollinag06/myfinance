const jwt = require('jsonwebtoken');
require('dotenv').config();
const Usuario = require('../models/Usuario');
const { gerarHash, compararSenha } = require('../hash');

const dadosPublicos = (usuario) => {
  const { senha, ...dados } = usuario.toJSON();
  return dados;
};

const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const foto = req.file ? req.file.filename : null;

    const senhaComHash = await gerarHash(senha);

    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha: senhaComHash,
      tipoUsuario: 'usuario',
      foto
    });

    const { senha: _, ...usuarioSemSenha } = novoUsuario.toJSON();
    return res.status(201).json(usuarioSemSenha);
  } catch (error) {
    console.error('Falha ao criar usuário:', error.name, error.message);
    return res.status(500).json({ error: 'Erro ao criar usuário', detalhes: error.message });
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['senha'] }
    });
    return res.status(200).json(usuarios);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar usuários', detalhes: error.message });
  }
};

const buscarUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['senha'] }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json(usuario);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuário', detalhes: error.message });
  }
};

const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, tipoUsuario } = req.body;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const foto = req.file ? req.file.filename : usuario.foto;
    const dadosAtualizacao = { nome, email, foto };

    if (req.usuario.tipoUsuario === 'admin' && tipoUsuario !== undefined) {
      dadosAtualizacao.tipoUsuario = tipoUsuario;
    }

    if (senha) {
      dadosAtualizacao.senha = await gerarHash(senha);
    }

    await usuario.update(dadosAtualizacao);

    return res.status(200).json({ mensagem: 'Usuário atualizado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário', detalhes: error.message });
  }
};

const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await usuario.destroy();
    return res.status(200).json({ mensagem: 'Usuário removido com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar usuário', detalhes: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario || !(await compararSenha(senha, usuario.senha))) {
      return res.status(401).json({ error: 'Email ou senha invalidos' });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipoUsuario: usuario.tipoUsuario
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return res.status(200).json({ usuario: dadosPublicos(usuario), token });
  } catch (error) {
    console.error('Falha ao realizar login:', error.name, error.message);
    return res.status(500).json({ error: 'Erro ao realizar login', detalhes: error.message });
  }
};

module.exports = {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  deletarUsuario,
  login
};