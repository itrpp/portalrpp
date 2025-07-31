import fs from 'fs';
import path from 'path';
import { config } from '../config';

// สร้างโฟลเดอร์ logs ถ้ายังไม่มี
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// สร้าง write stream สำหรับ log file
const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get current log level
const getCurrentLogLevel = (): LogLevel => {
  const level = config.logLevel.toLowerCase() as LogLevel;
  return LOG_LEVELS[level] !== undefined ? level : 'info';
};

// Format log message
const formatMessage = (level: LogLevel, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

// Write to console and file
const writeLog = (level: LogLevel, message: string, meta?: any) => {
  const formattedMessage = formatMessage(level, message, meta);
  
  // Write to console
  if (process.env['NODE_ENV'] !== 'test') {
    console.log(formattedMessage);
  }
  
  // Write to file
  logStream.write(formattedMessage + '\n');
};

// Logger class
class Logger {
  private currentLevel: LogLevel;

  constructor() {
    this.currentLevel = getCurrentLogLevel();
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.currentLevel];
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      writeLog('error', message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      writeLog('warn', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      writeLog('info', message, meta);
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      writeLog('debug', message, meta);
    }
  }

  // Specialized logging methods
  revenue(operation: string, revenueId: string, amount: number, meta?: any): void {
    this.info(`Revenue ${operation}: ID=${revenueId}, Amount=${amount}`, meta);
  }

  report(generation: string, reportId: string, reportType: string, meta?: any): void {
    this.info(`Report ${generation}: ID=${reportId}, Type=${reportType}`, meta);
  }

  api(method: string, path: string, statusCode: number, duration: number, meta?: any): void {
    this.info(`API ${method} ${path} - ${statusCode} (${duration}ms)`, meta);
  }

  database(operation: string, table: string, duration: number, meta?: any): void {
    this.info(`Database ${operation} on ${table} (${duration}ms)`, meta);
  }

  security(event: string, userId?: string, ip?: string, meta?: any): void {
    this.warn(`Security ${event}${userId ? ` - User: ${userId}` : ''}${ip ? ` - IP: ${ip}` : ''}`, meta);
  }
}

// Export singleton instance
export const logger = new Logger();

// Graceful shutdown
process.on('beforeExit', () => {
  logStream.end();
});

process.on('SIGINT', () => {
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logStream.end();
  process.exit(0);
}); 
