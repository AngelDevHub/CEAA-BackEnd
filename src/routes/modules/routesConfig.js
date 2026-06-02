import express from 'express';
import ConfigController from '../../controllers/config.controller.js';
import { validateToken, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/', validateToken, checkPermission('manage:users'), ConfigController.list);
router.put('/:key', validateToken, checkPermission('manage:users'), ConfigController.upsert);

export default router;

