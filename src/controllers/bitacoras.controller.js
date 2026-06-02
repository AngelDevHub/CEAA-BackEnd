import BitacorasModel from "../models/bitacoras.model.js";
import ActividadModel from "../models/actividad.model.js";
import ConfigModel from "../models/config.model.js";

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
      const { titulo, descripcion, sector, id_tarea, riego_seg } = req.body;

      if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
        return res.status(400).json({ success: false, message: "Título requerido" });
      }

      const taskId = id_tarea === null || id_tarea === undefined || id_tarea === "" ? null : Number(id_tarea);
      if (taskId !== null && Number.isNaN(taskId)) {
        return res.status(400).json({ success: false, message: "id_tarea inválido" });
      }

      const riegoSegValue = riego_seg === null || riego_seg === undefined || riego_seg === "" ? null : Number(riego_seg);
      if (riegoSegValue !== null && (!Number.isFinite(riegoSegValue) || riegoSegValue <= 0)) {
        return res.status(400).json({ success: false, message: "riego_seg inválido" });
      }

      let litrosEstimados = null;
      let caudalLph = 100;
      if (riegoSegValue !== null) {
        const caudal = await ConfigModel.get("riego.caudal_lph");
        const parsed = Number(caudal?.value);
        if (Number.isFinite(parsed) && parsed > 0) caudalLph = parsed;
        litrosEstimados = Number(((caudalLph / 3600) * riegoSegValue).toFixed(3));
      }

      const id = await BitacorasModel.create({
        id_usuario: req.user.id_usuario,
        id_tarea: taskId,
        titulo: titulo.trim(),
        descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
        sector: typeof sector === "string" ? sector.trim() : "",
        riego_seg: riegoSegValue,
        litros_estimados: litrosEstimados
      });

      await ActividadModel.create({
        id_usuario: req.user.id_usuario,
        accion: "log.created",
        detalle: {
          id_bitacora: id,
          id_tarea: taskId,
          sector: typeof sector === "string" ? sector.trim() : "",
          riego_seg: riegoSegValue,
          litros_estimados: litrosEstimados,
          caudal_lph: riegoSegValue !== null ? caudalLph : null
        }
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
