// ========================================
// SERVICE INTERFACES
// ========================================

// Request type is used in AuthenticatedRequest interface
// Import types from other modules
import { ValidationResult, FileValidationRule, BatchValidationResult, FileValidationResult, DBFValidationResult, REPValidationResult, StatementValidationResult } from './validation';
import { ValidationError } from './errors';
import { FileProcessingResult } from './files';
import { ProcessingStatistics } from './common';
import { UploadStatistics, RevenueReport, SystemMetrics } from './common';
import { BatchStatistics, BatchMetrics } from './batch';

// ========================================
// VALIDATION SERVICE
// ========================================

export interface IValidationService {
  // Basic validation methods
  validateFile(file: Express.Multer.File): Promise<ValidationResult>;
  validateBatch(batchId: string, files: Express.Multer.File[]): Promise<BatchValidationResult>;
  validateField(value: any, rule: FileValidationRule): ValidationResult;
  validateRequired(value: any, fieldName: string): ValidationError[];
  validateType(value: any, expectedType: string, fieldName: string): ValidationError[];
  validateLength(value: string, minLength?: number, maxLength?: number, fieldName?: string): ValidationError[];
  validateRange(value: number, minValue?: number, maxValue?: number, fieldName?: string): ValidationError[];
  validatePattern(value: string, pattern: string, fieldName?: string): ValidationError[];
  validateCustom(value: any, validator: (value: any) => boolean, fieldName?: string): ValidationError[];
  
  // File validation methods
  validateFileByType(filePath: string, filename: string): Promise<FileValidationResult>;
  validateDBF(filePath: string, filename: string): Promise<DBFValidationResult>;
  validateREP(filePath: string, filename: string): Promise<REPValidationResult>;
  validateStatement(filePath: string, filename: string): Promise<StatementValidationResult>;
  
  // Security and integrity methods
  validateChecksum(filePath: string, expectedChecksum?: string): Promise<ValidationResult>;
  validateFileIntegrity(filePath: string): Promise<ValidationResult>;
  validateFileSecurity(file: Express.Multer.File): Promise<ValidationResult>;
  generateChecksum(filePath: string, algorithm?: string): Promise<string>;
  validateBatchSecurity(batchId: string, files: Express.Multer.File[]): Promise<ValidationResult>;
  
  // Batch management methods
  updateBatchSuccessFiles(batchId: string): Promise<void>;
}

// ========================================
// FILE PROCESSING SERVICE
// ========================================

export interface IFileProcessingService {
  processFile(filePath: string, filename: string, validationResult: FileValidationResult): Promise<FileProcessingResult>;
  processDBF(filePath: string, filename: string): Promise<FileProcessingResult>;
  processDBFFileAndSaveToDatabase(fileId: string, filePath: string, filename: string, batchId?: string): Promise<{ success: boolean; recordCount: number; error?: string }>;
  validateFileWithThreeSteps(filePath: string, filename: string, metadata: any, fileId: string, fileRecord: any, batchId?: string): Promise<any>;
}

// ========================================
// STATISTICS SERVICE
// ========================================

export interface IStatisticsService {
  updateUploadStatistics(fileType: string, fileSize: number, success: boolean): Promise<void>;
  getUploadStatistics(): Promise<UploadStatistics>;
  saveProcessingResult(result: FileProcessingResult): Promise<void>;
  getProcessingHistory(): Promise<RevenueReport[]>;
  getProcessingStatistics(): Promise<ProcessingStatistics>;
  generateSystemReport(): Promise<any>;
  getBatchStatistics(): Promise<BatchStatistics>;
  getBatchMetrics(batchId: string): Promise<BatchMetrics>;
  getSystemMetrics(): Promise<SystemMetrics>;
  updateBatchStatistics(batchId: string, success: boolean, fileCount: number, recordCount: number, processingTime: number): Promise<void>;
}

// ========================================
// SERVICE MANAGEMENT
// ========================================

export interface ServiceContainer {
  databaseService: any; // DatabaseService
  fileStorageService: any; // FileStorageService
  batchService: any; // BatchService
  fileProcessingService: any; // FileProcessingService
  statisticsService: any; // StatisticsService
  validationService: any; // ValidationService
  dbfService: any; // DBFService
}
