import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js'; 

class UsuariosController {

  async getAll(req, res) {
    try {
      const users = await UsuariosModel.findAll();
      res.json({ 
        success: true, 
        data: users,
        count: users.length
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al obtener usuarios' 
      });
    }
  }

  async getById(req, res) {
    const { id } = req.params;
    try {
      if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de usuario inválido' 
        });
      }

      const user = await UsuariosModel.findById(parseInt(id));
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        data: user 
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al obtener el usuario' 
      });
    }
  }

  async create(req, res) {
    const { nombre, correo, clave } = req.body;
    try {
      if (!nombre || !correo || !clave) {
        return res.status(400).json({ 
          success: false, 
          message: 'Faltan datos requeridos: nombre, correo y clave son obligatorios' 
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de correo electrónico inválido'
        });
      }

      if (clave.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      const existingUser = await UsuariosModel.findByEmail(correo);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: 'El correo electrónico ya está registrado' 
        });
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(clave, salt);

      const userId = await UsuariosModel.create(nombre, correo, hashedPassword);
      
      res.status(201).json({ 
        success: true, 
        message: 'Usuario creado exitosamente', 
        data: { 
          id: userId, 
          nombre, 
          correo 
        } 
      });

    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al crear usuario' 
      });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    const { nombre, correo } = req.body;

    try {
      if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de usuario inválido' 
        });
      }

      if (!nombre && !correo) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un campo para actualizar: nombre o correo'
        });
      }

      if (correo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
          return res.status(400).json({
            success: false,
            message: 'Formato de correo electrónico inválido'
          });
        }

        const existingUser = await UsuariosModel.findByEmail(correo);
        if (existingUser && existingUser.id_usuario !== parseInt(id)) {
          return res.status(409).json({
            success: false,
            message: 'El correo electrónico ya está en uso por otro usuario'
          });
        }
      }

      const affectedRows = await UsuariosModel.update(parseInt(id), nombre, correo);
      if (affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado o sin cambios' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Usuario actualizado exitosamente' 
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al actualizar usuario' 
      });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de usuario inválido' 
        });
      }

      const affectedRows = await UsuariosModel.delete(parseInt(id));
      if (affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Usuario desactivado exitosamente' 
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al eliminar usuario' 
      });
    }
  }
}

export default new UsuariosController();