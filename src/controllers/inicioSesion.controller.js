import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../libs/jwt.js';

// NOTA: Usar 'Map' en memoria NO es seguro para producción o entornos con múltiples 
// procesos. Se usa aquí solo para demostrar la lógica del controlador.
const memoryStore = new Map();

class InicioSesionController {

    cleanExpiredEntries = () => {
        const now = Date.now();
        for (const [key, value] of memoryStore.entries()) {
            if (value.expires <= now) {
                memoryStore.delete(key);
            }
        }
    }

    incrementCounter = (key, ttlMs) => {
        this.cleanExpiredEntries();
        
        const now = Date.now();
        const item = memoryStore.get(key);
        
        if (!item || item.expires <= now) {
            memoryStore.set(key, {
                value: 1,
                expires: now + ttlMs
            });
            return 1;
        } else {
            const newValue = item.value + 1;
            memoryStore.set(key, {
                value: newValue,
                expires: item.expires
            });
            return newValue;
        }
    }

    registrarIntentoFallido = async (ip, correo) => {
        const ipAttemptsKey = `attempts_ip:${ip}`;
        const emailAttemptsKey = `attempts_email:${correo}`;

        const ipAttempts = this.incrementCounter(ipAttemptsKey, 900000);
        const emailAttempts = this.incrementCounter(emailAttemptsKey, 900000);

        if (ipAttempts >= 5) {
            memoryStore.set(`blocked_ip:${ip}`, {
                value: 'blocked',
                expires: Date.now() + 900000
            });
        }
        if (emailAttempts >= 5) {
            memoryStore.set(`blocked_email:${correo}`, {
                value: 'blocked',
                expires: Date.now() + 1800000
            });
        }
    }

    limpiarIntentosFallidos = async (ip, correo) => {
        memoryStore.delete(`attempts_ip:${ip}`);
        memoryStore.delete(`attempts_email:${correo}`);
        memoryStore.delete(`blocked_ip:${ip}`);
        memoryStore.delete(`blocked_email:${correo}`);
    }

    iniciarSesion = async (req, res) => {
        const { correo, clave } = req.body;

        try {
            if (!correo || !clave) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan credenciales (correo y clave).' 
                });
            }

            const ipKey = `blocked_ip:${req.ip}`;
            const isIpBlocked = memoryStore.get(ipKey);
            if (isIpBlocked && isIpBlocked.expires > Date.now()) {
                return res.status(429).json({
                    success: false,
                    message: 'Demasiados intentos. Intente nuevamente en 15 minutos.'
                });
            }

            const emailKey = `blocked_email:${correo}`;
            const isEmailBlocked = memoryStore.get(emailKey);
            if (isEmailBlocked && isEmailBlocked.expires > Date.now()) {
                return res.status(429).json({
                    success: false,
                    message: 'Cuenta temporalmente bloqueada por seguridad.'
                });
            }

            const usuario = await UsuariosModel.findByEmail(correo);

            if (!usuario) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas.' 
                });
            }

            const isMatch = await bcrypt.compare(clave, usuario.clave);

            if (!isMatch) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas.' 
                });
            }

            await this.limpiarIntentosFallidos(req.ip, correo);

            const tokenPayload = {
                id_usuario: usuario.id_usuario,
                role: usuario.role,
                nombre: usuario.nombre,
                correo: usuario.correo
            };

            const accessToken = createAccessToken(tokenPayload);
            const refreshToken = createRefreshToken(tokenPayload);

            await UsuariosModel.updateRefreshToken(usuario.id_usuario, refreshToken);

            const sessionKey = `session:${usuario.id_usuario}:${Date.now()}`;
            memoryStore.set(sessionKey, {
                value: JSON.stringify({
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                }),
                expires: Date.now() + (7 * 24 * 3600000)
            });
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true
            };

            res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

            res.cookie('refreshToken', refreshToken, { 
                ...cookieOptions, 
                maxAge: 7 * 24 * 3600000 
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.',
                data: {
                    accessToken: accessToken, 
                    expiresIn: 15 * 60,
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

    refrescarToken = async (req, res) => {
        try {
            const refreshTokenCookie = req.signedCookies.refreshToken;
            
            if (!refreshTokenCookie) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de refresco requerido (o cookie no firmada).'
                });
            }

            const decoded = verifyRefreshToken(refreshTokenCookie);
            const userId = decoded.id_usuario;

            const usuario = await UsuariosModel.findByRefreshToken(userId, refreshTokenCookie);
            
            if (!usuario) {
                res.clearCookie('accessToken');
                res.clearCookie('refreshToken');
                return res.status(401).json({
                    success: false,
                    message: 'Sesión inválida. Vuelva a iniciar sesión.'
                });
            }

            const tokenPayload = {
                id_usuario: usuario.id_usuario,
                role: usuario.role,
                nombre: usuario.nombre,
                correo: usuario.correo
            };

            const newAccessToken = createAccessToken(tokenPayload);

            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true,
                maxAge: 15 * 60 * 1000 
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
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({
                success: false,
                message: 'Token de refresco expirado o inválido.'
            });
        }
    }

    cerrarSesion = async (req, res) => {
        try {

            const userId = req.user.id_usuario; 

            await UsuariosModel.updateRefreshToken(userId, null);

            const sessionPattern = `session:${userId}:`;
            for (const [key, value] of memoryStore.entries()) {
                if (key.startsWith(sessionPattern)) {
                    memoryStore.delete(key);
                }
            }

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

    getPerfil = async (req, res) => {
        try {

            const { id_usuario } = req.user;

            const usuario = await UsuariosModel.findById(id_usuario);

            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado.' 
                });
            }

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

    updatePerfil = async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario; 
            const { nombre, correo, clave_actual, nueva_clave } = req.body;

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

            if (nombre || correo) {
                if (correo && userCurrent.correo !== correo) {
                    const existingUser = await UsuariosModel.findByEmail(correo);
                    if (existingUser && existingUser.id_usuario !== id_usuario) {
                        return res.status(409).json({ success: false, message: 'El nuevo correo ya está en uso.' });
                    }
                }
                await UsuariosModel.updateProfile(id_usuario, nombre, correo);
            }

            if (nueva_clave) {
                if (!clave_actual) {
                    return res.status(400).json({ message: 'Debes enviar tu contraseña actual para cambiarla.' });
                }
                
                const coincide = await bcrypt.compare(clave_actual, userCurrent.clave);
                if (!coincide) {
                    return res.status(401).json({ message: 'La contraseña actual no es correcta.' });
                }

                if (nueva_clave.length < 8) {
                    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
                }

                const nuevaClaveHash = await bcrypt.hash(nueva_clave, 12);
                await UsuariosModel.updatePassword(id_usuario, nuevaClaveHash);

                const sessionPattern = `session:${id_usuario}:`;
                for (const [key, value] of memoryStore.entries()) {
                    if (key.startsWith(sessionPattern)) {
                        memoryStore.delete(key);
                    }
                }
                await UsuariosModel.updateRefreshToken(id_usuario, null); 
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