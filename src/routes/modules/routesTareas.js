import express from 'express';
import TareasController from '../../controllers/tareas.controller.js';
import { validateToken, checkAnyPermission, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkAnyPermission(['view:field', 'create:log', 'manage:users']), TareasController.list);
router.post('/', validateToken, checkPermission('manage:users'), TareasController.create);
router.patch('/:id/estado', validateToken, checkAnyPermission(['view:field', 'create:log', 'manage:users']), TareasController.updateEstado);

export default router;

