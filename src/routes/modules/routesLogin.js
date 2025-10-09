import express from 'express';
import inicioSesionController from '../../controllers/inicioSesion.controller.js';
import { validateToken } from '../../middlewares/validateToken.js';

const router = express.Router();

router.post('/login', inicioSesionController.iniciarSesion);
router.post('/logout', inicioSesionController.cerrarSesion);
router.get('/perfil', validateToken, inicioSesionController.getPerfil);
router.put('/perfil', validateToken, inicioSesionController.updatePerfil);

export { router as inicioSesion };
