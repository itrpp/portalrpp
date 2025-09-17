// ========================================
// VALIDATION INTERFACES
// ========================================

import { DBFField, DBFTable } from './dbf';
import { ValidationError, ProcessingError } from './errors';

// ========================================
// VALIDATION RESULT
// ========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  fieldResults?: Record<string, {
    isValid: boolean;
    errors: ValidationError[];
    warnings: string[];
  }>;
  securityScore?: number;
  totalFiles?: number;
}

// ValidationError is now imported from './errors'

// ========================================
// BATCH VALIDATION
// ========================================

export interface BatchValidationResult {
  batchId: string;
  isValid: boolean;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: ProcessingError[];
  fileResults: Record<string, ValidationResult>;
}

// ========================================
// FILE VALIDATION RULES
// ========================================

export interface FileValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean;
  errorMessage?: string;
}

// ========================================
// SECURITY VALIDATION
// ========================================

export interface IChecksumValidation {
  algorithm: string;
  expectedChecksum?: string;
  actualChecksum: string;
  isValid: boolean;
}

export interface ISecurityValidation {
  fileSize: number;
  fileType: string;
  fileName: string;
  hasVirus: boolean;
  isMalicious: boolean;
  securityScore: number;
  warnings: string[];
}

// ========================================
// FILE VALIDATION RESULTS
// ========================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType: 'dbf' | 'rep' | 'statement';
  recordCount?: number;
  fileSize: number;
}

export interface DBFValidationResult extends FileValidationResult {
  fileType: 'dbf';
  tableName?: string;
  fieldCount?: number;
  recordCount: number;
  encoding?: string;
  fields?: DBFField[];
  table?: DBFTable;
}

export interface REPValidationResult extends FileValidationResult {
  fileType: 'rep';
  sheetCount?: number;
  sheetNames?: string[];
  totalRows?: number;
}

export interface StatementValidationResult extends FileValidationResult {
  fileType: 'statement';
  sheetCount?: number;
  sheetNames?: string[];
  totalRows?: number;
}

// ========================================
// PROCESSING ERROR
// ========================================

// ProcessingError is now imported from './errors'
