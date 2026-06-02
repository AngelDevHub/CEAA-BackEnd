import { pool } from "../db.js";

class BitacorasModel {
  async create({ id_usuario, id_tarea = null, titulo, descripcion = "", sector = "", riego_seg = null, litros_estimados = null }) {
    const query = `
      INSERT INTO bitacoras (id_usuario, id_tarea, titulo, descripcion, sector, riego_seg, litros_estimados)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      id_usuario,
      id_tarea,
      titulo,
      descripcion,
      sector,
      riego_seg,
      litros_estimados
    ]);
    return result.insertId;
  }

  async findAll() {
    const query = `
      SELECT
        b.id_bitacora,
        b.titulo,
        b.descripcion,
        b.sector,
        b.id_tarea,
        b.riego_seg,
        b.litros_estimados,
        t.titulo AS tarea_titulo,
        b.id_usuario,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        b.created_at
      FROM bitacoras b
      JOIN usuarios u ON u.id_usuario = b.id_usuario
      LEFT JOIN tareas t ON t.id_tarea = b.id_tarea
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  async findByUserId(id_usuario) {
    const query = `
      SELECT
        b.id_bitacora,
        b.titulo,
        b.descripcion,
        b.sector,
        b.id_tarea,
        b.riego_seg,
        b.litros_estimados,
        t.titulo AS tarea_titulo,
        b.id_usuario,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        b.created_at
      FROM bitacoras b
      JOIN usuarios u ON u.id_usuario = b.id_usuario
      LEFT JOIN tareas t ON t.id_tarea = b.id_tarea
      WHERE b.id_usuario = ?
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.execute(query, [id_usuario]);
    return rows;
  }

  async findBetween({ start, end, id_usuario = null }) {
    const where = id_usuario ? "WHERE b.created_at BETWEEN ? AND ? AND b.id_usuario = ?" : "WHERE b.created_at BETWEEN ? AND ?";
    const params = id_usuario ? [start, end, id_usuario] : [start, end];
    const query = `
      SELECT
        b.id_bitacora,
        b.titulo,
        b.descripcion,
        b.sector,
        b.id_tarea,
        b.riego_seg,
        b.litros_estimados,
        t.titulo AS tarea_titulo,
        b.id_usuario,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        b.created_at
      FROM bitacoras b
      JOIN usuarios u ON u.id_usuario = b.id_usuario
      LEFT JOIN tareas t ON t.id_tarea = b.id_tarea
      ${where}
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

export default new BitacorasModel();
