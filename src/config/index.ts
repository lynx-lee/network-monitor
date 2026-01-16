// Client-side configuration file - only contains safe, non-sensitive information
// This file can be imported in client-side code

// Frontend service configuration - client-safe
export const clientConfig = {
  port: parseInt(import.meta.env.VITE_CLIENT_PORT || '5173', 10),
  host: import.meta.env.VITE_CLIENT_HOST || 'localhost',
};

// API configuration - client-safe
export const apiConfig = {
  // Use relative URL to connect to the same host as the current page
  baseUrl: import.meta.env.VITE_API_URL || '/api',
};

// WebSocket configuration - client-safe (not used directly, socket.io uses automatic URL detection)
export const wsConfig = {
  baseUrl: import.meta.env.VITE_WS_URL || '',
};

// Client-side theme configuration
export const defaultTheme = {
  light: 'light',
  dark: 'dark',
  system: 'system',
};

// Default ping interval in milliseconds
export const defaultPingInterval = 5000;

// Default port rates in Mbps
export const defaultPortRates = [100, 1000, 2500, 10000];

