import express from 'express';
import ReportesController from '../../controllers/reportes.controller.js';
import ReportesPdfController from '../../controllers/reportesPdf.controller.js';
import { validateToken, checkAnyPermission } from '../../middlewares/validateToken.js';

const router = express.Router();

router.get('/diario', validateToken, checkAnyPermission(['view:field', 'manage:users']), ReportesController.diario);
router.get('/semanal', validateToken, checkAnyPermission(['view:field', 'manage:users']), ReportesController.semanal);
router.get('/diario/pdf', validateToken, checkAnyPermission(['view:field', 'manage:users']), ReportesPdfController.diario);
router.get('/semanal/pdf', validateToken, checkAnyPermission(['view:field', 'manage:users']), ReportesPdfController.semanal);

export default router;


