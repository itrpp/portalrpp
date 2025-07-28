// ========================================
// Error Handling System สำหรับ API Gateway
// ========================================

import { Request, Response, NextFunction } from 'express';
import { logger, logError } from './logger.js';
import { config } from '../config/index.js';
import { ErrorResponse } from '../types/index.js';

// ========================================
// CUSTOM ERROR CLASSES
// ========================================

export class ApiGatewayError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ServiceUnavailableError extends ApiGatewayError {
  constructor(serviceName: string) {
    super(`${serviceName} service is unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class RateLimitError extends ApiGatewayError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class AuthenticationError extends ApiGatewayError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

export class AuthorizationError extends ApiGatewayError {
  constructor(message: string = 'Authorization failed') {
    super(message, 403, 'AUTHORIZATION_FAILED');
  }
}

export class ValidationError extends ApiGatewayError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_FAILED');
  }
}

export class CircuitBreakerError extends ApiGatewayError {
  constructor(serviceName: string) {
    super(`${serviceName} circuit breaker is open`, 503, 'CIRCUIT_BREAKER_OPEN');
  }
}

// ========================================
// ERROR RESPONSE GENERATOR
// ========================================

export const createErrorResponse = (
  error: Error | ApiGatewayError,
  req: Request,
  includeStack: boolean = false,
): ErrorResponse => {
  const message = error.message || 'Internal Server Error';
  const code = error instanceof ApiGatewayError ? error.code : 'INTERNAL_ERROR';

  const errorResponse: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: (req as any).requestId,
  };

  // เพิ่ม error details ใน development mode
  if (config.environment === 'development' || includeStack) {
    errorResponse.error = error.stack;
  }

  // เพิ่ม error code
  if (code) {
    (errorResponse as any).code = code;
  }

  return errorResponse;
};

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

export const errorHandler = (
  error: Error | ApiGatewayError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Track error metrics
  const errorType = error instanceof ApiGatewayError ? error.code || 'UNKNOWN' : 'INTERNAL_ERROR';
  
  // Log error with context
  logError(error, req, {
    errorType,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
  });

  // Create error response
  const errorResponse = createErrorResponse(error, req);
  
  // Set appropriate status code
  const statusCode = error instanceof ApiGatewayError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
};

// ========================================
// ASYNC ERROR HANDLER
// ========================================

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, _next: NextFunction) => {
    Promise.resolve(fn(req, res, _next)).catch(_next);
  };
};

// ========================================
// VALIDATION ERROR HANDLER
// ========================================

export const handleValidationError = (errors: any[]): ValidationError => {
  const messages = errors.map((error: any) => {
    if (error.type === 'field') {
      return `${error.path}: ${error.msg}`;
    }
    return error.msg;
  });

  return new ValidationError(messages.join(', '));
};

// ========================================
// SERVICE ERROR HANDLER
// ========================================

export const handleServiceError = (serviceName: string, error: any): ApiGatewayError => {
  // จัดการ error ตาม HTTP status code
  if (error.statusCode) {
    switch (error.statusCode) {
      case 401:
        return new AuthenticationError(`Authentication failed for ${serviceName}`);
      case 403:
        return new AuthorizationError(`Authorization failed for ${serviceName}`);
      case 404:
        return new ApiGatewayError(`Resource not found in ${serviceName}`, 404, 'RESOURCE_NOT_FOUND');
      case 429:
        return new RateLimitError(`Rate limit exceeded for ${serviceName}`);
      case 503:
        return new ServiceUnavailableError(serviceName);
      default:
        return new ApiGatewayError(
          `Service error: ${error.message || 'Unknown error'}`,
          error.statusCode || 500,
          'SERVICE_ERROR',
        );
    }
  }

  // จัดการ network errors
  if (error.code) {
    switch (error.code) {
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        return new ServiceUnavailableError(serviceName);
      case 'ETIMEDOUT':
        return new ApiGatewayError(
          `Service timeout: ${serviceName}`,
          504,
          'SERVICE_TIMEOUT',
        );
      default:
        return new ApiGatewayError(
          `Network error: ${error.message}`,
          503,
          'NETWORK_ERROR',
        );
    }
  }

  // Default error
  return new ApiGatewayError(
    `Service error: ${error.message || 'Unknown error'}`,
    500,
    'SERVICE_ERROR',
  );
};

// ========================================
// CIRCUIT BREAKER ERROR HANDLER
// ========================================

export const handleCircuitBreakerError = (serviceName: string): CircuitBreakerError => {
  return new CircuitBreakerError(serviceName);
};

// ========================================
// RATE LIMIT ERROR HANDLER
// ========================================

export const handleRateLimitError = (limit: number, remaining: number): RateLimitError => {
  return new RateLimitError(
    `Rate limit exceeded. Limit: ${limit}, Remaining: ${remaining}`,
  );
};

// ========================================
// SECURITY ERROR HANDLER
// ========================================

export const handleSecurityError = (event: string, details: Record<string, any>): ApiGatewayError => {
  logger.warn(`Security event: ${event}`, { event, ...details });
  
  return new ApiGatewayError(
    'Security violation detected',
    403,
    'SECURITY_VIOLATION',
  );
};

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

export const globalErrorHandler = (error: Error): void => {
  // Log unhandled errors
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });

  // ใน production อาจจะส่ง alert หรือ notification
  if (config.environment === 'production') {
    // TODO: ส่ง alert ไปยัง monitoring system
    console.error('Critical error in production:', error);
  }
};

// ========================================
// PROCESS ERROR HANDLERS
// ========================================

export const setupProcessErrorHandlers = (): void => {
  // จัดการ uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // จัดการ unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection:', { reason, promise });
    process.exit(1);
  });

  // จัดการ SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // จัดการ SIGINT
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

// ========================================
// ERROR UTILITIES
// ========================================

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof ApiGatewayError) {
    return error.isOperational;
  }
  return false;
};

export const shouldRestartProcess = (error: Error): boolean => {
  return !isOperationalError(error);
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  ApiGatewayError,
  ServiceUnavailableError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  CircuitBreakerError,
  errorHandler,
  asyncHandler,
  createErrorResponse,
  handleServiceError,
  handleCircuitBreakerError,
  handleRateLimitError,
  handleSecurityError,
  globalErrorHandler,
  setupProcessErrorHandlers,
  isOperationalError,
  shouldRestartProcess,
}; 
