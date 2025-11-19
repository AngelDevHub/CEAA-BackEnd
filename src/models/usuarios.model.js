import { pool } from "../db.js";

class UsuariosModel {
    /**
     * Busca un usuario por correo electrónico.
     * Incluye la clave (hash) y el refresh_token para la lógica de autenticación.
     * @param {string} correo - Correo electrónico del usuario.
     * @returns {Object|null} Objeto de usuario o null.
     */
    async findByEmail(correo) {
        // Incluimos refresh_token, clave, e id_usuario para la verificación de inicio de sesión y tokens
        const query =
            "SELECT id_usuario, nombre, correo, clave, estatus, refresh_token FROM usuarios WHERE correo = ?"; 
        const [rows] = await pool.execute(query, [correo]);
        return rows[0] || null;
    }

    /**
     * Busca un usuario por su ID. No incluye campos sensibles como la clave o el refresh_token.
     * @param {number} id_usuario - ID del usuario.
     * @returns {Object|null} Objeto de usuario seguro o null.
     */
    async findById(id_usuario) {
        const query =
            "SELECT id_usuario, nombre, correo, estatus FROM usuarios WHERE id_usuario = ?";
        const [rows] = await pool.execute(query, [id_usuario]);
        return rows[0] || null;
    }

    /**
     * Busca un usuario asegurándose de que el ID y el refresh_token coincidan.
     * Crucial para el endpoint /refresh-token.
     * @param {number} id_usuario - ID del usuario.
     * @param {string} refreshToken - El token de refresco a verificar.
     * @returns {Object|null} Objeto de usuario o null.
     */
    async findByRefreshToken(id_usuario, refreshToken) {
        const query =
            "SELECT id_usuario, nombre, correo, estatus FROM usuarios WHERE id_usuario = ? AND refresh_token = ?";
        const [rows] = await pool.execute(query, [id_usuario, refreshToken]);
        return rows[0] || null;
    }

    /**
     * Crea un nuevo usuario en la base de datos.
     * @param {string} nombre - Nombre del usuario.
     * @param {string} correo - Correo del usuario.
     * @param {string} claveHash - Contraseña hasheada.
     * @returns {number} ID del usuario insertado.
     */
    async create(nombre, correo, claveHash) {
        const query =
            "INSERT INTO usuarios (nombre, correo, clave) VALUES (?, ?, ?)";
        const [result] = await pool.execute(query, [nombre, correo, claveHash]);
        return result.insertId;
    }

    /**
     * Actualiza nombre y/o correo del usuario.
     * @param {number} id_usuario - ID del usuario.
     * @param {string|null} [nombre=null] - Nuevo nombre.
     * @param {string|null} [correo=null] - Nuevo correo.
     * @returns {number} Número de filas afectadas.
     */
    async updateProfile(id_usuario, nombre = null, correo = null) {
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
        if (campos.length === 0) {
            return 0;
        }

        const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`;
        valores.push(id_usuario);

        const [result] = await pool.execute(query, valores);
        return result.affectedRows;
    }

    /**
     * Actualiza solo la contraseña (hash) del usuario.
     * @param {number} id_usuario - ID del usuario.
     * @param {string} nuevaClaveHash - Nuevo hash de la contraseña.
     * @returns {number} Número de filas afectadas.
     */
    async updatePassword(id_usuario, nuevaClaveHash) {
        const query = 'UPDATE usuarios SET clave = ? WHERE id_usuario = ?';
        const [result] = await pool.execute(query, [nuevaClaveHash, id_usuario]);
        return result.affectedRows;
    }

    /**
     * Obtiene el hash de la contraseña del usuario.
     * @param {number} id_usuario - ID del usuario.
     * @returns {string|null} Hash de la clave o null.
     */
    async getPasswordById(id_usuario) {
        const query = 'SELECT clave FROM usuarios WHERE id_usuario = ?';
        const [rows] = await pool.execute(query, [id_usuario]);
        return rows[0]?.clave || null;
    }

    /**
     * 🟢 CRUCIAL: Actualiza el refresh_token del usuario en la DB.
     * Usado en login (guardar) y logout/cambio de clave (limpiar).
     * @param {number} id_usuario - ID del usuario.
     * @param {string|null} refreshToken - El nuevo token o null para limpiar.
     * @returns {number} Número de filas afectadas.
     */
    async updateRefreshToken(id_usuario, refreshToken) {
        const query = "UPDATE usuarios SET refresh_token = ? WHERE id_usuario = ?";
        const [result] = await pool.execute(query, [refreshToken, id_usuario]);
        return result.affectedRows;
    }
    
    /**
     * 🟢 CRUCIAL: Limpia el refresh_token de la DB (alias para updateRefreshToken(id, null)).
     * Usado en el cierre de sesión.
     * @param {number} id_usuario - ID del usuario.
     * @returns {number} Número de filas afectadas.
     */
    async clearRefreshToken(id_usuario) {
        return this.updateRefreshToken(id_usuario, null);
    }
    
    /**
     * Obtener todos los usuarios activos
     * @returns {Array<Object>} Lista de usuarios.
     */
    async findAll() {
        const query =
            'SELECT id_usuario, nombre, correo, estatus FROM usuarios WHERE estatus = "activo"';
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Alias para métodos de lectura (compatibilidad con otros estilos de código)
    async getAll() {
        return this.findAll();
    }
    async getById(id) {
        return this.findById(id);
    }
    async update(id, nombre = null, correo = null) {
        return this.updateProfile(id, nombre, correo);
    }
    async delete(id) {
        const query = 'UPDATE usuarios SET estatus = "inactivo" WHERE id_usuario = ?';
        const [result] = await pool.execute(query, [id]);
        return result.affectedRows;
    }
}

export default new UsuariosModel();
