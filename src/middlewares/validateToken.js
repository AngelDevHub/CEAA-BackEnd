import { verifyAccessToken } from '../libs/jwt.js';

export const validateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.signedCookies?.accessToken || 
                req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Acceso denegado. Token no proporcionado.' 
    });
  }

  try {

    const decoded = verifyAccessToken(token);

    req.user = decoded;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    if (timeUntilExpiry < 300) { // 5 minutos
      res.set('Token-Expiry-Soon', 'true');
    }

    next();
  } catch (error) {

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      success: false,
      message: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware para autenticación de dos factores
export const require2FA = (req, res, next) => {
  if (!req.user?.twoFactorVerified) {
    return res.status(403).json({
      success: false,
      message: 'Se requiere verificación de dos factores'
    });
  }
  next();
};

export const optionalToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.signedCookies?.accessToken || 
                req.cookies?.accessToken;

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      
    }
  }

  next();
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token requerido.'
      });
    }

    const userRole = req.user.role || 'user';

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token requerido.'
      });
    }

    const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        requiredPermission
      });
    }

    next();
  };
};

export const checkAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token requerido.'
      });
    }

    const permissions = new Set(Array.isArray(req.user.permissions) ? req.user.permissions : []);
    const ok = Array.isArray(requiredPermissions) && requiredPermissions.some(p => permissions.has(p));

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        requiredPermissions
      });
    }

    next();
  };
};

export default { 
  validateToken, 
  require2FA, 
  optionalToken, 
  requireRole,
  checkPermission,
  checkAnyPermission
};
