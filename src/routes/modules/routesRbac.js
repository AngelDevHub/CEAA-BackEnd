import express from 'express';
import RbacController from '../../controllers/rbac.controller.js';
import { validateToken, checkPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/bootstrap', validateToken, checkPermission('manage:users'), RbacController.bootstrap);
router.get('/users/:id', validateToken, checkPermission('manage:users'), RbacController.getUser);
router.put('/users/:id/roles', validateToken, checkPermission('manage:users'), RbacController.setUserRoles);
router.put('/users/:id/permissions', validateToken, checkPermission('manage:users'), RbacController.setUserDirectPermissions);

export default router;

