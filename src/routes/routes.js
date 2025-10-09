import express from 'express';

import { inicioSesion } from './modules/routesLogin.js'
import{ routesUsuario } from './modules/routesUsuario.js';

const router = express.Router();

router.use(inicioSesion);
router.use(routesUsuario);

export default router;