import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../libs/jwt.js';
import redisClient from '../libs/redis.js';

class InicioSesionController {

    incrementCounter = async (key, ttlMs) => {
        const value = await redisClient.incr(key);
        if (value === 1) {
            await redisClient.pexpire(key, ttlMs);
        }
        return value;
    }

    registrarIntentoFallido = async (ip, correo) => {
        const ipAttemptsKey = `attempts_ip:${ip}`;
        const emailAttemptsKey = `attempts_email:${correo}`;

        const ipAttempts = await this.incrementCounter(ipAttemptsKey, 900_000);      
        const emailAttempts = await this.incrementCounter(emailAttemptsKey, 900_000);

        if (ipAttempts >= 5) {
            await redisClient.setEx(`blocked_ip:${ip}`, 900, 'blocked');
        }
        if (emailAttempts >= 5) {
            await redisClient.setEx(`blocked_email:${correo}`, 1800, 'blocked');
        }
    }

    limpiarIntentosFallidos = async (ip, correo) => {
        await redisClient.del(`attempts_ip:${ip}`);
        await redisClient.del(`attempts_email:${correo}`);
        await redisClient.del(`blocked_ip:${ip}`);
        await redisClient.del(`blocked_email:${correo}`);
    }

    iniciarSesion = async (req, res) => {
        const { correo, clave } = req.body;

        try {
            if (!correo || !clave) return res.status(400).json({ success: false, message: 'Faltan credenciales.' });

            const isIpBlocked = await redisClient.get(`blocked_ip:${req.ip}`);
            if (isIpBlocked) return res.status(429).json({ success: false, message: 'Demasiados intentos. Intente más tarde.' });

            const isEmailBlocked = await redisClient.get(`blocked_email:${correo}`);
            if (isEmailBlocked) return res.status(429).json({ success: false, message: 'Cuenta temporalmente bloqueada.' });

            const usuario = await UsuariosModel.findByEmail(correo);
            if (!usuario) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
            }

            const isMatch = await bcrypt.compare(clave, usuario.clave);
            if (!isMatch) {
                await this.registrarIntentoFallido(req.ip, correo);
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
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
            await redisClient.setEx(sessionKey, 7 * 24 * 3600, JSON.stringify({ 
                ip: req.ip, 
                userAgent: req.get('User-Agent'), 
                timestamp: new Date().toISOString() 
            }));

            const cookieOptions = { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                signed: true,
                path: '/'
            };

            res.cookie('accessToken', accessToken, { 
                ...cookieOptions, 
                maxAge: 15 * 60 * 1000
            });
            
            res.cookie('refreshToken', refreshToken, { 
                ...cookieOptions, 
                maxAge: 7 * 24 * 3600 * 1000
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.', 
                data: { 
                    id: usuario.id_usuario, 
                    nombre: usuario.nombre, 
                    correo: usuario.correo,
                    role: usuario.role
                } 
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
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
                    message: 'Token de refresco requerido.'
                });
            }

            const decoded = verifyRefreshToken(refreshTokenCookie);

            const userId = decoded.id_usuario;
            let usuario = await UsuariosModel.findByRefreshToken(userId, refreshTokenCookie);
            if (!usuario) {
                const userById = await UsuariosModel.findById(userId);
                if (!userById) {
                    const clearCookieOptions = {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'none',
                        path: '/',
                        signed: true
                    };
                    res.clearCookie('accessToken', clearCookieOptions);
                    res.clearCookie('refreshToken', clearCookieOptions);
                    return res.status(401).json({
                        success: false,
                        message: 'Sesión inválida. Vuelva a iniciar sesión.'
                    });
                }
                await UsuariosModel.updateRefreshToken(userId, refreshTokenCookie);
                usuario = userById;
            }


            const tokenPayload = {
                id_usuario: usuario.id_usuario,
                role: usuario.role,
                nombre: usuario.nombre,
                correo: usuario.correo
            };

            const newAccessToken = createAccessToken(tokenPayload);

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                signed: true,
                path: '/',
                maxAge: 15 * 60 * 1000 
            };

            res.cookie('accessToken', newAccessToken, cookieOptions);

            return res.status(200).json({
                success: true,
                message: 'Access Token renovado.',
                data: {
                    accessToken: newAccessToken,
                    expiresIn: 15 * 60
                }
            });

        } catch (error) {
            
            const clearCookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                path: '/',
                signed: true
            };

            res.clearCookie('accessToken', clearCookieOptions);
            res.clearCookie('refreshToken', clearCookieOptions);

            
            return res.status(401).json({
                success: false,
                message: 'Token de refresco expirado o inválido.'
            });
        }
    }

    cerrarSesion = async (req, res) => {
        try {
            let userId = req.user?.id_usuario;
            
            if (!userId && req.signedCookies?.refreshToken) {
                try {
                    const decoded = verifyRefreshToken(req.signedCookies.refreshToken);
                    userId = decoded.id_usuario;
                } catch {}
            }

            if (userId) {
                await UsuariosModel.updateRefreshToken(userId, null);

                const keys = await redisClient.keys(`session:${userId}:*`);
                if (keys.length) {
                    await redisClient.del(...keys);
                }
            }

            const clearCookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                path: '/',
                signed: true
            };

            res.clearCookie('accessToken', clearCookieOptions);
            res.clearCookie('refreshToken', clearCookieOptions);



            return res.status(200).json({ 
                success: true, 
                message: 'Sesión cerrada exitosamente.' 
            });
        } catch (err) {
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

                const sessionKeys = await redisClient.keys(`session:${id_usuario}:*`);
                if (sessionKeys.length) {
                    await redisClient.del(...sessionKeys);
                }

                await UsuariosModel.updateRefreshToken(id_usuario, null); 
            }

            return res.status(200).json({
                success: true,
                message: 'Perfil actualizado correctamente.'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error interno al actualizar el perfil del usuario.'
            });
        }
    }

}

export default new InicioSesionController();