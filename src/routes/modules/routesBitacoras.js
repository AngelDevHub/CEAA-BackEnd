import express from 'express';
import BitacorasController from '../../controllers/bitacoras.controller.js';
import { validateToken, checkAnyPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkAnyPermission(['create:log', 'manage:users']), BitacorasController.list);
router.post('/', validateToken, checkAnyPermission(['create:log', 'manage:users']), BitacorasController.create);

export default router;

