import express from 'express';
import UsuariosController from '../../controllers/usuarios.controller.js';
import { validateToken } from '../../middlewares/validateToken.js';

const router = express.Router();

// ✅ TODAS estas rutas ahora serán /api/usuarios/...
router.get('/', validateToken, UsuariosController.getAll);          // GET /api/usuarios
router.get('/:id', validateToken, UsuariosController.getById);      // GET /api/usuarios/:id
router.post('/', validateToken, UsuariosController.create);         // POST /api/usuarios
router.put('/:id', validateToken, UsuariosController.update);       // PUT /api/usuarios/:id
router.delete('/:id', validateToken, UsuariosController.delete);    // DELETE /api/usuarios/:id

export default router;