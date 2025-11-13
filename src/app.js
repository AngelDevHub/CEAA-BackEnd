import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/routes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitizeInput } from './middlewares/sanitizeMiddleware.js';

const app = express();
app.set('trust proxy', 1); // ✅ IMPORTANTE para Railway/Vercel

// -----------------------------
// 🔹 CORS configurado CORRECTAMENTE - PRIMERO
// -----------------------------
const allowedOrigins = [
    "http://localhost:5173",
    "https://ceaa-front-end.vercel.app"
];

// 🔥 CORS CONFIGURACIÓN CRÍTICA - ACTUALIZADA
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (como mobile apps, Postman, o server-to-server)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('🚫 Origen bloqueado por CORS:', origin);
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true, // ✅ ESTO ES ESENCIAL para cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept',
        'X-CSRF-Token',
        'Cookie',
        'Set-Cookie'
    ],
    exposedHeaders: [
        'Set-Cookie',
        'Cookie',
        'Authorization'
    ],
    maxAge: 86400 // Preflight cache por 24 horas
}));

// -----------------------------
// 🔹 Cookie parser - DEBE ir después de CORS
// -----------------------------
app.use(cookieParser(process.env.COOKIE_SECRET || 'fallback-secret'));

// -----------------------------
// 🔹 Body parser
// -----------------------------
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({
                success: false,
                message: 'JSON malformado'
            });
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// -----------------------------
// 🔹 Rate Limiters
// -----------------------------
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP, intente nuevamente en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Demasiados intentos de login, intente nuevamente en 15 minutos.'
    },
    skipSuccessfulRequests: true
});

app.use(globalLimiter);

// -----------------------------
// 🔹 Seguridad con Helmet (configurado para cookies)
// -----------------------------
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ Para cookies cross-domain
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// -----------------------------
// 🔹 Sanitización de inputs
// -----------------------------
app.use(sanitizeInput);

// -----------------------------
// 🔹 Middleware para debug de cookies (solo desarrollo)
// -----------------------------
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log('🍪 Cookies recibidas:', req.cookies);
        console.log('🔐 Cookies firmadas recibidas:', req.signedCookies);
        console.log('🌐 Origen de la request:', req.headers.origin);
        console.log('📧 User-Agent:', req.headers['user-agent']);
        next();
    });
}

// -----------------------------
// 🔹 Cabeceras de seguridad adicionales
// -----------------------------
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Cabeceras críticas para cookies cross-domain
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    res.removeHeader('X-Powered-By');
    next();
});

// -----------------------------
// 🔹 Health check mejorado
// -----------------------------
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        cookiesEnabled: true
    });
});

// Health check específico para CORS
app.options('/health', cors()); // Preflight para health check

// -----------------------------
// 🔹 Preflight handler global
// -----------------------------
app.options('*', cors()); // Manejar todas las preflight requests

// -----------------------------
// 🔹 Rate limiters específicos
// -----------------------------
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/registro', authLimiter);

// -----------------------------
// 🔹 Rutas principales
// -----------------------------
app.use("/api", routes);

// -----------------------------
// 🔹 Manejo de errores MEJORADO
// -----------------------------
app.use((err, req, res, next) => {
    if (err.message === 'No permitido por CORS') {
        console.log('🚫 Error CORS:', req.headers.origin);
        return res.status(403).json({
            success: false,
            message: 'Origen no permitido',
            allowedOrigins: allowedOrigins
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }
    
    next(err);
});

// 404 handler
app.use((req, res) => {
    console.log('❌ Ruta no encontrada:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('💥 Error global:', err);

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV !== 'production' && { 
            stack: err.stack,
            details: err.message 
        })
    });
});

export default app;