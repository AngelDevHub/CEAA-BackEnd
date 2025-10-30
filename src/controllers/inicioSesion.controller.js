import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../libs/jwt.js';

// NOTA: Usar 'Map' en memoria NO es seguro para producción o entornos con múltiples 
// procesos. Se usa aquí solo para demostrar la lógica del controlador.
const memoryStore = new Map();

class InicioSesionController {
    
    // =========================================================================
    // MÉTODOS AUXILIARES (CONVERTIDOS A ARROW FUNCTIONS PARA MANTENER EL CONTEXTO 'this')
    // =========================================================================

    // Limpiar entradas expiradas de la memoria
    cleanExpiredEntries = () => {
        const now = Date.now();
        for (const [key, value] of memoryStore.entries()) {
            if (value.expires <= now) {
                memoryStore.delete(key);
            }
        }
    }

    // Helper method para incrementar contadores (IP o Correo)
    incrementCounter = (key, ttlMs) => {
        this.cleanExpiredEntries();
        
        const now = Date.now();
        const item = memoryStore.get(key);
        
        if (!item || item.expires <= now) {
            // Nuevo contador
            memoryStore.set(key, {
                value: 1,
                expires: now + ttlMs
            });
            return 1;
        } else {
            // Incrementar contador existente
            const newValue = item.value + 1;
            memoryStore.set(key, {
                value: newValue,
                expires: item.expires
            });
            return newValue;
        }
    }

    // Lógica para registrar un intento fallido y potencialmente bloquear IP/Email
    registrarIntentoFallido = async (ip, correo) => {
        const ipAttemptsKey = `attempts_ip:${ip}`;
        const emailAttemptsKey = `attempts_email:${correo}`;
        
        // Incrementar intentos por IP y Email
        const ipAttempts = this.incrementCounter(ipAttemptsKey, 900000); // 15 minutos
        const emailAttempts = this.incrementCounter(emailAttemptsKey, 900000); // 15 minutos
        
        // Bloquear después de 5 intentos fallidos
        if (ipAttempts >= 5) {
            memoryStore.set(`blocked_ip:${ip}`, {
                value: 'blocked',
                expires: Date.now() + 900000 // 15 minutos
            });
        }
        if (emailAttempts >= 5) {
            memoryStore.set(`blocked_email:${correo}`, {
                value: 'blocked',
                expires: Date.now() + 1800000 // 30 minutos (más tiempo para email)
            });
        }
    }

    // Lógica para limpiar los intentos fallidos al tener éxito (FIX DEL ERROR)
    limpiarIntentosFallidos = async (ip, correo) => {
        memoryStore.delete(`attempts_ip:${ip}`);
        memoryStore.delete(`attempts_email:${correo}`);
        memoryStore.delete(`blocked_ip:${ip}`);
        memoryStore.delete(`blocked_email:${correo}`);
    }

    // =========================================================================
    // MÉTODOS DEL CONTROLADOR (EXPUESTOS EN LAS RUTAS)
    // =========================================================================

    // POST /login
    iniciarSesion = async (req, res) => {
        const { correo, clave } = req.body;

        try {
            // Validación de campos requeridos
            if (!correo || !clave) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan credenciales (correo y clave).' 
                });
            }

            // 1. Verificar bloqueo de cuenta por IP
            const ipKey = `blocked_ip:${req.ip}`;
            const isIpBlocked = memoryStore.get(ipKey);
            if (isIpBlocked && isIpBlocked.expires > Date.now()) {
                return res.status(429).json({
                    success: false,
                    message: 'Demasiados intentos. Intente nuevamente en 15 minutos.'
                });
            }

            // 2. Verificar bloqueo de cuenta por email
            const emailKey = `blocked_email:${correo}`;
            const isEmailBlocked = memoryStore.get(emailKey);
            if (isEmailBlocked && isEmailBlocked.expires > Date.now()) {
                return res.status(429).json({
                    success: false,
                    message: 'Cuenta temporalmente bloqueada por seguridad.'
                });
            }

            // 3. Buscar usuario
            const usuario = await UsuariosModel.findByEmail(correo);

            if (!usuario) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas.' 
                });
            }

            // 4. Comparar contraseña
            const isMatch = await bcrypt.compare(clave, usuario.clave);

            if (!isMatch) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas.' 
                });
            }

            // 5. Resetear contadores de intentos fallidos al éxito
            // ESTA LLAMADA AHORA FUNCIONA GRACIAS AL USO DE ARROW FUNCTIONS
            await this.limpiarIntentosFallidos(req.ip, correo);

            // 6. Generar Tokens
            const tokenPayload = {
                id_usuario: usuario.id_usuario,
                role: usuario.role, // Asumiendo que el modelo lo retorna
                nombre: usuario.nombre,
                correo: usuario.correo
            };

            const accessToken = createAccessToken(tokenPayload);
            const refreshToken = createRefreshToken(tokenPayload);

            // 7. Guardar refresh token en base de datos y memoria de sesión
            await UsuariosModel.updateRefreshToken(usuario.id_usuario, refreshToken);

            const sessionKey = `session:${usuario.id_usuario}:${Date.now()}`;
            memoryStore.set(sessionKey, {
                value: JSON.stringify({
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                }),
                expires: Date.now() + (7 * 24 * 3600000) // 7 días de sesión activa
            });

            // 8. Configurar cookies seguras
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true // Asume que cookie-parser está configurado con un secret
            };
            
            // Access token (corta duración, a veces se envía solo por body)
            res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 minutos

            // Refresh token (larga duración)
            res.cookie('refreshToken', refreshToken, { 
                ...cookieOptions, 
                maxAge: 7 * 24 * 3600000 // 7 días
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.',
                // Recomendable enviar el Access Token también en el body
                data: {
                    accessToken: accessToken, 
                    expiresIn: 15 * 60, // 15 minutos en segundos
                    id: usuario.id_usuario,
                    nombre: usuario.nombre,
                    correo: usuario.correo
                }
            });

        } catch (err) {
            console.error('Error en el inicio de sesión:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor al iniciar sesión.' 
            });
        }
    }

    // POST /api/auth/registro
    registerUser = async (req, res) => {
        const { nombre, correo, clave } = req.body;
        try {
            if (!nombre || !correo || !clave) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan datos requeridos' 
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo) || clave.length < 8) {
                 return res.status(400).json({
                    success: false,
                    message: 'Formato de correo inválido o contraseña menor a 8 caracteres.'
                });
            }

            const existingUser = await UsuariosModel.findByEmail(correo);
            if (existingUser) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Correo ya registrado' 
                });
            }

            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(clave, salt);

            const userId = await UsuariosModel.create(nombre, correo, hashedPassword);
            
            res.status(201).json({ 
                success: true, 
                message: 'Usuario creado exitosamente', 
                data: { id: userId, nombre, correo } 
            });

        } catch (err) {
            console.error('Error creando usuario:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error creando usuario' 
            });
        }
    }

    // POST /refresh-token
    refrescarToken = async (req, res) => {
        try {
            const refreshTokenCookie = req.signedCookies.refreshToken;
            
            if (!refreshTokenCookie) {
                 return res.status(401).json({
                    success: false,
                    message: 'Token de refresco requerido (o cookie no firmada).'
                });
            }
            
            // 1. Verificar el token de refresco
            const decoded = verifyRefreshToken(refreshTokenCookie);
            const userId = decoded.id_usuario;

            // 2. Buscar usuario en DB y verificar que el token coincida
            const usuario = await UsuariosModel.findByRefreshToken(userId, refreshTokenCookie);
            
            if (!usuario) {
                // Posible token robado, limpiar cookie
                res.clearCookie('accessToken');
                res.clearCookie('refreshToken');
                return res.status(401).json({
                    success: false,
                    message: 'Sesión inválida. Vuelva a iniciar sesión.'
                });
            }

            // 3. Crear nuevo Access Token
            const tokenPayload = {
                id_usuario: usuario.id_usuario,
                role: usuario.role,
                nombre: usuario.nombre,
                correo: usuario.correo
            };

            const newAccessToken = createAccessToken(tokenPayload);

            // 4. Actualizar cookie de Access Token
            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true,
                maxAge: 15 * 60 * 1000 // 15 minutos
            });

            return res.status(200).json({
                success: true,
                message: 'Access Token renovado.',
                data: {
                    accessToken: newAccessToken,
                    expiresIn: 15 * 60
                }
            });

        } catch (error) {
            console.error('Error refrescando token:', error);
            // Limpiar cookies si el token expiró o es inválido
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({
                success: false,
                message: 'Token de refresco expirado o inválido.'
            });
        }
    }

    // POST /logout
    cerrarSesion = async (req, res) => {
        try {
            // ID obtenido del Access Token que pasa por el middleware validateToken
            const userId = req.user.id_usuario; 
            
            // Eliminar refresh token de la base de datos
            await UsuariosModel.updateRefreshToken(userId, null);
            
            // Eliminar sesiones activas de la memoria
            const sessionPattern = `session:${userId}:`;
            for (const [key, value] of memoryStore.entries()) {
                if (key.startsWith(sessionPattern)) {
                    memoryStore.delete(key);
                }
            }

            // Limpiar cookies (importante que coincidan las opciones para limpiar)
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true
            };

            res.clearCookie('accessToken', cookieOptions);
            res.clearCookie('refreshToken', cookieOptions);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Sesión cerrada exitosamente.' 
            });

        } catch (err) {
            console.error('Error al cerrar la sesión:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor al cerrar la sesión.' 
            });
        }
    }

    // GET /perfil
    getPerfil = async (req, res) => {
        try {
            // ID viene del middleware de validación del Access Token
            const { id_usuario } = req.user;

            const usuario = await UsuariosModel.findById(id_usuario);

            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado.' 
                });
            }

            // Remover información sensible antes de enviar
            const { clave, refresh_token, ...userSafe } = usuario;

            return res.status(200).json({
                success: true,
                data: userSafe
            });
        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno al obtener el perfil del usuario.'
            });
        }
    }

    // PUT /perfil
    updatePerfil = async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario; 
            const { nombre, correo, clave_actual, nueva_clave } = req.body;
            
            // Obtener datos actuales del usuario para validación
            const userCurrent = await UsuariosModel.findById(id_usuario);
            if (!userCurrent) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            if (!nombre && !correo && !nueva_clave) {
                return res.status(400).json({
                    success: false,
                    message: 'Debes enviar al menos un campo para actualizar.'
                });
            }

            // Lógica de cambio de nombre/correo
            if (nombre || correo) {
                 if (correo && userCurrent.correo !== correo) {
                    const existingUser = await UsuariosModel.findByEmail(correo);
                    if (existingUser && existingUser.id_usuario !== id_usuario) {
                         return res.status(409).json({ success: false, message: 'El nuevo correo ya está en uso.' });
                    }
                }
                await UsuariosModel.updateProfile(id_usuario, nombre, correo);
            }

            // Lógica de cambio de contraseña
            if (nueva_clave) {
                if (!clave_actual) {
                    return res.status(400).json({ message: 'Debes enviar tu contraseña actual para cambiarla.' });
                }
                
                const coincide = await bcrypt.compare(clave_actual, userCurrent.clave);
                if (!coincide) {
                     // NO usar this.registrarIntentoFallido aquí, pues la IP ya está autenticada
                     return res.status(401).json({ message: 'La contraseña actual no es correcta.' });
                }

                if (nueva_clave.length < 8) {
                    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
                }

                const nuevaClaveHash = await bcrypt.hash(nueva_clave, 12);
                await UsuariosModel.updatePassword(id_usuario, nuevaClaveHash);
                
                // Cerrar todas las sesiones al cambiar contraseña por seguridad
                const sessionPattern = `session:${id_usuario}:`;
                for (const [key, value] of memoryStore.entries()) {
                    if (key.startsWith(sessionPattern)) {
                        memoryStore.delete(key);
                    }
                }
                await UsuariosModel.updateRefreshToken(id_usuario, null); // Forzar re-login
            }

            return res.status(200).json({
                success: true,
                message: 'Perfil actualizado correctamente.'
            });

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno al actualizar el perfil del usuario.'
            });
        }
    }
}


export default new InicioSesionController();