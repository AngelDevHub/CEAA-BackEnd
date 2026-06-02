import ActividadModel from "../models/actividad.model.js";

class ActividadController {
  async list(req, res) {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : null;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const rows = await ActividadModel.list({ id_usuario: userId, limit });
      return res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al obtener actividad" });
    }
  }
}

export default new ActividadController();

