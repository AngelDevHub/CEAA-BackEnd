import express from 'express';
import UsuariosController from '../../controllers/usuarios.controller.js';
import { validateToken, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkPermission('manage:users'), UsuariosController.getAll);          
router.get('/:id', validateToken, checkPermission('manage:users'), UsuariosController.getById);
router.post('/', validateToken, checkPermission('manage:users'), UsuariosController.create);
router.put('/:id', validateToken, checkPermission('manage:users'), UsuariosController.update);
router.delete('/:id', validateToken, checkPermission('manage:users'), UsuariosController.delete);
export default router;
