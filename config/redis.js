// Redis Mock para desarrollo - No requiere servidor Redis instalado
class RedisMock {
    constructor() {
        this.data = new Map();
        this.expirations = new Map();
    }

    async get(key) {
        this.checkExpiration(key);
        return this.data.get(key) || null;
    }

    async set(key, value) {
        this.data.set(key, value);
        return 'OK';
    }

    async setex(key, seconds, value) {
        this.data.set(key, value);
        const expirationTime = Date.now() + (seconds * 1000);
        this.expirations.set(key, expirationTime);
        return 'OK';
    }

    async del(key) {
        const deleted = this.data.delete(key);
        this.expirations.delete(key);
        return deleted ? 1 : 0;
    }

    async incr(key) {
        const current = parseInt(await this.get(key)) || 0;
        const newValue = current + 1;
        await this.set(key, newValue.toString());
        return newValue;
    }

    async expire(key, seconds) {
        if (this.data.has(key)) {
            const expirationTime = Date.now() + (seconds * 1000);
            this.expirations.set(key, expirationTime);
            return 1;
        }
        return 0;
    }

    async keys(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keys = Array.from(this.data.keys());
        return keys.filter(key => regex.test(key));
    }

    checkExpiration(key) {
        const expiration = this.expirations.get(key);
        if (expiration && Date.now() > expiration) {
            this.data.delete(key);
            this.expirations.delete(key);
        }
    }

    // Eventos simulados para compatibilidad
    on(event, callback) {
        if (event === 'connect') {
            setTimeout(callback, 100);
        }
        return this;
    }
}

// Exportar instancia mock
const redis = new RedisMock();
export default redis;