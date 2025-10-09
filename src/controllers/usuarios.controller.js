// src/controllers/usuarios.controller.js
import bcrypt from 'bcryptjs';
import UsuariosModel from '../models/usuarios.model.js'; 

class UsuariosController {

  // GET /users - Obtener todos los usuarios activos
  async getAll(req, res) {
    try {
      const users = await UsuariosModel.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      console.error('Error obteniendo usuarios:', err);
      res.status(500).json({ success: false, message: 'Error obteniendo usuarios' });
    }
  }

  // GET /users/:id - Obtener usuario por ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      const user = await UsuariosModel.findById(id); // o findById
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      res.json({ success: true, data: user });
    } catch (err) {
      console.error('Error obteniendo usuario:', err);
      res.status(500).json({ success: false, message: 'Error obteniendo usuario' });
    }
  }

  // POST /users - Crear un nuevo usuario
  async create(req, res) {
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

  // PUT /users/:id - Editar usuario
  async update(req, res) {
    const { id } = req.params;
    const { nombre, correo } = req.body;

    try {
      const affectedRows = await UsuariosModel.update(id, nombre, correo);
      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado o sin cambios' });
      }
      res.json({ success: true, message: 'Usuario actualizado' });
    } catch (err) {
      console.error('Error actualizando usuario:', err);
      res.status(500).json({ success: false, message: 'Error actualizando usuario' });
    }
  }

  // DELETE /users/:id  - Eliminación lógica (cambio de estatus)
  async delete(req, res) {
    const { id } = req.params;
    try {
      const affectedRows = await UsuariosModel.delete(id);
      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      res.json({ success: true, message: 'Usuario eliminado (inactivo)' });
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      res.status(500).json({ success: false, message: 'Error eliminando usuario' });
    }
  }
}

export default new UsuariosController();
