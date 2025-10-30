import express from 'express';
import inicioSesion from './modules/routesLogin.js';
import routesUsuario  from './modules/routesUsuario.js';

const router = express.Router();

// ✅ RUTAS ORGANIZADAS CON PREFIJOS
router.use('/auth', inicioSesion);     // Todas las rutas empiezan con /api/auth
router.use('/usuarios', routesUsuario); // Todas las rutas empiezan con /api/usuarios

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente' 
    });
});

export default router;