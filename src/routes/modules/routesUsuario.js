import express from 'express';
import UsuariosController from '../../controllers/usuarios.controller.js';
import { validateToken } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, UsuariosController.getAll);          
router.get('/:id', validateToken, UsuariosController.getById);
router.post('/', validateToken, UsuariosController.create);
router.put('/:id', validateToken, UsuariosController.update);
router.delete('/:id', validateToken, UsuariosController.delete);
export default router;