import DispositivosModel from "../models/dispositivos.model.js";
import ActividadModel from "../models/actividad.model.js";

class DispositivosController {
  async list(req, res) {
    try {
      const rows = await DispositivosModel.findAll();
      return res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al obtener dispositivos" });
    }
  }

  async upsert(req, res) {
    try {
      const clave = String(req.params.clave || "").trim();
      if (!clave) return res.status(400).json({ success: false, message: "clave requerida" });

      const { estado, notas, nombre } = req.body;

      const normalizedEstado = String(estado || "auto");
      if (!["auto", "mantenimiento", "fuera_servicio"].includes(normalizedEstado)) {
        return res.status(400).json({ success: false, message: "estado inválido" });
      }

      const modo = normalizedEstado === "auto" ? "auto" : "manual";
      const estado_manual = modo === "manual" ? normalizedEstado : null;

      await DispositivosModel.upsert({
        clave,
        nombre: typeof nombre === "string" && nombre.trim() ? nombre.trim() : clave,
        modo,
        estado_manual,
        notas: typeof notas === "string" ? notas.trim() : "",
        updated_by: req.user.id_usuario
      });

      await ActividadModel.create({
        id_usuario: req.user.id_usuario,
        accion: "device.status.updated",
        detalle: { clave, modo, estado_manual }
      });

      return res.json({ success: true, message: "Dispositivo actualizado" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al actualizar dispositivo" });
    }
  }
}

export default new DispositivosController();
