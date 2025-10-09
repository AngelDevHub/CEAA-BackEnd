import express from 'express';
import UsuariosController from '../../controllers/usuarios.controller.js';
import { validateToken } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/usuarios', validateToken, UsuariosController.getAll);
router.get('/usuario/:id', validateToken, UsuariosController.getById);
router.post('/usuario', validateToken, UsuariosController.create);
router.put('/usuario/:id', validateToken, UsuariosController.update);
router.delete('/usuario/:id', validateToken, UsuariosController.delete);

// Export named para que coincida con tu import
export { router as routesUsuario };
