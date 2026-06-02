import BitacorasModel from "../models/bitacoras.model.js";

class BitacorasController {
  async list(req, res) {
    try {
      const canManageUsers = Array.isArray(req.user?.permissions) && req.user.permissions.includes("manage:users");
      const rows = canManageUsers
        ? await BitacorasModel.findAll()
        : await BitacorasModel.findByUserId(req.user.id_usuario);

      return res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener bitácoras"
      });
    }
  }

  async create(req, res) {
    try {
      const { titulo, descripcion, sector, id_tarea } = req.body;

      if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
        return res.status(400).json({ success: false, message: "Título requerido" });
      }

      const taskId = id_tarea === null || id_tarea === undefined || id_tarea === "" ? null : Number(id_tarea);
      if (taskId !== null && Number.isNaN(taskId)) {
        return res.status(400).json({ success: false, message: "id_tarea inválido" });
      }

      const id = await BitacorasModel.create({
        id_usuario: req.user.id_usuario,
        id_tarea: taskId,
        titulo: titulo.trim(),
        descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
        sector: typeof sector === "string" ? sector.trim() : ""
      });

      return res.status(201).json({
        success: true,
        message: "Bitácora registrada",
        data: { id_bitacora: id }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al registrar bitácora"
      });
    }
  }
}

export default new BitacorasController();

