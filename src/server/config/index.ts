// Server-only configuration file - contains sensitive credentials
// This file should never be imported in client-side code

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Database configuration - server-only
// This contains sensitive credentials that should not be exposed to the browser
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'network_monitor',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// Server configuration
export const serverConfig = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  host: process.env.SERVER_HOST || 'localhost',
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

// Log configuration
export const logConfig = {
  level: (process.env.LOG_LEVEL || 'debug') as 'info' | 'warn' | 'error' | 'debug',
};

// API configuration
export const apiConfig = {
  baseUrl: process.env.VITE_API_BASE_URL || `http://localhost:${serverConfig.port}/api`,
};

// WebSocket configuration
export const wsConfig = {
  baseUrl: process.env.VITE_WS_BASE_URL || `ws://localhost:${serverConfig.port}`,
};