const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const controller = require('../controllers/orcamentoController');

const router = Router();

router.use(autenticar);

router.get('/', controller.listar);
router.get('/:id', controller.buscar);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

module.exports = router;
