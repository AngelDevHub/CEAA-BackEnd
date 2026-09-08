import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '../config.js';


export const createAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '15m',
        issuer: 'ceaa-backend'
    });
};

export const createRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: '7d',
        issuer: 'ceaa-backend'
    });
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};