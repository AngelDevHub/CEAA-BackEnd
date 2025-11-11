import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.'
  },
  handler: async (req, res, next) => {
    const ip = req.ip;
    const { correo } = req.body;
    const ipKey = `failed_attempts_ip:${ip}`;
    const emailKey = `failed_attempts_email:${correo}`;
    
    try {

      const ipAttempts = await redis.incr(ipKey);
      const emailAttempts = await redis.incr(emailKey);
      

      if (ipAttempts === 1) await redis.expire(ipKey, 900);
      if (emailAttempts === 1) await redis.expire(emailKey, 900);
      

      if (emailAttempts >= 5) {
        await redis.setex(`account_lock:${correo}`, 1800, 'locked');
      }
      
      if (ipAttempts >= 5) {
        return res.status(429).json({
          success: false,
          message: 'IP bloqueada temporalmente por demasiados intentos fallidos',
          unlockTime: '15 minutos'
        });
      }
      res.status(429).json({
        success: false,
        message: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.'
      });
      
    } catch (error) {
      console.error('Error en rate limiting:', error);
      next(error);
    }
  }
});

export const checkAccountLock = async (req, res, next) => {
  const { correo } = req.body;
  
  if (!correo) {
    return next();
  }
  
  const lockKey = `account_lock:${correo}`;
  
  try {
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Cuenta temporalmente bloqueada por seguridad',
        unlockTime: '30 minutos'
      });
    }
    next();
  } catch (error) {
    console.error('Error verificando bloqueo de cuenta:', error);
    next(error);
  }
};

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP. Intente nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Demasiados intentos de recuperación de contraseña. Intente nuevamente en 1 hora.'
  }
});

export const clearFailedAttempts = async (ip, correo) => {
  try {
    await redis.del(`failed_attempts_ip:${ip}`);
    await redis.del(`failed_attempts_email:${correo}`);
    await redis.del(`account_lock:${correo}`);
  } catch (error) {
    console.error('Error limpiando intentos fallidos:', error);
  }
};

export default { 
  loginRateLimiter, 
  checkAccountLock, 
  generalRateLimiter, 
  passwordResetLimiter,
  clearFailedAttempts 
};