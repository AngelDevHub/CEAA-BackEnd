import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {});
redisClient.on('connect', () => {});
redisClient.on('ready', () => {});

await redisClient.connect();

export default redisClient;
