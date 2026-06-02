import { pool } from "../db.js";

class RbacModel {
  async listRoles() {
    const [rows] = await pool.execute("SELECT id_rol, nombre FROM roles ORDER BY nombre");
    return rows;
  }

  async listPermissions() {
    const [rows] = await pool.execute("SELECT id_permiso, codigo, descripcion FROM permisos ORDER BY codigo");
    return rows;
  }

  async getUserRolesAndPermissions(id_usuario) {
    const [roles] = await pool.execute(
      `
        SELECT r.id_rol, r.nombre
        FROM usuario_roles ur
        JOIN roles r ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = ?
        ORDER BY r.nombre
      `,
      [id_usuario]
    );

    const [directPerms] = await pool.execute(
      `
        SELECT p.id_permiso, p.codigo
        FROM usuario_permisos up
        JOIN permisos p ON p.id_permiso = up.id_permiso
        WHERE up.id_usuario = ?
        ORDER BY p.codigo
      `,
      [id_usuario]
    );

    const [effectivePerms] = await pool.execute(
      `
        SELECT DISTINCT p.id_permiso, p.codigo
        FROM (
          SELECT rp.id_permiso
          FROM usuario_roles ur
          JOIN rol_permisos rp ON rp.id_rol = ur.id_rol
          WHERE ur.id_usuario = ?
          UNION
          SELECT up.id_permiso
          FROM usuario_permisos up
          WHERE up.id_usuario = ?
        ) x
        JOIN permisos p ON p.id_permiso = x.id_permiso
        ORDER BY p.codigo
      `,
      [id_usuario, id_usuario]
    );

    return {
      roles,
      directPermissions: directPerms,
      effectivePermissions: effectivePerms
    };
  }

  async setUserRoles(id_usuario, roleIds) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("DELETE FROM usuario_roles WHERE id_usuario = ?", [id_usuario]);

      for (const id_rol of roleIds) {
        await conn.execute(
          "INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)",
          [id_usuario, id_rol]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async setUserDirectPermissions(id_usuario, permissionIds) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("DELETE FROM usuario_permisos WHERE id_usuario = ?", [id_usuario]);

      for (const id_permiso of permissionIds) {
        await conn.execute(
          "INSERT INTO usuario_permisos (id_usuario, id_permiso) VALUES (?, ?)",
          [id_usuario, id_permiso]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

export default new RbacModel();

