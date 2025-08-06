// ========================================
// REVENUE SERVICE LOGGER
// ========================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from '@/config';

// สร้าง log directory ถ้ายังไม่มี
const logDir = path.resolve(config.logging.filePath);

// สร้าง Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'revenue-service' },
  transports: [
    // Console transport สำหรับ development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    
    // File transport สำหรับ error logs
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    
    // File transport สำหรับ combined logs
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// ถ้าไม่ใช่ production ให้เพิ่ม console transport
if (config.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}

// Logger utility functions
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logFileUpload = (filename: string, fileSize: number, fileType: string) => {
  logger.info('File uploaded', {
    filename,
    fileSize,
    fileType,
    timestamp: new Date().toISOString(),
  });
};

export const logFileValidation = (
  filename: string,
  isValid: boolean,
  errors: string[],
  warnings: string[],
) => {
  logger.info('File validation completed', {
    filename,
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
  });
};

export const logFileProcessing = (
  filename: string,
  success: boolean,
  processingTime: number,
  recordCount: number,
) => {
  logger.info('File processing completed', {
    filename,
    success,
    processingTime,
    recordCount,
  });
};

export const logServiceHealth = (health: any) => {
  logger.info('Service health check', health);
};

export const logApiRequest = (method: string, url: string, statusCode: number, responseTime: number) => {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    responseTime,
  });
};

export const logApiError = (method: string, url: string, error: Error, statusCode?: number) => {
  logger.error('API Error', {
    method,
    url,
    statusCode,
    error: error.message,
    stack: error.stack,
  });
};

export default logger; 