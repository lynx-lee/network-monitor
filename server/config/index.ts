// Server-only configuration file
// Database config is managed by configService.ts - do not duplicate here

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

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