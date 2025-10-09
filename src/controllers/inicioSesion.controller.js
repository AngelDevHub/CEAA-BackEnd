import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js';
import { createAccessToken } from '../libs/jwt.js';

class InicioSesionController {
    
    // POST /login
    async iniciarSesion(req, res) {
        const { correo, clave } = req.body;

        try {
            // 1. Validar que se hayan enviado ambos campos
            if (!correo || !clave) {
                // Estado 400 Bad Request: La solicitud no pudo ser entendida.
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan credenciales (correo y clave).' 
                });
            }

            // 2. Buscar al usuario por correo
            const usuario = await UsuariosModel.findByEmail(correo);

            // Si el usuario no existe, se usa un mensaje genérico por seguridad
            if (!usuario) {
                // Estado 401 Unauthorized: Autenticación requerida/fallida
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
            }

            // 3. Comparar la clave ingresada con el hash de la DB
            // Asumo que tu modelo devuelve un objeto con el campo 'clave'
            const isMatch = await bcrypt.compare(clave, usuario.clave);

            // Si la clave no coincide, también se usa un mensaje genérico por seguridad
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
            }
            
            // 4. GENERAR el JSON Web Token
            const token = await createAccessToken({
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                // rol: usuario.rol // Descomentar si usas roles
            });

            await UsuariosModel.updateToken(usuario.id_usuario, token);
            
            // 5. Devolver la respuesta con el token. 
            
            // OPCIÓN RECOMENDADA: Enviar token en cookie httpOnly (seguridad)
            res.cookie('token', token, {
                httpOnly: true, // No accesible desde JavaScript en el navegador
                // secure: process.env.NODE_ENV === 'production', // Habilitar en producción con HTTPS
                // sameSite: 'strict', // Protección CSRF
                maxAge: 3600000 // 1 hora de expiración (ajusta según necesites)
            });


            // DEVOLVER RESPUESTA: Puedes quitar el 'token:' si usas cookies, 
            // pero es común devolverlo también para facilitar el manejo en el frontend o en apps móviles.
            const expiresIn = 3600; // 1 hora en segundos, puedes ajustar

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
            // Estado 500 Internal Server Error: Error inesperado en el servidor
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor al iniciar sesión.' 
            });
        }
    }

    async cerrarSesion(req, res) {
        try {
            // 1. Limpiar la Cookie que contiene el Token
            // 'token' debe coincidir con el nombre que usaste para crearla en el login
            res.clearCookie('token'); 
            
            // 2. Enviar una respuesta de éxito
            // Estado 200 OK y un mensaje. No se devuelve contenido (status 204 No Content también sería válido)
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
        // El ID del usuario viene del token verificado por el middleware
        const { id } = req.user;

        const usuario = await UsuariosModel.findById(id);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // No se devuelve la clave ni token por seguridad
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
        const id_usuario = req.user.id; // del token
        const { nombre, correo, clave_actual, nueva_clave } = req.body;

        // ⚠️ Validar que haya al menos un dato a modificar
        if (!nombre && !correo && !nueva_clave) {
            return res.status(400).json({
            success: false,
            message: 'Debes enviar al menos un campo para actualizar (nombre, correo o contraseña).'
            });
        }

        // 🔹 1. Actualizar nombre o correo (si se enviaron)
        let actualizado = 0;
        if (nombre || correo) {
            actualizado = await UsuariosModel.updateProfile(id_usuario, nombre, correo);
        }

        // 🔹 2. Actualizar contraseña (si se envió nueva_clave)
        if (nueva_clave) {
            // Requiere también la clave actual para seguridad
            if (!clave_actual) {
            return res.status(400).json({
                success: false,
                message: 'Debes enviar tu contraseña actual para cambiarla.'
            });
            }

            // Obtener la contraseña actual del usuario
            const claveGuardada = await UsuariosModel.getPasswordById(id_usuario);
            if (!claveGuardada) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
            }

            // Verificar que la contraseña actual coincida
            const coincide = await bcrypt.compare(clave_actual, claveGuardada);
            if (!coincide) {
            return res.status(401).json({
                success: false,
                message: 'La contraseña actual no es correcta.'
            });
            }

            // Encriptar la nueva contraseña
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
}
export default new InicioSesionController();