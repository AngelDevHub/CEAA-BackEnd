import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js';
import { createAccessToken } from '../libs/jwt.js';

class InicioSesionController {
    
    // POST /login
    async iniciarSesion(req, res) {
        const { correo, clave } = req.body;

        try {
            if (!correo || !clave) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan credenciales (correo y clave).' 
                });
            }

            const usuario = await UsuariosModel.findByEmail(correo);

            if (!usuario) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
            }

            const isMatch = await bcrypt.compare(clave, usuario.clave);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
            }

            const token = await createAccessToken({
                id: usuario.id_usuario,
                nombre: usuario.nombre,
            });

            await UsuariosModel.updateToken(usuario.id_usuario, token);
            
            // Enviar token en cookie httpOnly (seguridad)
            res.cookie('token', token, {
                httpOnly: true, 
                maxAge: 3600000 
            });

            const expiresIn = 3600; // 1 hora en segundos

            return res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.',
                token: token,
                expiresIn: expiresIn,
                data: {
                    id: usuario.id_usuario,
                    nombre: usuario.nombre
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

    async cerrarSesion(req, res) {
        try {
            res.clearCookie('token'); 
            
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

    async getPerfil(req, res) {
        try {
        const { id } = req.user;

        const usuario = await UsuariosModel.findById(id);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({
            success: true,
            data: usuario
        });
        } catch (error) {
        console.error('Error al obtener el perfil:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno al obtener el perfil del usuario.'
        });
        }
    }

    async updatePerfil(req, res) {
        try {
        const id_usuario = req.user.id; 
        const { nombre, correo, clave_actual, nueva_clave } = req.body;

        if (!nombre && !correo && !nueva_clave) {
            return res.status(400).json({
            success: false,
            message: 'Debes enviar al menos un campo para actualizar (nombre, correo o contraseña).'
            });
        }

        let actualizado = 0;
        if (nombre || correo) {
            actualizado = await UsuariosModel.updateProfile(id_usuario, nombre, correo);
        }

        if (nueva_clave) {
            if (!clave_actual) {
            return res.status(400).json({
                success: false,
                message: 'Debes enviar tu contraseña actual para cambiarla.'
            });
            }

            const claveGuardada = await UsuariosModel.getPasswordById(id_usuario);
            if (!claveGuardada) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
            }

            const coincide = await bcrypt.compare(clave_actual, claveGuardada);
            if (!coincide) {
            return res.status(401).json({
                success: false,
                message: 'La contraseña actual no es correcta.'
            });
            }

            const nuevaClaveHash = await bcrypt.hash(nueva_clave, 10);
            const actualizadoClave = await UsuariosModel.updatePassword(id_usuario, nuevaClaveHash);
            if (actualizadoClave === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la contraseña.'
            });
            }
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

    async registerUser(req, res) {
        const { nombre, correo, clave } = req.body;
        try {
        if (!nombre || !correo || !clave) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        const existingUser = await UsuariosModel.findByEmail(correo);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Correo ya registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(clave, salt);

        const userId = await UsuariosModel.create(nombre, correo, hashedPassword);
        res.status(201).json({ success: true, message: 'Usuario creado', data: { id: userId, nombre, correo } });

        } catch (err) {
        console.error('Error creando usuario:', err);
        res.status(500).json({ success: false, message: 'Error creando usuario' });
        }
    }
}
export default new InicioSesionController();