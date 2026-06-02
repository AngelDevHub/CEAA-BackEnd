import ConfigModel from "../models/config.model.js";
import ActividadModel from "../models/actividad.model.js";

class ConfigController {
  async list(req, res) {
    try {
      const rows = await ConfigModel.list();
      return res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al obtener configuración" });
    }
  }

  async upsert(req, res) {
    try {
      const key = String(req.params.key || "").trim();
      if (!key) return res.status(400).json({ success: false, message: "key requerida" });

      const value = req.body?.value;
      await ConfigModel.upsert({ key, value, updated_by: req.user.id_usuario });

      await ActividadModel.create({
        id_usuario: req.user.id_usuario,
        accion: "config.updated",
        detalle: { key }
      });

      return res.json({ success: true, message: "Configuración actualizada" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al actualizar configuración" });
    }
  }
}

export default new ConfigController();

