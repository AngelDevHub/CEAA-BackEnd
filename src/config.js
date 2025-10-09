import {config} from 'dotenv'

config()

export const PORT        = process.env.PORT        || 3000
export const DB_USER     = process.env.DB_USER     || 'root'
export const DB_PASSWORD = process.env.DB_PASSWORD || 'admin'
export const DB_HOST     = process.env.DB_HOST     || 'localhost'
export const DB_DATABASE = process.env.DB_DATABASE || 'ceaa'
export const DB_PORT     = process.env.DB_PORT     || 3306
export const TOKEN_SECRET = process.env.TOKEN_SECRET || 'f742cbb274a2a65c3ebe511b2e027184b24169342d4b6cf03dbeac8a042dfb7501105bdbf563aaa9ed0ca5cde1e1b4972e7f35b0135191cbd5e0aa7d8fe3f175'
export const NODE_ENV= process.env.NODE_ENV || 'development'