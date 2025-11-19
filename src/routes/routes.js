import express from 'express';
import inicioSesion from './modules/routesLogin.js';
import routesUsuario from './modules/routesUsuario.js';
import routesInvernadero from './modules/routesSensor.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', inicioSesion);

// Rutas de usuarios
router.use('/usuarios', routesUsuario);

// Rutas del invernadero (Firebase Realtime Database)
router.use('/invernadero', routesInvernadero);

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente' 
    });
});

export default router;
