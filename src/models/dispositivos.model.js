import { pool } from "../db.js";

class DispositivosModel {
  async findAll() {
    const query = `
      SELECT
        d.clave,
        d.nombre,
        d.modo,
        d.estado_manual,
        d.notas,
        d.updated_by,
        u.correo AS updated_by_correo,
        d.updated_at
      FROM dispositivos d
      LEFT JOIN usuarios u ON u.id_usuario = d.updated_by
      ORDER BY d.nombre ASC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  async upsert({ clave, nombre, modo, estado_manual, notas, updated_by }) {
    const query = `
      INSERT INTO dispositivos (clave, nombre, modo, estado_manual, notas, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre = VALUES(nombre),
        modo = VALUES(modo),
        estado_manual = VALUES(estado_manual),
        notas = VALUES(notas),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `;
    const [result] = await pool.execute(query, [clave, nombre, modo, estado_manual, notas, updated_by]);
    return result.affectedRows;
  }
}

export default new DispositivosModel();

