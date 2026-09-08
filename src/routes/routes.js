import express from 'express';
import inicioSesion from './modules/routesLogin.js';
import routesUsuario from './modules/routesUsuario.js';
import routesInvernadero from './modules/routesSensor.js';
import routesTareas from './modules/routesTareas.js';
import routesBitacoras from './modules/routesBitacoras.js';
import routesDispositivos from './modules/routesDispositivos.js';
import routesActividad from './modules/routesActividad.js';
import routesRbac from './modules/routesRbac.js';
import routesConfig from './modules/routesConfig.js';
import routesReportes from './modules/routesReportes.js';
import { validateToken } from '../middlewares/validateToken.js';

const router = express.Router();

// 🔐 Rutas de autenticación
router.use('/auth', inicioSesion);

// 👤 Rutas de usuarios
router.use('/usuarios', routesUsuario);

// 🌱 Rutas del invernadero (Firebase Realtime Database)
router.use('/invernadero', routesInvernadero);

// ✅ Tareas (huerto)
router.use('/tareas', routesTareas);

// ✅ Bitácora de campo
router.use('/bitacoras', routesBitacoras);

// ✅ Dispositivos (mantenimiento/estado)
router.use('/dispositivos', routesDispositivos);

// ✅ Actividad (auditoría)
router.use('/actividad', routesActividad);

// ✅ RBAC (roles/permisos)
router.use('/rbac', routesRbac);

// ✅ Configuración (umbrales / sistema)
router.use('/config', routesConfig);

// ✅ Reportes (diario / semanal)
router.use('/reportes', routesReportes);

// 🧪 Ruta de prueba
router.get('/test', validateToken, (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente' 
    });
});

export default router;
