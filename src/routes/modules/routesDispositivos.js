import express from 'express';
import DispositivosController from '../../controllers/dispositivos.controller.js';
import { validateToken, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkPermission('manage:users'), DispositivosController.list);
router.put('/:clave/estado', validateToken, checkPermission('manage:users'), DispositivosController.upsert);

export default router;

