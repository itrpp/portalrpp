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
    timestamp: new Date().toISOString(),
  });
};

export const logBatchProcessing = (batchId: string, status: string, meta?: any) => {
  logger.info('Batch processing', { 
    batchId, 
    status,
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  });
};

export const logBatchError = (batchId: string, error: Error, meta?: any) => {
  logger.error('Batch error', {
    batchId,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// DATABASE OPERATIONS LOGGING
// ========================================

export const logDatabaseOperation = (operation: string, table: string, meta?: any) => {
  logger.info('Database operation', {
    operation,
    table,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logDatabaseError = (operation: string, table: string, error: Error) => {
  logger.error('Database error', {
    operation,
    table,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
};

export const logDatabaseQuery = (query: string, params: any, duration: number) => {
  logger.debug('Database query', {
    query,
    params,
    duration,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// VALIDATION LOGGING
// ========================================

export const logValidationStart = (filename: string, fileType: string) => {
  logger.info('Validation started', {
    filename,
    fileType,
    timestamp: new Date().toISOString(),
  });
};

export const logValidationError = (filename: string, errors: any[]) => {
  logger.warn('Validation errors', {
    filename,
    errorCount: errors.length,
    errors,
    timestamp: new Date().toISOString(),
  });
};

export const logValidationWarning = (filename: string, warnings: string[]) => {
  logger.warn('Validation warnings', {
    filename,
    warningCount: warnings.length,
    warnings,
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  });
};

export const logMemoryUsage = (usage: NodeJS.MemoryUsage) => {
  logger.info('Memory usage', {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    timestamp: new Date().toISOString(),
  });
};

export const logCpuUsage = (usage: number) => {
  logger.info('CPU usage', {
    usage,
    timestamp: new Date().toISOString(),
  });
};

export const logDiskUsage = (usage: any) => {
  logger.info('Disk usage', {
    ...usage,
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  });
};

export const logApiError = (method: string, url: string, error: Error, statusCode?: number) => {
  logger.error('API Error', {
    method,
    url,
    statusCode,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
};

export const logApiResponse = (method: string, url: string, statusCode: number, responseSize: number) => {
  logger.info('API Response', {
    method,
    url,
    statusCode,
    responseSize,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// SECURITY LOGGING
// ========================================

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logAuthenticationAttempt = (userId: string, success: boolean, ipAddress: string) => {
  logger.info('Authentication attempt', {
    userId,
    success,
    ipAddress,
    timestamp: new Date().toISOString(),
  });
};

export const logAuthorizationCheck = (userId: string, resource: string, allowed: boolean) => {
  logger.info('Authorization check', {
    userId,
    resource,
    allowed,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// FILE STORAGE LOGGING
// ========================================

export const logFileStorage = (operation: string, filePath: string, meta?: any) => {
  logger.info('File storage operation', {
    operation,
    filePath,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logFileBackup = (sourcePath: string, backupPath: string) => {
  logger.info('File backup created', {
    sourcePath,
    backupPath,
    timestamp: new Date().toISOString(),
  });
};

export const logFileCleanup = (filePath: string, reason: string) => {
  logger.info('File cleanup', {
    filePath,
    reason,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// STATISTICS LOGGING
// ========================================

export const logStatisticsUpdate = (type: string, data: any) => {
  logger.info('Statistics updated', {
    type,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const logReportGeneration = (reportType: string, filename: string, meta?: any) => {
  logger.info('Report generated', {
    reportType,
    filename,
    timestamp: new Date().toISOString(),
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
    timestamp: new Date().toISOString(),
  });
};

export const logPerformanceIssue = (operation: string, duration: number, threshold: number) => {
  logger.warn('Performance issue detected', {
    operation,
    duration,
    threshold,
    timestamp: new Date().toISOString(),
  });
};

export const logResourceUsage = (resource: string, usage: number, limit: number) => {
  logger.info('Resource usage', {
    resource,
    usage,
    limit,
    percentage: (usage / limit) * 100,
    timestamp: new Date().toISOString(),
  });
};

export default logger; 