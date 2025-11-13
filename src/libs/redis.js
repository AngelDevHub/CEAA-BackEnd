import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis conectado correctamente'));
redisClient.on('ready', () => console.log('Redis listo para usar'));

await redisClient.connect();

export default redisClient;
