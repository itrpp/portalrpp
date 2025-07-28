// ========================================
// Logging System สำหรับ API Gateway
// ========================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/index.js';
import { LogEntry } from '../types/index.js';

// ========================================
// LOG FORMATS
// ========================================

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  }),
);

// ========================================
// TRANSPORTS
// ========================================

const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: config.logging.level,
    format: consoleFormat,
  }),
);

// File transport สำหรับ production
if (config.environment === 'production' || config.logging.transports.includes('file')) {
  transports.push(
    new DailyRotateFile({
      filename: config.logging.filename,
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      level: config.logging.level,
      format: logFormat,
    }),
  );
}

// ========================================
// LOGGER INSTANCE
// ========================================

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

// ========================================
// LOGGING FUNCTIONS
// ========================================

export const logRequest = (req: any, res: any, responseTime: number): void => {
  const logEntry: LogEntry = {
    level: 'info',
    message: 'HTTP Request',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    statusCode: res.statusCode,
    responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    metadata: {
      query: req.query,
      params: req.params,
      headers: {
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
      },
    },
  };

  logger.info(logEntry);
};

export const logError = (error: Error, req?: any, context?: Record<string, any>): void => {
  const logEntry: LogEntry = {
    level: 'error',
    message: error.message,
    timestamp: new Date().toISOString(),
    requestId: req?.requestId,
    userId: req?.user?.id,
    path: req?.path,
    method: req?.method,
    userAgent: req?.get('User-Agent'),
    ip: req?.ip || req?.connection.remoteAddress,
    error,
    metadata: context,
  };

  logger.error(logEntry);
};

export const logServiceCall = (
  serviceName: string, 
  method: string, 
  path: string, 
  responseTime: number, 
  statusCode: number,
  error?: Error,
): void => {
  const logEntry: LogEntry = {
    level: error ? 'error' : 'info',
    message: `Service Call: ${serviceName}`,
    timestamp: new Date().toISOString(),
    path,
    method,
    statusCode,
    responseTime,
    error,
    metadata: {
      service: serviceName,
      target: `${method} ${path}`,
    },
  };

  if (error) {
    logger.error(logEntry);
  } else {
    logger.info(logEntry);
  }
};

export const logHealthCheck = (serviceName: string, status: string, responseTime: number, error?: Error): void => {
  const logEntry: LogEntry = {
    level: error ? 'error' : 'info',
    message: `Health Check: ${serviceName}`,
    timestamp: new Date().toISOString(),
    responseTime,
    error,
    metadata: {
      service: serviceName,
      status,
      healthCheck: true,
    },
  };

  if (error) {
    logger.error(logEntry);
  } else {
    logger.info(logEntry);
  }
};

export const logRateLimit = (ip: string, limit: number, remaining: number): void => {
  const logEntry: LogEntry = {
    level: 'warn',
    message: 'Rate Limit Exceeded',
    timestamp: new Date().toISOString(),
    ip,
    metadata: {
      limit,
      remaining,
      rateLimit: true,
    },
  };

  logger.warn(logEntry);
};

export const logCircuitBreaker = (serviceName: string, state: string, failures: number): void => {
  const logEntry: LogEntry = {
    level: 'warn',
    message: `Circuit Breaker: ${serviceName}`,
    timestamp: new Date().toISOString(),
    metadata: {
      service: serviceName,
      state,
      failures,
      circuitBreaker: true,
    },
  };

  logger.warn(logEntry);
};

export const logSecurity = (event: string, details: Record<string, any>): void => {
  const logEntry: LogEntry = {
    level: 'warn',
    message: `Security Event: ${event}`,
    timestamp: new Date().toISOString(),
    metadata: {
      securityEvent: true,
      event,
      ...details,
    },
  };

  logger.warn(logEntry);
};

// ========================================
// PERFORMANCE LOGGING
// ========================================

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>): void => {
  const logEntry: LogEntry = {
    level: 'info',
    message: `Performance: ${operation}`,
    timestamp: new Date().toISOString(),
    responseTime: duration,
    metadata: {
      performance: true,
      operation,
      ...metadata,
    },
  };

  logger.info(logEntry);
};

// ========================================
// DEBUG LOGGING
// ========================================

export const logDebug = (message: string, metadata?: Record<string, any>): void => {
  if (config.environment === 'development') {
    const logEntry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    logger.debug(logEntry);
  }
};

// ========================================
// STARTUP LOGGING
// ========================================

export const logStartup = (): void => {
  logger.info({
    level: 'info',
    message: 'API Gateway Starting',
    timestamp: new Date().toISOString(),
    metadata: {
      startup: true,
      environment: config.environment,
      port: config.port,
      services: Object.keys(config.services),
    },
  });
};

export const logShutdown = (): void => {
  logger.info({
    level: 'info',
    message: 'API Gateway Shutting Down',
    timestamp: new Date().toISOString(),
    metadata: {
      shutdown: true,
    },
  });
};

// ========================================
// EXPORT DEFAULT LOGGER
// ========================================

export default logger; 
