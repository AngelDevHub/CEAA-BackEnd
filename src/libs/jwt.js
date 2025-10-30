import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const createAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
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