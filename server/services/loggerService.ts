import fs from 'fs';
import path from 'path';

// Log level type
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log level priority: debug < info < warn < error
const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Logger options interface
interface LoggerOptions {
  level: LogLevel;
  output: 'console' | 'file' | 'both';
  logDirectory: string;
  maxFileSize: number;
  maxFiles: number;
}

// Default logger options
const defaultOptions: LoggerOptions = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  output: 'both',
  logDirectory: process.env.LOG_DIR || './logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5
};

// Logger service class
export class LoggerService {
  private options: LoggerOptions;
  private logFileStream: fs.WriteStream | null = null;
  private logFileName: string = '';

  constructor(options: Partial<LoggerOptions> = {}) {
    // Merge provided options with default options
    this.options = { ...defaultOptions, ...options };
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Initialize log file stream
    this.initializeLogFile();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.options.logDirectory)) {
        fs.mkdirSync(this.options.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating log directory:', error);
      // Fallback to console only if directory creation fails
      this.options.output = 'console';
    }
  }

  /**
   * Initialize log file
   */
  private initializeLogFile(): void {
    if (this.options.output === 'console') {
      return;
    }

    try {
      // Create log file name with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      this.logFileName = path.join(this.options.logDirectory, `network-monitor-${timestamp}.log`);
      
      // Create write stream in append mode
      this.logFileStream = fs.createWriteStream(this.logFileName, { flags: 'a' });
      
      // Rotate logs if needed
      this.rotateLogs();
    } catch (error) {
      console.error('Error initializing log file:', error);
      // Fallback to console only if file initialization fails
      this.options.output = 'console';
    }
  }

  /**
   * Rotate logs if they exceed the maximum file size or number of files
   */
  private rotateLogs(): void {
    if (this.options.output === 'console') {
      return;
    }

    try {
      // Get all log files
      const logFiles = fs.readdirSync(this.options.logDirectory)
        .filter(file => file.startsWith('network-monitor-') && file.endsWith('.log'))
        .map(file => path.join(this.options.logDirectory, file))
        .sort((a, b) => {
          return fs.statSync(a).mtime.getTime() - fs.statSync(b).mtime.getTime();
        });

      // Delete oldest files if we exceed maxFiles
      while (logFiles.length > this.options.maxFiles) {
        const oldestFile = logFiles.shift();
        if (oldestFile) {
          fs.unlinkSync(oldestFile);
        }
      }

      // Check current log file size
      if (this.logFileName && fs.existsSync(this.logFileName)) {
        const stats = fs.statSync(this.logFileName);
        if (stats.size > this.options.maxFileSize) {
          // Close current stream
          if (this.logFileStream) {
            this.logFileStream.close();
            this.logFileStream = null;
          }
          
          // Initialize new log file
          this.initializeLogFile();
        }
      }
    } catch (error) {
      console.error('Error rotating logs:', error);
    }
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
    // Only log messages if their level is equal or higher than the configured level
    if (logLevelPriority[level] >= logLevelPriority[this.options.level]) {
      const formattedMessage = this.formatLogMessage(level, message, data);
      
      // Log to console if configured
      if (this.options.output === 'console' || this.options.output === 'both') {
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
      
      // Log to file if configured
      if ((this.options.output === 'file' || this.options.output === 'both') && this.logFileStream) {
        try {
          this.logFileStream.write(formattedMessage + '\n');
        } catch (error) {
          console.error('Error writing to log file:', error);
          // Fallback to console only if file writing fails
          this.options.output = 'console';
        }
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
   * Close log file stream
   */
  public close(): void {
    if (this.logFileStream) {
      this.logFileStream.close();
      this.logFileStream = null;
    }
  }
}

// Export singleton instance
export const loggerService = new LoggerService();

// Export convenience methods for backward compatibility
export const logger = loggerService.log.bind(loggerService);
export const debug = loggerService.debug.bind(loggerService);
export const info = loggerService.info.bind(loggerService);
export const warn = loggerService.warn.bind(loggerService);
export const error = loggerService.error.bind(loggerService);
