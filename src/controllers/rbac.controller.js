import RbacModel from "../models/rbac.model.js";
import ActividadModel from "../models/actividad.model.js";

class RbacController {
  async bootstrap(req, res) {
    try {
      const [roles, permissions] = await Promise.all([
        RbacModel.listRoles(),
        RbacModel.listPermissions()
      ]);
      return res.json({ success: true, data: { roles, permissions } });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al cargar RBAC" });
    }
  }

  async getUser(req, res) {
    try {
      const id_usuario = Number(req.params.id);
      if (!id_usuario || Number.isNaN(id_usuario)) {
        return res.status(400).json({ success: false, message: "ID inválido" });
      }
      const data = await RbacModel.getUserRolesAndPermissions(id_usuario);
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al obtener roles/permisos del usuario" });
    }
  }

  async setUserRoles(req, res) {
    try {
      const id_usuario = Number(req.params.id);
      const roles = Array.isArray(req.body?.roles) ? req.body.roles : [];
      const roleIds = roles.map(Number).filter((n) => Number.isInteger(n) && n > 0);

      await RbacModel.setUserRoles(id_usuario, roleIds);
      await ActividadModel.create({
        id_usuario: req.user.id_usuario,
        accion: "rbac.roles.updated",
        detalle: { targetUserId: id_usuario, roleIds }
      });

      return res.json({ success: true, message: "Roles actualizados" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al actualizar roles" });
    }
  }

  async setUserDirectPermissions(req, res) {
    try {
      const id_usuario = Number(req.params.id);
      const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
      const permissionIds = permissions.map(Number).filter((n) => Number.isInteger(n) && n > 0);

      await RbacModel.setUserDirectPermissions(id_usuario, permissionIds);
      await ActividadModel.create({
        id_usuario: req.user.id_usuario,
        accion: "rbac.permissions.updated",
        detalle: { targetUserId: id_usuario, permissionIds }
      });

      return res.json({ success: true, message: "Permisos directos actualizados" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al actualizar permisos" });
    }
  }
}

export default new RbacController();

