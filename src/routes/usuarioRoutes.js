const { Router } = require('express');
const fotoUpload = require('../middleware/fotoUpload');
const { autenticar, verificarAdmin, verificarProprietario } = require('../middleware/auth');
const {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  alterarSenha,
  deletarUsuario,
  login,
  loginGoogle
} = require('../controllers/usuarioController');

const router = Router();

router.post('/', fotoUpload, criarUsuario);
router.post('/login', login);
router.post('/google', loginGoogle);

router.use(autenticar);

router.get('/', verificarAdmin, listarUsuarios);
router.put('/:id/senha', verificarProprietario, alterarSenha);
router.get('/:id', verificarProprietario, buscarUsuarioPorId);
router.put('/:id', verificarProprietario, fotoUpload, atualizarUsuario);
router.delete('/:id', verificarProprietario, deletarUsuario);

module.exports = router;
