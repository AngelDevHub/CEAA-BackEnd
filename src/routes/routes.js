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

// 🧪 Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente' 
    });
});

export default router;
