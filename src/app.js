import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/routes.js';
import helmet from "helmet";
import rateLimit from 'express-rate-limit';
import { sanitizeInput } from './middlewares/sanitizeMiddleware.js';

const app = express();

// Configuración de rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 peticiones por IP cada 15 minutos
    message: {
        success: false,
        message: 'Demasiadas peticiones desde esta IP, intente nuevamente en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting más estricto para login
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos de login
    message: {
        success: false,
        message: 'Demasiados intentos de login, intente nuevamente en 15 minutos.'
    },
    skipSuccessfulRequests: true // No contar las peticiones exitosas
});

app.use(globalLimiter);

// Configuración de Helmet más específica
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
);

// Parseo seguro de JSON con límite
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

// Orígenes permitidos
const allowedOrigins = [
    "http://localhost:5173",
    "https://vital-air.vercel.app"
];

// Configuración CORS mejorada
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS bloqueado para origen: ${origin}`);
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept'
    ],
    maxAge: 86400
}));

// Middleware de sanitización global
app.use(sanitizeInput);

// Cookie parser con firma
app.use(cookieParser(process.env.COOKIE_SECRET || 'fallback-secret'));

// Middleware de seguridad adicional
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    res.removeHeader('X-Powered-By');
    next();
});

// ✅ HEALTH CHECK PRIMERO (para monitoreo sin afectar rate limiting)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// ✅ RATE LIMITING ESPECÍFICO (después de health check)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/registro', authLimiter);

// Rutas principales
app.use("/api", routes);

// Manejo de errores CORS
app.use((err, req, res, next) => {
    if (err.message === 'No permitido por CORS') {
        return res.status(403).json({
            success: false,
            message: 'Origen no permitido'
        });
    }
    next(err);
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err);
    
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

export default app;