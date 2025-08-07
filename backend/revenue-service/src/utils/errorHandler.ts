// ========================================
// REVENUE SERVICE ERROR HANDLER
// ========================================

import { Request, Response, NextFunction } from 'express';
import { logError } from './logger';
import { ErrorResponse, ValidationError, ProcessingError, BatchErrorSummary } from '@/types';
import config from '@/config';

export class RevenueServiceError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileValidationError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class FileProcessingError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 422, true, 'PROCESSING_ERROR', details);
  }
}

export class FileUploadError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'UPLOAD_ERROR', details);
  }
}

export class DatabaseError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

export class BatchError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'BATCH_ERROR', details);
  }
}

export class AuthenticationError extends RevenueServiceError {
  constructor(message: string = 'ไม่ได้รับอนุญาตให้เข้าถึง', details?: any) {
    super(message, 401, true, 'AUTHENTICATION_ERROR', details);
  }
}

export class AuthorizationError extends RevenueServiceError {
  constructor(message: string = 'ไม่มีสิทธิ์ในการเข้าถึง', details?: any) {
    super(message, 403, true, 'AUTHORIZATION_ERROR', details);
  }
}

export class RateLimitError extends RevenueServiceError {
  constructor(message: string = 'เกินขีดจำกัดการเรียก API', details?: any) {
    super(message, 429, true, 'RATE_LIMIT_ERROR', details);
  }
}

export class ResourceNotFoundError extends RevenueServiceError {
  constructor(resource: string, details?: any) {
    super(`ไม่พบ ${resource}`, 404, true, 'RESOURCE_NOT_FOUND', details);
  }
}

export class ConflictError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

export class ServiceUnavailableError extends RevenueServiceError {
  constructor(message: string = 'บริการไม่พร้อมใช้งาน', details?: any) {
    super(message, 503, true, 'SERVICE_UNAVAILABLE', details);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // ตรวจสอบประเภทของ error
  if (error instanceof RevenueServiceError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ส่งมา';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
    code = 'UPLOAD_ERROR';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
    code = 'SYNTAX_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
    code = 'CAST_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'PrismaClientKnownRequestError') {
    statusCode = 500;
    message = 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล';
    code = 'DATABASE_ERROR';
  }

  // Log error
  logError('Error occurred', error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
    code,
    details,
  });

  // สร้าง error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    error: config.server.nodeEnv === 'development' ? error.message : undefined,
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] as string,
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'ไม่พบ API endpoint นี้',
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] as string,
  };

  res.status(404).json(errorResponse);
};

// Validation error handler
export const validationErrorHandler = (errors: ValidationError[]) => {
  const errorMessages = errors.map((error: ValidationError) => error.message).join(', ');
  throw new FileValidationError(errorMessages, { errors });
};

// File size error handler
export const fileSizeErrorHandler = (filename: string, maxSize: number) => {
  throw new FileUploadError(
    `ไฟล์ ${filename} มีขนาดใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
    { filename, maxSize, actualSize: 0 }
  );
};

// File type error handler
export const fileTypeErrorHandler = (filename: string, allowedTypes: string[]) => {
  throw new FileUploadError(
    `ไฟล์ ${filename} ไม่ใช่ประเภทที่อนุญาต (${allowedTypes.join(', ')})`,
    { filename, allowedTypes }
  );
};

// Database error handler
export const databaseErrorHandler = (error: Error, operation: string) => {
  logError(`Database error during ${operation}`, error);
  throw new DatabaseError(`เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล: ${operation}`, {
    operation,
    originalError: error.message
  });
};

// Processing error handler
export const processingErrorHandler = (error: Error, filename: string) => {
  logError(`Processing error for file: ${filename}`, error);
  throw new FileProcessingError(`เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${filename}`, {
    filename,
    originalError: error.message
  });
};

// Batch error handler
export const batchErrorHandler = (error: Error, batchId: string, operation: string) => {
  logError(`Batch error during ${operation} for batch: ${batchId}`, error);
  throw new BatchError(`เกิดข้อผิดพลาดในการจัดการ batch: ${operation}`, {
    batchId,
    operation,
    originalError: error.message
  });
};

// Rate limit error handler
export const rateLimitErrorHandler = (limit: number, windowMs: number) => {
  throw new RateLimitError(`เกินขีดจำกัดการเรียก API (${limit} requests per ${windowMs}ms)`, {
    limit,
    windowMs
  });
};

// Resource not found error handler
export const resourceNotFoundErrorHandler = (resource: string, id?: string) => {
  const message = id ? `ไม่พบ ${resource} ที่มี ID: ${id}` : `ไม่พบ ${resource}`;
  throw new ResourceNotFoundError(message, { resource, id });
};

// Conflict error handler
export const conflictErrorHandler = (message: string, details?: any) => {
  throw new ConflictError(message, details);
};

// Service unavailable error handler
export const serviceUnavailableErrorHandler = (service: string) => {
  throw new ServiceUnavailableError(`บริการ ${service} ไม่พร้อมใช้งาน`, { service });
};

// Create batch error summary
export const createBatchErrorSummary = (batchId: string, errors: ProcessingError[]): BatchErrorSummary => {
  const errorTypes = {
    validation: 0,
    processing: 0,
    system: 0,
    file: 0,
    database: 0,
  };

  let retryableErrors = 0;

  errors.forEach(error => {
    if (error.type in errorTypes) {
      errorTypes[error.type as keyof typeof errorTypes]++;
    }
    if (error.retryable) {
      retryableErrors++;
    }
  });

  return {
    batchId,
    totalErrors: errors.length,
    errors,
    errorTypes,
    canRetry: retryableErrors > 0,
    retryableErrors,
  };
};

export default {
  RevenueServiceError,
  FileValidationError,
  FileProcessingError,
  FileUploadError,
  DatabaseError,
  BatchError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ResourceNotFoundError,
  ConflictError,
  ServiceUnavailableError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validationErrorHandler,
  fileSizeErrorHandler,
  fileTypeErrorHandler,
  databaseErrorHandler,
  processingErrorHandler,
  batchErrorHandler,
  rateLimitErrorHandler,
  resourceNotFoundErrorHandler,
  conflictErrorHandler,
  serviceUnavailableErrorHandler,
  createBatchErrorSummary,
}; 