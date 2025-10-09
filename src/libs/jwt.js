import { TOKEN_SECRET } from '../config.js';
import jwt from 'jsonwebtoken';

export function createAccessToken(payload) {
    return new Promise((resolve, reject) => {
        if (!TOKEN_SECRET) {
            return reject(new Error("TOKEN_SECRET no está definido. Verifica tu configuración."));
        }

        jwt.sign(
            payload,
            TOKEN_SECRET,
            { expiresIn: "24h" },
            (err, token) => {
                if (err) {
                    console.error("Error al generar el token:", err);
                    return reject(err);
                }
                resolve(token);
            }
        );
    });
}
