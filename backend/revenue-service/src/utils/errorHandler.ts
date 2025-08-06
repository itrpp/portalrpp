// ========================================
// REVENUE SERVICE ERROR HANDLER
// ========================================

import { Request, Response, NextFunction } from 'express';
import { logError } from './logger';
import { ErrorResponse } from '@/types';

export class RevenueServiceError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileValidationError extends RevenueServiceError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class FileProcessingError extends RevenueServiceError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class FileUploadError extends RevenueServiceError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class DatabaseError extends RevenueServiceError {
  constructor(message: string) {
    super(message, 500);
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

  // ตรวจสอบประเภทของ error
  if (error instanceof RevenueServiceError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ส่งมา';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
  }

  // Log error
  logError('Error occurred', error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
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
export const validationErrorHandler = (errors: any[]) => {
  const errorMessages = errors.map((error: any) => error.msg).join(', ');
  throw new FileValidationError(errorMessages);
};

// File size error handler
export const fileSizeErrorHandler = (filename: string, maxSize: number) => {
  throw new FileUploadError(
    `ไฟล์ ${filename} มีขนาดใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
  );
};

// File type error handler
export const fileTypeErrorHandler = (filename: string, allowedTypes: string[]) => {
  throw new FileUploadError(
    `ไฟล์ ${filename} ไม่ใช่ประเภทที่อนุญาต (${allowedTypes.join(', ')})`,
  );
};

// Database error handler
export const databaseErrorHandler = (error: Error, operation: string) => {
  logError(`Database error during ${operation}`, error);
  throw new DatabaseError(`เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล: ${operation}`);
};

// Processing error handler
export const processingErrorHandler = (error: Error, filename: string) => {
  logError(`Processing error for file: ${filename}`, error);
  throw new FileProcessingError(`เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${filename}`);
};

export default {
  RevenueServiceError,
  FileValidationError,
  FileProcessingError,
  FileUploadError,
  DatabaseError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validationErrorHandler,
  fileSizeErrorHandler,
  fileTypeErrorHandler,
  databaseErrorHandler,
  processingErrorHandler,
}; 