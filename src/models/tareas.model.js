import { pool } from "../db.js";

class TareasModel {
  async create({ titulo, descripcion = "", prioridad = "media", asignado_a, creado_por }) {
    const query = `
      INSERT INTO tareas (titulo, descripcion, prioridad, asignado_a, creado_por)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [titulo, descripcion, prioridad, asignado_a, creado_por]);
    return result.insertId;
  }

  async findRecentOpenByTitlePrefix({ asignado_a, titlePrefix, minutes = 120 }) {
    const safeMinutes = Math.max(1, Math.min(24 * 60, Number(minutes) || 120));
    const query = `
      SELECT id_tarea
      FROM tareas
      WHERE asignado_a = ?
        AND titulo LIKE ?
        AND estado IN ('pendiente', 'en_progreso')
        AND creado_en >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY creado_en DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [asignado_a, `${titlePrefix}%`, safeMinutes]);
    return rows[0] || null;
  }

  async findAll() {
    const query = `
      SELECT
        t.id_tarea,
        t.titulo,
        t.descripcion,
        t.prioridad,
        t.estado,
        t.asignado_a,
        ua.nombre AS asignado_nombre,
        ua.correo AS asignado_correo,
        t.creado_por,
        uc.nombre AS creado_nombre,
        uc.correo AS creado_correo,
        t.creado_en,
        t.actualizado_en,
        t.completado_en
      FROM tareas t
      JOIN usuarios ua ON ua.id_usuario = t.asignado_a
      JOIN usuarios uc ON uc.id_usuario = t.creado_por
      ORDER BY t.creado_en DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  async findByAssignee(id_usuario) {
    const query = `
      SELECT
        t.id_tarea,
        t.titulo,
        t.descripcion,
        t.prioridad,
        t.estado,
        t.asignado_a,
        ua.nombre AS asignado_nombre,
        ua.correo AS asignado_correo,
        t.creado_por,
        uc.nombre AS creado_nombre,
        uc.correo AS creado_correo,
        t.creado_en,
        t.actualizado_en,
        t.completado_en
      FROM tareas t
      JOIN usuarios ua ON ua.id_usuario = t.asignado_a
      JOIN usuarios uc ON uc.id_usuario = t.creado_por
      WHERE t.asignado_a = ?
      ORDER BY t.creado_en DESC
    `;
    const [rows] = await pool.execute(query, [id_usuario]);
    return rows;
  }

  async findById(id_tarea) {
    const query = `
      SELECT
        t.id_tarea,
        t.titulo,
        t.descripcion,
        t.prioridad,
        t.estado,
        t.asignado_a,
        t.creado_por,
        t.creado_en,
        t.actualizado_en,
        t.completado_en
      FROM tareas t
      WHERE t.id_tarea = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [id_tarea]);
    return rows[0] || null;
  }

  async updateEstado({ id_tarea, estado, completedAt }) {
    const query = `
      UPDATE tareas
      SET estado = ?, completado_en = ?
      WHERE id_tarea = ?
    `;
    const [result] = await pool.execute(query, [estado, completedAt, id_tarea]);
    return result.affectedRows;
  }
}

export default new TareasModel();
