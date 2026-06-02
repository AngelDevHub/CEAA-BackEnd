import { pool } from "../db.js";

class ActividadModel {
  async create({ id_usuario, accion, detalle = null }) {
    const query = `
      INSERT INTO actividad_usuario (id_usuario, accion, detalle)
      VALUES (?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      id_usuario,
      accion,
      detalle ? JSON.stringify(detalle) : null
    ]);
    return result.insertId;
  }

  async list({ id_usuario = null, limit = 100 }) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));
    const where = id_usuario ? "WHERE a.id_usuario = ?" : "";
    const params = id_usuario ? [id_usuario] : [];
    const query = `
      SELECT
        a.id_actividad,
        a.id_usuario,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        a.accion,
        a.detalle,
        a.created_at
      FROM actividad_usuario a
      JOIN usuarios u ON u.id_usuario = a.id_usuario
      ${where}
      ORDER BY a.created_at DESC
      LIMIT ${safeLimit}
    `;
    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

export default new ActividadModel();

