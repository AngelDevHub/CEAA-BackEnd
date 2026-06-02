import {config} from 'dotenv'

config()

const isProd = process.env.NODE_ENV === 'production'
const requireProdEnv = (key) => {
  const value = process.env[key]
  if (isProd && !value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

export const NODE_ENV = process.env.NODE_ENV || 'development'

export const PORT = process.env.PORT || 3000

export const DB_USER = process.env.DB_USER || 'root'
export const DB_PASSWORD = requireProdEnv('DB_PASSWORD') || process.env.DB_PASSWORD
export const DB_HOST = process.env.DB_HOST || 'hopper.proxy.rlwy.net'
export const DB_DATABASE = process.env.DB_DATABASE || 'ceaa'
export const DB_PORT = process.env.DB_PORT || 27544

export const JWT_SECRET = requireProdEnv('JWT_SECRET') || process.env.JWT_SECRET || 'dev_secret_access'
export const JWT_REFRESH_SECRET = requireProdEnv('JWT_REFRESH_SECRET') || process.env.JWT_REFRESH_SECRET
export const COOKIE_SECRET = requireProdEnv('COOKIE_SECRET') || process.env.COOKIE_SECRET || 'dev_cookie_secret'

export const FIREBASE_PROJECT_ID  = process.env.FIREBASE_PROJECT_ID;
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
export const FIREBASE_DB_URL      = process.env.FIREBASE_DB_URL;

export const REDIS_URL = process.env.REDIS_URL;
