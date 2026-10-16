const { Router } = require('express');
const upload = require('../config/multer');
const { autenticar, verificarAdmin, verificarProprietario } = require('../middleware/auth');
const {
  criarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  deletarUsuario,
  login
} = require('../controllers/usuarioController');

const router = Router();

router.post('/', upload.single('foto'), criarUsuario);
router.post('/login', login);

router.use(autenticar);

router.get('/', verificarAdmin, listarUsuarios);
router.get('/:id', verificarProprietario, buscarUsuarioPorId);
router.put('/:id', verificarProprietario, upload.single('foto'), atualizarUsuario);
router.delete('/:id', verificarProprietario, deletarUsuario);

module.exports = router;
