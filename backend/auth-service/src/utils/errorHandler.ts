import { Response } from 'express';
import { AppError, ValidationError, ApiResponse } from '../types';
import { logger } from '../utils/logger';

/**
 * Error Handler Utilities
 * จัดการ error และ response อย่างเป็นระบบ
 */

export class ErrorHandler {
  /**
   * สร้าง validation error response
   */
  static createValidationError(res: Response, message: string, field?: string, value?: unknown): void {
    const error: ValidationError = {
      code: 'VALIDATION_ERROR',
      message,
      field: field ?? 'unknown',
      value,
      statusCode: 400,
    };

    res.status(400).json({
      success: false,
      message,
      error: error,
      errors: [message],
    });
  }

  /**
   * สร้าง authentication error response
   */
  static createAuthError(res: Response, message: string): void {
    const error: AppError = {
      code: 'AUTHENTICATION_ERROR',
      message,
      statusCode: 401,
    };

    res.status(401).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * สร้าง authorization error response
   */
  static createAuthorizationError(res: Response, message: string): void {
    const error: AppError = {
      code: 'AUTHORIZATION_ERROR',
      message,
      statusCode: 403,
    };

    res.status(403).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * สร้าง not found error response
   */
  static createNotFoundError(res: Response, message: string): void {
    const error: AppError = {
      code: 'NOT_FOUND_ERROR',
      message,
      statusCode: 404,
    };

    res.status(404).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * สร้าง conflict error response
   */
  static createConflictError(res: Response, message: string): void {
    const error: AppError = {
      code: 'CONFLICT_ERROR',
      message,
      statusCode: 409,
    };

    res.status(409).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * สร้าง Server Error Response
   */
  static createServerError(res: Response, error: unknown, message?: string): void {
    const errorMessage = message ?? 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';

    const appError: AppError = {
      code: 'SERVER_ERROR',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined,
      statusCode: 500,
    };

    logger.error('Server error', { error: appError });

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: appError,
    });
  }

  /**
   * สร้าง rate limit error response
   */
  static createRateLimitError(res: Response, message: string): void {
    const error: AppError = {
      code: 'RATE_LIMIT_ERROR',
      message,
      statusCode: 429,
    };

    res.status(429).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * สร้าง success response
   */
  static createSuccessResponse<T>(res: Response, data: T, message: string): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    res.status(200).json(response);
  }

  /**
   * สร้าง created response
   */
  static createCreatedResponse<T>(res: Response, data: T, message: string): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    res.status(201).json(response);
  }

  /**
   * สร้าง no content response
   */
  static createNoContentResponse(res: Response): void {
    res.status(204).send();
  }

  /**
   * จัดการ error ตามประเภท
   */
  static handleError(res: Response, error: unknown): void {
    if (error instanceof Error) {
      // จัดการ Prisma errors
      if (error.name === 'PrismaClientKnownRequestError') {
        this.handlePrismaError(res, error);
        return;
      }

      // จัดการ JWT errors
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        this.createAuthError(res, 'Token ไม่ถูกต้องหรือหมดอายุ');
        return;
      }

      // จัดการ validation errors
      if (error.name === 'ValidationError') {
        this.createValidationError(res, error.message);
        return;
      }
    }

    // Default server error
    this.createServerError(res, error);
  }

  /**
   * จัดการ Prisma errors
   */
  private static handlePrismaError(res: Response, error: Error): void {
    const prismaError = error as { code?: string };
    const { code } = prismaError;

    switch (code) {
      case 'P2002': // Unique constraint violation
        this.createConflictError(res, 'ข้อมูลนี้มีอยู่ในระบบแล้ว');
        break;
      case 'P2025': // Record not found
        this.createNotFoundError(res, 'ไม่พบข้อมูลที่ต้องการ');
        break;
      case 'P2003': // Foreign key constraint violation
        this.createValidationError(res, 'ข้อมูลที่เกี่ยวข้องไม่ถูกต้อง');
        break;
      default:
        this.createServerError(res, error, 'เกิดข้อผิดพลาดในการจัดการฐานข้อมูล');
    }
  }

  /**
   * สร้าง custom error
   */
  static createCustomError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
    const error: AppError = {
      code,
      message,
      details,
      statusCode,
    };

    res.status(statusCode).json({
      success: false,
      message,
      error: error,
    });
  }

  /**
   * ตรวจสอบและจัดการ async errors
   */
  static async handleAsyncError<T>(res: Response, asyncFunction: () => Promise<T>): Promise<void> {
    try {
      await asyncFunction();
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

// Export legacy functions for backward compatibility
export const createValidationError = ErrorHandler.createValidationError.bind(ErrorHandler);
export const createAuthError = ErrorHandler.createAuthError.bind(ErrorHandler);
export const createServerError = ErrorHandler.createServerError.bind(ErrorHandler);
export const createSuccessResponse = ErrorHandler.createSuccessResponse.bind(ErrorHandler);
