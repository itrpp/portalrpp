import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { ApiResponse } from '../types';

// Custom error classes
export class RevenueError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends RevenueError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends RevenueError {
  constructor(resource: string) {
    super(`${resource} ไม่พบ`, 404);
  }
}

export class UnauthorizedError extends RevenueError {
  constructor(message: string = 'ไม่มีสิทธิ์เข้าถึง') {
    super(message, 401);
  }
}

export class ForbiddenError extends RevenueError {
  constructor(message: string = 'ห้ามเข้าถึง') {
    super(message, 403);
  }
}

export class ConflictError extends RevenueError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class DatabaseError extends RevenueError {
  constructor(message: string) {
    super(message, 500, false);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | RevenueError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
  let isOperational = true;

  // Handle custom errors
  if (error instanceof RevenueError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'ข้อมูลไม่ถูกต้อง';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token ไม่ถูกต้อง';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token หมดอายุ';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'รูปแบบ JSON ไม่ถูกต้อง';
  }

  // Log error
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  };

  if (isOperational) {
    logger.warn('Operational error occurred', errorInfo);
  } else {
    logger.error('System error occurred', errorInfo);
  }

  // Send response
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    (response as any).stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
export const createValidationError = (field: string, message: string): ValidationError => {
  return new ValidationError(`${field}: ${message}`);
};

// Database error helper
export const createDatabaseError = (operation: string, error: any): DatabaseError => {
  const message = `Database ${operation} failed: ${error.message}`;
  return new DatabaseError(message);
};

// Not found error helper
export const createNotFoundError = (resource: string, id?: string): NotFoundError => {
  const message = id ? `${resource} with ID ${id} ไม่พบ` : `${resource} ไม่พบ`;
  return new NotFoundError(message);
};

// Conflict error helper
export const createConflictError = (resource: string, field: string, value: string): ConflictError => {
  return new ConflictError(`${resource} with ${field} '${value}' already exists`);
}; 