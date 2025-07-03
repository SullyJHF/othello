import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || '3000';
export const ROOT_DIR = process.env.ROOT_DIR || path.resolve(__dirname, '../..');
export const HOST = process.env.HOST || 'localhost';
