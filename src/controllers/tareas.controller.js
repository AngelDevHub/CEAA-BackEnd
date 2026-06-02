import TareasModel from "../models/tareas.model.js";

class TareasController {
  async list(req, res) {
    try {
      const canManageUsers = Array.isArray(req.user?.permissions) && req.user.permissions.includes("manage:users");
      const rows = canManageUsers
        ? await TareasModel.findAll()
        : await TareasModel.findByAssignee(req.user.id_usuario);

      return res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener tareas"
      });
    }
  }

  async create(req, res) {
    try {
      const { titulo, descripcion, prioridad, asignado_a } = req.body;

      if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
        return res.status(400).json({ success: false, message: "Título requerido" });
      }
      if (!asignado_a || Number.isNaN(Number(asignado_a))) {
        return res.status(400).json({ success: false, message: "asignado_a requerido" });
      }

      const p = prioridad || "media";
      if (!["baja", "media", "alta"].includes(p)) {
        return res.status(400).json({ success: false, message: "prioridad inválida" });
      }

      const id = await TareasModel.create({
        titulo: titulo.trim(),
        descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
        prioridad: p,
        asignado_a: Number(asignado_a),
        creado_por: req.user.id_usuario
      });

      return res.status(201).json({
        success: true,
        message: "Tarea creada",
        data: { id_tarea: id }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al crear tarea"
      });
    }
  }

  async updateEstado(req, res) {
    try {
      const id_tarea = Number(req.params.id);
      const { estado } = req.body;

      if (!id_tarea || Number.isNaN(id_tarea)) {
        return res.status(400).json({ success: false, message: "ID inválido" });
      }
      if (!["pendiente", "en_progreso", "completada", "cancelada"].includes(estado)) {
        return res.status(400).json({ success: false, message: "estado inválido" });
      }

      const tarea = await TareasModel.findById(id_tarea);
      if (!tarea) {
        return res.status(404).json({ success: false, message: "Tarea no encontrada" });
      }

      const canManageUsers = Array.isArray(req.user?.permissions) && req.user.permissions.includes("manage:users");
      const isAssignee = tarea.asignado_a === req.user.id_usuario;
      if (!canManageUsers && !isAssignee) {
        return res.status(403).json({ success: false, message: "No tienes permisos para actualizar esta tarea" });
      }

      const completedAt = estado === "completada" ? new Date() : null;
      const affected = await TareasModel.updateEstado({ id_tarea, estado, completedAt });

      if (affected === 0) {
        return res.status(404).json({ success: false, message: "Tarea no encontrada" });
      }

      return res.json({ success: true, message: "Tarea actualizada" });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar tarea"
      });
    }
  }
}

export default new TareasController();

