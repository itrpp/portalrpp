// ========================================
// ERROR INTERFACES - รวม error types ที่ซ้ำซ้อน
// ========================================

// ========================================
// BASE ERROR INTERFACE
// ========================================

export interface BaseError {
  code: string;
  message: string;
  field?: string;
  timestamp?: Date;
  details?: any;
}

// ========================================
// VALIDATION ERRORS
// ========================================

export interface ValidationError extends BaseError {
  field: string;
  message: string;
  code: 'VALIDATION_ERROR' | 'FILE_NOT_FOUND' | 'CHECKSUM_MISMATCH' | 'CHECKSUM_ERROR' | 'EMPTY_FILE' | 'PERMISSION_DENIED' | 'INVALID_EXTENSION' | 'INTEGRITY_ERROR' | 'MALICIOUS_FILENAME' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'INVALID_MIME_TYPE' | 'SECURITY_ERROR' | 'BATCH_TOO_LARGE' | 'BATCH_SIZE_TOO_LARGE' | 'FILE_SECURITY_ERROR' | 'BATCH_SECURITY_ERROR' | 'MALICIOUS_CONTENT' | 'FILE_MISSING' | 'FIELD_VALIDATION_ERROR' | 'REQUIRED_FIELD_MISSING' | 'INVALID_TYPE' | 'LENGTH_TOO_SHORT' | 'LENGTH_TOO_LONG' | 'VALUE_TOO_SMALL' | 'VALUE_TOO_LARGE' | 'PATTERN_MISMATCH' | 'CUSTOM_VALIDATION_FAILED' | 'CUSTOM_VALIDATION_ERROR';
  value?: any;
}

export interface ProcessingError extends BaseError {
  code: 'PROCESSING_ERROR' | 'FILE_INTEGRITY_ERROR' | 'FILE_PROCESSING_ERROR' | 'BATCH_VALIDATION_ERROR' | 'FILE_VALIDATION_ERROR' | 'FILE_VALIDATION_SYSTEM_ERROR';
  step?: string;
  fileId?: string;
  batchId?: string;
  type?: 'validation' | 'processing' | 'system' | 'file' | 'database';
  retryable?: boolean;
}

// ========================================
// BATCH ERRORS
// ========================================

export interface BatchError extends BaseError {
  code: 'BATCH_ERROR' | 'PROCESSING_ERROR' | 'FILE_INTEGRITY_ERROR' | 'FILE_PROCESSING_ERROR';
  batchId: string;
  fileId?: string;
  operation?: string;
  type?: 'validation' | 'processing' | 'system' | 'file' | 'database';
  retryable?: boolean;
}

export interface BatchErrorSummary {
  totalErrors: number;
  errors: BatchError[];
  warnings: string[];
  batchId: string;
  timestamp: Date;
  errorTypes?: {
    validation: number;
    processing: number;
    system: number;
    file: number;
    database: number;
  };
  canRetry?: boolean;
  retryableErrors?: number;
}

// ========================================
// API RESPONSE ERRORS
// ========================================

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string | undefined;
  timestamp: Date;
  requestId?: string | undefined;
  code?: string;
  details?: any;
}

// ========================================
// FILE ERRORS
// ========================================

export interface FileError extends BaseError {
  code: 'FILE_ERROR';
  fileId?: string;
  fileName?: string;
  filePath?: string;
  operation?: 'upload' | 'process' | 'validate' | 'delete';
}

// ========================================
// DATABASE ERRORS
// ========================================

export interface DatabaseError extends BaseError {
  code: 'DATABASE_ERROR';
  operation?: string;
  table?: string;
  query?: string;
}

// ========================================
// SECURITY ERRORS
// ========================================

export interface SecurityError extends BaseError {
  code: 'SECURITY_ERROR';
  threat?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
}

// ========================================
// ERROR FACTORY FUNCTIONS
// ========================================

export class ErrorFactory {
  static createValidationError(field: string, message: string, details?: any): ValidationError {
    return {
      code: 'VALIDATION_ERROR',
      field,
      message,
      timestamp: new Date(),
      details
    };
  }

  static createProcessingError(message: string, step?: string, fileId?: string, batchId?: string): ProcessingError {
    const result: ProcessingError = {
      code: 'PROCESSING_ERROR',
      message,
      timestamp: new Date()
    };
    if (step !== undefined) result.step = step;
    if (fileId !== undefined) result.fileId = fileId;
    if (batchId !== undefined) result.batchId = batchId;
    return result;
  }

  static createBatchError(message: string, batchId: string, fileId?: string, operation?: string): BatchError {
    const result: BatchError = {
      code: 'BATCH_ERROR',
      message,
      batchId,
      timestamp: new Date()
    };
    if (fileId !== undefined) result.fileId = fileId;
    if (operation !== undefined) result.operation = operation;
    return result;
  }

  static createFileError(message: string, fileId?: string, fileName?: string, operation?: FileError['operation']): FileError {
    const result: FileError = {
      code: 'FILE_ERROR',
      message,
      timestamp: new Date()
    };
    if (fileId !== undefined) result.fileId = fileId;
    if (fileName !== undefined) result.fileName = fileName;
    if (operation !== undefined) result.operation = operation;
    return result;
  }

  static createDatabaseError(message: string, operation?: string, table?: string): DatabaseError {
    const result: DatabaseError = {
      code: 'DATABASE_ERROR',
      message,
      timestamp: new Date()
    };
    if (operation !== undefined) result.operation = operation;
    if (table !== undefined) result.table = table;
    return result;
  }

  static createSecurityError(message: string, threat?: string, severity?: SecurityError['severity']): SecurityError {
    const result: SecurityError = {
      code: 'SECURITY_ERROR',
      message,
      timestamp: new Date()
    };
    if (threat !== undefined) result.threat = threat;
    if (severity !== undefined) result.severity = severity;
    return result;
  }
}

// ========================================
// ERROR TYPE GUARDS
// ========================================

export function isValidationError(error: any): error is ValidationError {
  return error && error.code === 'VALIDATION_ERROR';
}

export function isProcessingError(error: any): error is ProcessingError {
  return error && error.code === 'PROCESSING_ERROR';
}

export function isBatchError(error: any): error is BatchError {
  return error && error.code === 'BATCH_ERROR';
}

export function isFileError(error: any): error is FileError {
  return error && error.code === 'FILE_ERROR';
}

export function isDatabaseError(error: any): error is DatabaseError {
  return error && error.code === 'DATABASE_ERROR';
}

export function isSecurityError(error: any): error is SecurityError {
  return error && error.code === 'SECURITY_ERROR';
}
