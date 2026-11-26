const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();
const Usuario = require('../models/Usuario');
const { gerarHash, compararSenha } = require('../hash');
const { sequelize } = require('../models');
const { ensureDefaultCategories } = require('../services/defaultCategories');
const codigoLogin = require('../services/codigoLogin');
const googleClient = new OAuth2Client();

const normalizarEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';
const emailValido = (email) => email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const buscarPorEmail = (email) => Usuario.findOne({
  where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
});

const dadosPublicos = (usuario) => {
  const { senha, googleSub, ...dados } = usuario.toJSON();
  return dados;
};

const criarUsuario = async (req, res) => {
  try {
    const body = req.body || {};
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = normalizarEmail(body.email);
    const senha = body.senha;
    const foto = req.file ? req.file.filename : null;

    if (!nome || nome.length > 100) {
      return res.status(400).json({ error: 'Informe um nome com até 100 caracteres.' });
    }
    if (!emailValido(email)) {
      return res.status(400).json({ error: 'Informe um endereço de e-mail válido com até 150 caracteres.' });
    }
    if (typeof senha !== 'string' || senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres e não pode exceder 72 bytes.' });
    }

    if (await buscarPorEmail(email)) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const senhaComHash = await gerarHash(senha);

    const novoUsuario = await sequelize.transaction(async (transaction) => {
      const usuario = await Usuario.create({
        nome,
        email,
        senha: senhaComHash,
        tipoUsuario: 'usuario',
        foto
      }, { transaction });
      await ensureDefaultCategories(usuario.id, transaction);
      return usuario;
    });

    return res.status(201).json(dadosPublicos(novoUsuario));
  } catch (error) {
    console.error('Falha ao criar usuário:', error.name, error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Confira os dados informados.' });
    }
    return res.status(500).json({ error: 'Não foi possível criar a conta agora.' });
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['senha', 'googleSub'] }
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
      attributes: { exclude: ['senha', 'googleSub'] }
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
    const body = req.body || {};
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'senha')) {
      return res.status(400).json({ error: 'Use a opção de troca de senha, informando sua senha atual.' });
    }

    const dadosAtualizacao = {};
    if (body.nome !== undefined) {
      if (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.trim().length > 100) {
        return res.status(400).json({ error: 'Informe um nome com até 100 caracteres.' });
      }
      dadosAtualizacao.nome = body.nome.trim();
    }

    if (body.email !== undefined) {
      const email = normalizarEmail(body.email);
      if (!emailValido(email)) {
        return res.status(400).json({ error: 'Informe um endereço de e-mail válido com até 150 caracteres.' });
      }
      const emailEmUso = await buscarPorEmail(email);
      if (emailEmUso && String(emailEmUso.id) !== String(usuario.id)) {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      }
      dadosAtualizacao.email = email;
    }

    if (req.file) dadosAtualizacao.foto = req.file.filename;

    if (body.tipoUsuario !== undefined) {
      if (req.usuario.tipoUsuario !== 'admin') {
        return res.status(403).json({ error: 'Somente administradores podem alterar o tipo de conta.' });
      }
      if (!['usuario', 'admin'].includes(body.tipoUsuario)) {
        return res.status(400).json({ error: 'Tipo de conta inválido.' });
      }
      dadosAtualizacao.tipoUsuario = body.tipoUsuario;
    }

    const fotoAntiga = usuario.foto;
    await usuario.update(dadosAtualizacao);

    if (req.file && fotoAntiga && path.basename(fotoAntiga) === fotoAntiga) {
      void fs.unlink(path.join(__dirname, '../../uploads', fotoAntiga)).catch(() => {});
    }

    return res.status(200).json(dadosPublicos(usuario));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Confira os dados informados.' });
    }
    console.error('Falha ao atualizar usuário:', error.name, error.message);
    return res.status(500).json({ error: 'Não foi possível atualizar o perfil agora.' });
  }
};

const alterarSenha = async (req, res) => {
  try {
    const { id } = req.params;
    const { senhaAtual, novaSenha } = req.body || {};

    if (String(req.usuario.id) !== String(id)) {
      return res.status(403).json({ error: 'Você só pode alterar sua própria senha.' });
    }
    if (typeof senhaAtual !== 'string' || !senhaAtual || typeof novaSenha !== 'string') {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
    }
    if (novaSenha.length < 8 || Buffer.byteLength(novaSenha, 'utf8') > 72) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres e não pode exceder 72 bytes.' });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (!(await compararSenha(senhaAtual, usuario.senha))) {
      return res.status(400).json({ error: 'A senha atual está incorreta.' });
    }
    if (await compararSenha(novaSenha, usuario.senha)) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
    }

    usuario.senha = await gerarHash(novaSenha);
    await usuario.save();
    return res.status(200).json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Falha ao alterar senha:', error.name, error.message);
    return res.status(500).json({ error: 'Não foi possível alterar a senha agora.' });
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
    const body = req.body || {};
    const email = normalizarEmail(body.email);
    const senha = body.senha;
    if (!email || typeof senha !== 'string' || !senha) {
      return res.status(400).json({ error: 'Informe seu e-mail e sua senha.' });
    }
    if (!emailValido(email)) return res.status(400).json({ error: 'Confira o formato do e-mail.' });

    const usuario = await buscarPorEmail(email);
    if (!usuario || !(await compararSenha(senha, usuario.senha))) {
      return res.status(401).json({ error: 'Email ou senha invalidos' });
    }

    // Segunda etapa: o código vai para o e-mail salvo no banco, nunca para um e-mail vindo do cliente.
    if (!codigoLogin.smtpConfigurado()) {
      return res.status(503).json({ error: 'Envio de e-mail não configurado no servidor.' });
    }
    try {
      const { desafioId, expiraEm } = await codigoLogin.iniciar(usuario);
      return res.status(202).json({ codigoNecessario: true, desafioId, expiraEm });
    } catch (error) {
      console.error('Falha ao enviar código de login:', error.name);
      return res.status(503).json({ error: 'Não foi possível enviar o código agora. Tente novamente.' });
    }
  } catch (error) {
    console.error('Falha ao realizar login:', error.name, error.message);
    return res.status(500).json({ error: 'Erro ao realizar login', detalhes: error.message });
  }
};

const emitirSessao = async (usuario) => {
  await ensureDefaultCategories(usuario.id);
  const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email, tipoUsuario: usuario.tipoUsuario };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  return { usuario: dadosPublicos(usuario), token };
};

const verificarCodigoLogin = async (req, res) => {
  try {
    const { desafioId, codigo } = req.body || {};
    if (typeof desafioId !== 'string' || typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
      return res.status(400).json({ error: 'Informe o código de 6 dígitos.' });
    }
    const resultado = codigoLogin.verificar(desafioId, codigo);
    if (!resultado.ok) {
      const corpo = { error: resultado.error };
      if (resultado.tentativasRestantes !== undefined) corpo.tentativasRestantes = resultado.tentativasRestantes;
      return res.status(resultado.status).json(corpo);
    }
    const usuario = await Usuario.findByPk(resultado.usuarioId);
    if (!usuario) return res.status(401).json({ error: 'Conta não encontrada. Entre novamente.' });
    return res.status(200).json(await emitirSessao(usuario));
  } catch (error) {
    console.error('Falha ao verificar código de login:', error.name);
    return res.status(500).json({ error: 'Não foi possível concluir o login agora.' });
  }
};

const reenviarCodigoLogin = async (req, res) => {
  try {
    const resultado = await codigoLogin.reenviar((req.body || {}).desafioId);
    if (!resultado.ok) return res.status(resultado.status).json({ error: resultado.error });
    return res.status(200).json({ mensagem: 'Enviamos um novo código.', expiraEm: resultado.expiraEm });
  } catch (error) {
    console.error('Falha ao reenviar código de login:', error.name);
    return res.status(503).json({ error: 'Não foi possível enviar o código agora. Tente novamente.' });
  }
};

// Aceita só a URL de foto do próprio Google (https em *.googleusercontent.com) e que caiba na coluna.
const fotoGoogleValida = (url) => {
  if (typeof url !== 'string' || url.length > 255) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.googleusercontent.com') ? url : null;
  } catch {
    return null;
  }
};

const loginGoogle = async (req, res) => {
  const clientIds = (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (!clientIds.length) return res.status(503).json({ error: 'Login Google não configurado no servidor.' });
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken || idToken.length > 8192) {
    return res.status(400).json({ error: 'Token Google inválido.' });
  }

  try {
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({ idToken, audience: clientIds });
    } catch {
      return res.status(401).json({ error: 'Token Google inválido ou expirado.' });
    }
    const profile = ticket.getPayload();
    const email = normalizarEmail(profile?.email);
    if (!profile?.sub || profile.email_verified !== true || !emailValido(email)) {
      return res.status(401).json({ error: 'Conta Google sem e-mail verificado.' });
    }

    let usuario = await Usuario.findOne({ where: { googleSub: profile.sub } });
    if (!usuario) {
      const existing = await buscarPorEmail(email);
      if (existing) return res.status(409).json({ error: 'Este e-mail já tem uma conta. Entre com sua senha.' });
      const nome = (typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : email.split('@')[0]).slice(0, 100);
      usuario = await sequelize.transaction(async (transaction) => {
        const created = await Usuario.create({
          nome,
          email,
          senha: await gerarHash(crypto.randomBytes(32).toString('hex')),
          googleSub: profile.sub,
          tipoUsuario: 'usuario',
          foto: fotoGoogleValida(profile.picture)
        }, { transaction });
        await ensureDefaultCategories(created.id, transaction);
        return created;
      });
    } else if (!usuario.foto) {
      // Sem foto enviada pelo usuário: usa a do Google. Uma foto enviada nunca é substituída.
      const fotoGoogle = fotoGoogleValida(profile.picture);
      if (fotoGoogle) await usuario.update({ foto: fotoGoogle });
    }

    const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipoUsuario: usuario.tipoUsuario }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    return res.status(200).json({ usuario: dadosPublicos(usuario), token });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Conta já cadastrada. Tente entrar novamente.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ error: 'Dados da conta Google inválidos.' });
    console.error('Falha no login Google:', error.name, error.message);
    return res.status(503).json({ error: 'Não foi possível verificar o login Google agora.' });
  }
};

module.exports = {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  alterarSenha,
  deletarUsuario,
  login,
  verificarCodigoLogin,
  reenviarCodigoLogin,
  loginGoogle
};
