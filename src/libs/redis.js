import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis conectado correctamente'));
redisClient.on('ready', () => console.log('Redis listo para usar'));

try {
    await redisClient.connect();
} catch (err) {
    console.error('💥 Fallo crítico: No se pudo conectar a Redis al inicio', err);
}

export default redisClient;
