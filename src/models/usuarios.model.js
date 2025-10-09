import { pool } from "../db.js";

class UsuariosModel {
  // Obtener por correo (para login/registro)
  async findByEmail(correo) {
    const query =
      "SELECT id_usuario, nombre, correo, clave, estatus FROM usuarios WHERE correo = ?";
    const [rows] = await pool.execute(query, [correo]);
    return rows[0] || null;
  }

  // Crear un nuevo usuario
  async create(nombre, correo, claveHash) {
    const query =
      "INSERT INTO usuarios (nombre, correo, clave) VALUES (?, ?, ?)";
    const [result] = await pool.execute(query, [nombre, correo, claveHash]);
    return result.insertId;
  }

  // Obtener todos los usuarios activos
  async findAll() {
    const query =
      'SELECT id_usuario, nombre, correo, estatus FROM usuarios WHERE estatus = "activo"';
    const [rows] = await pool.execute(query);
    return rows;
  }

  // Obtener usuario por ID
  async findById(id_usuario) {
    const query =
      "SELECT id_usuario, nombre, correo, estatus FROM usuarios WHERE id_usuario = ?";
    const [rows] = await pool.execute(query, [id_usuario]);
    return rows[0] || null;
  }

  // Actualizar información de usuario
  async update(id_usuario, nombre, correo) {
    const query =
      "UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?";
    const [result] = await pool.execute(query, [nombre, correo, id_usuario]);
    return result.affectedRows;
  }

  // Eliminación lógica (cambio de estatus)
  async delete(id_usuario) {
    const query =
      'UPDATE usuarios SET estatus = "inactivo" WHERE id_usuario = ?';
    const [result] = await pool.execute(query, [id_usuario]);
    return result.affectedRows;
  }

  // Actualizar token del usuario
  async updateToken(id_usuario, token) {
    const query = "UPDATE usuarios SET token = ? WHERE id_usuario = ?";
    const [result] = await pool.execute(query, [token, id_usuario]);
    return result.affectedRows;
  }

  // Actualizar nombre o correo del usuario
  async updateProfile(id_usuario, nombre = null, correo = null) {
    // Construir la consulta dinámicamente
    let campos = [];
    let valores = [];

    if (nombre !== null) {
      campos.push('nombre = ?');
      valores.push(nombre);
    }
    if (correo !== null) {
      campos.push('correo = ?');
      valores.push(correo);
    }

    // Si no se enviaron campos, no hacemos nada
    if (campos.length === 0) {
      return 0;
    }

    const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`;
    valores.push(id_usuario);

    const [result] = await pool.execute(query, valores);
    return result.affectedRows;
  }
  
  // Actualizar solo la contraseña del usuario
  async updatePassword(id_usuario, nuevaClaveHash) {
    const query = 'UPDATE usuarios SET clave = ? WHERE id_usuario = ?';
    const [result] = await pool.execute(query, [nuevaClaveHash, id_usuario]);
    return result.affectedRows;
  }

  // Obtener contraseña (hash) del usuario
  async getPasswordById(id_usuario) {
    const query = 'SELECT clave FROM usuarios WHERE id_usuario = ?';
    const [rows] = await pool.execute(query, [id_usuario]);
    return rows[0]?.clave || null;
  }

}

export default new UsuariosModel();
