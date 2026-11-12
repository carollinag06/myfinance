const jwt = require('jsonwebtoken');
require('dotenv').config();

const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
};

const verificarProprietario = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario nao autenticado' });
  }

  if (req.usuario.tipoUsuario === 'admin') {
    return next();
  }

  const idUsuario = parseInt(req.params.id) || parseInt(req.body.usuarioId) || parseInt(req.query.usuarioId);

  if (idUsuario && idUsuario !== req.usuario.id) {
    return res.status(403).json({ error: 'Acesso negado: voce so pode acessar seus proprios dados' });
  }

  next();
};

const verificarAdmin = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario nao autenticado' });
  }

  if (req.usuario.tipoUsuario !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado: requer privilegios de administrador' });
  }

  next();
};

module.exports = {
  autenticar,
  verificarProprietario,
  verificarAdmin
};
