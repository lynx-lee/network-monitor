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
  private rotationIndex: number = 0; // Counter to disambiguate same-day rotated files

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
      const suffix = this.rotationIndex > 0 ? `.${this.rotationIndex}` : '';
      this.logFileName = path.join(this.options.logDirectory, `network-monitor-${timestamp}${suffix}.log`);
      
      // Create write stream in append mode
      this.logFileStream = fs.createWriteStream(this.logFileName, { flags: 'a' });
      
      this.logFileStream.on('error', (err) => {
        console.error('Log file stream error:', err);
        this.options.output = 'console';
      });
    } catch (error) {
      console.error('Error initializing log file:', error);
      // Fallback to console only if file initialization fails
      this.options.output = 'console';
    }
  }

  /**
   * Check if the current log file needs rotation (size exceeded).
   * If so, close the current stream and open a new one with an incremented index.
   */
  private checkRotation(): void {
    if (this.options.output === 'console' || !this.logFileName) {
      return;
    }

    try {
      if (!fs.existsSync(this.logFileName)) return;

      const stats = fs.statSync(this.logFileName);
      if (stats.size > this.options.maxFileSize) {
        // Close current stream
        if (this.logFileStream) {
          this.logFileStream.end();
          this.logFileStream = null;
        }

        // Increment rotation index so a new file name is generated
        this.rotationIndex++;
        this.initializeLogFile();
      }

      // Clean up oldest files if we exceed maxFiles
      this.cleanOldFiles();
    } catch (error) {
      console.error('Error during log rotation check:', error);
    }
  }

  /**
   * Remove oldest log files if total count exceeds maxFiles
   */
  private cleanOldFiles(): void {
    try {
      const logFiles = fs.readdirSync(this.options.logDirectory)
        .filter(file => file.startsWith('network-monitor-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.options.logDirectory, file),
          mtime: fs.statSync(path.join(this.options.logDirectory, file)).mtime.getTime()
        }))
        .sort((a, b) => a.mtime - b.mtime);

      while (logFiles.length > this.options.maxFiles) {
        const oldest = logFiles.shift();
        if (oldest && oldest.path !== this.logFileName) {
          fs.unlinkSync(oldest.path);
        } else {
          break; // Don't delete the current log file
        }
      }
    } catch (error) {
      console.error('Error cleaning old log files:', error);
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
          // Periodically check rotation (every write, statSync is cheap)
          this.checkRotation();
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
   * Close log file stream gracefully (flush pending writes first)
   */
  public close(): void {
    if (this.logFileStream) {
      // end() flushes pending writes before closing, unlike close()
      this.logFileStream.end();
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
