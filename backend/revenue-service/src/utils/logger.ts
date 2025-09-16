// ========================================
// REVENUE SERVICE LOGGER
// ========================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from '@/config';
import { getLogTimestamp } from './dateUtils';

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

// ========================================
// BASIC LOGGING FUNCTIONS
// ========================================

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

// ========================================
// FILE OPERATIONS LOGGING
// ========================================

export const logFileUpload = (filename: string, fileSize: number, fileType: string) => {
  logger.info('File uploaded', {
    filename,
    fileSize,
    fileType,
    timestamp: getLogTimestamp(),
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

// ========================================
// BATCH OPERATIONS LOGGING
// ========================================

export const logBatchCreation = (batchId: string, data: any) => {
  logger.info('Batch created', { 
    batchId, 
    batchName: data.batchName,
    userId: data.userId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: getLogTimestamp(),
  });
};

export const logBatchProcessing = (batchId: string, status: string, meta?: any) => {
  logger.info('Batch processing', { 
    batchId, 
    status,
    timestamp: getLogTimestamp(),
    ...meta,
  });
};

export const logBatchCompletion = (batchId: string, result: any) => {
  logger.info('Batch completed', {
    batchId,
    totalFiles: result.totalFiles,
    successFiles: result.successFiles,
    errorFiles: result.errorFiles,
    totalRecords: result.totalRecords,
    processingTime: result.processingTime,
    success: result.success,
    timestamp: getLogTimestamp(),
  });
};

export const logBatchError = (batchId: string, error: Error, meta?: any) => {
  logger.error('Batch error', {
    batchId,
    error: error.message,
    stack: error.stack,
    timestamp: getLogTimestamp(),
    ...meta,
  });
};

export const logBatchProgress = (batchId: string, progress: any) => {
  logger.info('Batch progress', {
    batchId,
    currentFile: progress.currentFile,
    totalFiles: progress.totalFiles,
    progress: progress.progress,
    status: progress.status,
    timestamp: getLogTimestamp(),
  });
};

export const logBatchFileProcessing = (batchId: string, filename: string, result: any) => {
  logger.info('Batch file processing', {
    batchId,
    filename,
    success: result.success,
    processingTime: result.processingTime,
    recordCount: result.recordCount,
    errors: result.errors,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// DATABASE OPERATIONS LOGGING
// ========================================

export const logDatabaseOperation = (operation: string, table: string, meta?: any) => {
  logger.info('Database operation', {
    operation,
    table,
    timestamp: getLogTimestamp(),
    ...meta,
  });
};

export const logDatabaseError = (operation: string, table: string, error: Error) => {
  logger.error('Database error', {
    operation,
    table,
    error: error.message,
    stack: error.stack,
    timestamp: getLogTimestamp(),
  });
};

export const logDatabaseQuery = (query: string, params: any, duration: number) => {
  logger.debug('Database query', {
    query,
    params,
    duration,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// VALIDATION LOGGING
// ========================================

export const logValidationStart = (filename: string, fileType: string) => {
  logger.info('Validation started', {
    filename,
    fileType,
    timestamp: getLogTimestamp(),
  });
};

export const logValidationError = (filename: string, errors: any[]) => {
  logger.warn('Validation errors', {
    filename,
    errorCount: errors.length,
    errors,
    timestamp: getLogTimestamp(),
  });
};

export const logValidationWarning = (filename: string, warnings: string[]) => {
  logger.warn('Validation warnings', {
    filename,
    warningCount: warnings.length,
    warnings,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// SYSTEM MONITORING LOGGING
// ========================================

export const logServiceHealth = (health: any) => {
  logger.info('Service health check', health);
};

export const logSystemMetrics = (metrics: any) => {
  logger.info('System metrics', {
    ...metrics,
    timestamp: getLogTimestamp(),
  });
};

export const logMemoryUsage = (usage: NodeJS.MemoryUsage) => {
  logger.info('Memory usage', {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    timestamp: getLogTimestamp(),
  });
};

export const logCpuUsage = (usage: number) => {
  logger.info('CPU usage', {
    usage,
    timestamp: getLogTimestamp(),
  });
};

export const logDiskUsage = (usage: any) => {
  logger.info('Disk usage', {
    ...usage,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// API REQUEST LOGGING
// ========================================

export const logApiRequest = (method: string, url: string, statusCode: number, responseTime: number) => {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    responseTime,
    timestamp: getLogTimestamp(),
  });
};

export const logApiError = (method: string, url: string, error: Error, statusCode?: number) => {
  logger.error('API Error', {
    method,
    url,
    statusCode,
    error: error.message,
    stack: error.stack,
    timestamp: getLogTimestamp(),
  });
};

export const logApiResponse = (method: string, url: string, statusCode: number, responseSize: number) => {
  logger.info('API Response', {
    method,
    url,
    statusCode,
    responseSize,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// SECURITY LOGGING
// ========================================

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: getLogTimestamp(),
  });
};

export const logAuthenticationAttempt = (userId: string, success: boolean, ipAddress: string) => {
  logger.info('Authentication attempt', {
    userId,
    success,
    ipAddress,
    timestamp: getLogTimestamp(),
  });
};

export const logAuthorizationCheck = (userId: string, resource: string, allowed: boolean) => {
  logger.info('Authorization check', {
    userId,
    resource,
    allowed,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// FILE STORAGE LOGGING
// ========================================

export const logFileStorage = (operation: string, filePath: string, meta?: any) => {
  logger.info('File storage operation', {
    operation,
    filePath,
    timestamp: getLogTimestamp(),
    ...meta,
  });
};

export const logFileBackup = (sourcePath: string, backupPath: string) => {
  logger.info('File backup created', {
    sourcePath,
    backupPath,
    timestamp: getLogTimestamp(),
  });
};

export const logFileCleanup = (filePath: string, reason: string) => {
  logger.info('File cleanup', {
    filePath,
    reason,
    timestamp: getLogTimestamp(),
  });
};

// ========================================
// STATISTICS LOGGING
// ========================================

export const logStatisticsUpdate = (type: string, data: any) => {
  logger.info('Statistics updated', {
    type,
    ...data,
    timestamp: getLogTimestamp(),
  });
};

export const logReportGeneration = (reportType: string, filename: string, meta?: any) => {
  logger.info('Report generated', {
    reportType,
    filename,
    timestamp: getLogTimestamp(),
    ...meta,
  });
};

// ========================================
// ERROR TRACKING
// ========================================

export const logErrorWithContext = (error: Error, context: any) => {
  logger.error('Error with context', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: getLogTimestamp(),
  });
};

export const logPerformanceIssue = (operation: string, duration: number, threshold: number) => {
  logger.warn('Performance issue detected', {
    operation,
    duration,
    threshold,
    timestamp: getLogTimestamp(),
  });
};

export const logResourceUsage = (resource: string, usage: number, limit: number) => {
  logger.info('Resource usage', {
    resource,
    usage,
    limit,
    percentage: (usage / limit) * 100,
    timestamp: getLogTimestamp(),
  });
};

export default logger; 