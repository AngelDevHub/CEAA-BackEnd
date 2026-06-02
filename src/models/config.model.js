import { pool } from "../db.js";

class ConfigModel {
  async list() {
    const [rows] = await pool.execute(
      "SELECT `key`, `value_json`, updated_by, updated_at FROM configuracion ORDER BY `key`"
    );
    return rows.map((r) => ({
      key: r.key,
      value: r.value_json ? JSON.parse(r.value_json) : null,
      updated_by: r.updated_by,
      updated_at: r.updated_at
    }));
  }

  async upsert({ key, value, updated_by }) {
    const query = `
      INSERT INTO configuracion (\`key\`, value_json, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        value_json = VALUES(value_json),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `;
    const [result] = await pool.execute(query, [key, JSON.stringify(value), updated_by]);
    return result.affectedRows;
  }
}

export default new ConfigModel();

