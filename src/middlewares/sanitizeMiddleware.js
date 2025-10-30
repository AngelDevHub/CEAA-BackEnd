import sanitizeHtml from 'sanitize-html';
import { body, validationResult } from 'express-validator';

export const sanitizeInput = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {},
          textFilter: (text) => {
            // Remover caracteres potencialmente peligrosos adicionales
            return text.replace(/[<>\(\)\\\[\]{};]/g, '');
          }
        }).trim();
      }
    });
  }
  
  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeHtml(req.query[key], {
          allowedTags: [],
          allowedAttributes: {}
        }).trim();
      }
    });
  }

  // Sanitizar params de URL
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeHtml(req.params[key], {
          allowedTags: [],
          allowedAttributes: {}
        }).trim();
      }
    });
  }
  
  next();
};

export const validateLogin = [
  body('correo').isEmail().normalizeEmail(),
  body('clave').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];

export const validateRegister = [
  body('nombre')
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres')
    .trim()
    .escape(),
  body('correo')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('clave')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Errores de validación',
        errors: errors.array() 
      });
    }
    next();
  }
];

export const validateUpdateProfile = [
  body('nombre')
    .optional()
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres')
    .trim()
    .escape(),
  body('correo')
    .optional()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('clave_actual')
    .optional()
    .isLength({ min: 6 }).withMessage('La contraseña actual debe tener al menos 6 caracteres'),
  body('nueva_clave')
    .optional()
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Errores de validación',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Middleware para validar IDs en parámetros
export const validateId = [
  body('id').optional().isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];

export default { 
  sanitizeInput, 
  validateLogin, 
  validateRegister, 
  validateUpdateProfile,
  validateId 
};