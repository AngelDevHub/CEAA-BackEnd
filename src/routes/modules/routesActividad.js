import express from 'express';
import ActividadController from '../../controllers/actividad.controller.js';
import { validateToken, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkPermission('manage:users'), ActividadController.list);

export default router;

