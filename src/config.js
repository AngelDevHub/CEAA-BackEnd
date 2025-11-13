import {config} from 'dotenv'

config()

export const PORT        = process.env.PORT        || 3000
export const DB_USER     = process.env.DB_USER     || 'root'
export const DB_PASSWORD = process.env.DB_PASSWORD || 'gBZTQBFcZuLryEyfgjEqKSJPvrNtcwdd'
export const DB_HOST     = process.env.DB_HOST     || 'hopper.proxy.rlwy.net'
export const DB_DATABASE = process.env.DB_DATABASE || 'ceaa'
export const DB_PORT     = process.env.DB_PORT     || 27544
export const TOKEN_SECRET = process.env.TOKEN_SECRET || 'f742cbb274a2a65c3ebe511b2e027184b24169342d4b6cf03dbeac8a042dfb7501105bdbf563aaa9ed0ca5cde1e1b4972e7f35b0135191cbd5e0aa7d8fe3f175'
export const NODE_ENV= process.env.NODE_ENV || 'development'
export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_access'
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
export const COOKIE_SECRET = process.env.COOKIE_SECRET

export const FIREBASE_PROJECT_ID  = process.env.FIREBASE_PROJECT_ID;
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
export const FIREBASE_DB_URL      = process.env.FIREBASE_DB_URL;

export const REDIS_URL = process.env.REDIS_URL;