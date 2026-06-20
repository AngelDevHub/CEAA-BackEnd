import express from 'express';
import inicioSesionController from '../../controllers/inicioSesion.controller.js';
import { validateToken } from '../../middlewares/validateToken.js';
import { validateLogin, validateRegister } from '../../middlewares/sanitizeMiddleware.js';

const router = express.Router();

router.post('/login', validateLogin, inicioSesionController.iniciarSesion);
router.post('/logout', validateToken, inicioSesionController.cerrarSesion);
router.post('/registro', validateRegister, inicioSesionController.registerUser);
router.get('/perfil', validateToken, inicioSesionController.getPerfil);
router.put('/perfil', validateToken, inicioSesionController.updatePerfil);
router.post('/refresh-token', inicioSesionController.refrescarToken);

export default router;
