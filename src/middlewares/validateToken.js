import { verifyAccessToken } from '../libs/jwt.js';

// Middleware para validar Access Token
export const validateToken = (req, res, next) => {
  // REGLA 1: Algo que sabes (token)
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
    // REGLA 2: Verificación criptográfica
    const decoded = verifyAccessToken(token);

    // REGLA 3: Información del usuario
    req.user = decoded;

    // Verificar si el token está próximo a expirar
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    if (timeUntilExpiry < 300) { // 5 minutos
      res.set('Token-Expiry-Soon', 'true');
    }

    next();
  } catch (error) {
    console.error('Error validando token:', error.message);

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

// Middleware opcional para tokens (no bloquea si no hay token)
export const optionalToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.signedCookies?.accessToken || 
                req.cookies?.accessToken;

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      console.log('Token opcional inválido:', error.message);
    }
  }

  next();
};

// Middleware para verificar roles de usuario
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

export default { 
  validateToken, 
  require2FA, 
  optionalToken, 
  requireRole 
};
