// Frontend logger service
// Supports different log levels and can be extended for remote logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log level priority: debug < info < warn < error
const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

interface LoggerOptions {
  level: LogLevel;
  enabled: boolean;
}

// Default logger options
const defaultOptions: LoggerOptions = {
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
  enabled: true
};

// Logger service class
export class LoggerService {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    // Merge provided options with default options
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Format log message
   */
  private formatLogMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      try {
        logMessage += ` ${JSON.stringify(data)}`;
      } catch (error) {
        logMessage += ` [Error stringifying data: ${(error as Error).message}]`;
      }
    }
    
    return logMessage;
  }

  /**
   * Log a message
   */
  public log(level: LogLevel, message: string, data?: any): void {
    // Only log messages if logging is enabled and level is appropriate
    if (this.options.enabled && logLevelPriority[level] >= logLevelPriority[this.options.level]) {
      const formattedMessage = this.formatLogMessage(level, message, data);
      
      // Use different console methods based on log level
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Enable or disable logging
   */
  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.options.level = level;
  }
}

// Export singleton instance
export const loggerService = new LoggerService();

// Export convenience methods for easy use
export const logger = loggerService.log.bind(loggerService);
export const debug = loggerService.debug.bind(loggerService);
export const info = loggerService.info.bind(loggerService);
export const warn = loggerService.warn.bind(loggerService);
export const error = loggerService.error.bind(loggerService);
