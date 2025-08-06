// ========================================
// REVENUE SERVICE TYPE DEFINITIONS
// ========================================

export interface FileUploadResult {
  success: boolean;
  message: string;
  filename?: string;
  fileId?: string;
  fileSize?: number;
  uploadDate?: Date;
  errors?: string[];
}

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

export interface DBFField {
  name: string;
  type: string;
  length: number;
  decimalPlaces?: number;
}

export interface FileProcessingResult {
  success: boolean;
  message: string;
  processedAt: Date;
  fileId: string;
  statistics: ProcessingStatistics;
  errors?: string[];
}

export interface ProcessingStatistics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  processedRecords: number;
  skippedRecords: number;
  processingTime: number; // milliseconds
}

export interface RevenueReport {
  id: string;
  type: 'dbf' | 'rep' | 'statement';
  filename: string;
  uploadDate: Date;
  processedDate?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  statistics?: ProcessingStatistics;
  errors?: string[];
  warnings?: string[];
  fileSize: number;
  filePath: string;
}

export interface UploadStatistics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalFileSize: number;
  averageProcessingTime: number;
  lastUploadDate?: Date;
  fileTypeBreakdown: {
    dbf: number;
    rep: number;
    statement: number;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  fileSystemStatus: {
    uploadDir: boolean;
    tempDir: boolean;
    processedDir: boolean;
    backupDir: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  timestamp: Date;
  requestId?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ========================================
// ENUM DEFINITIONS
// ========================================

export enum FileType {
  DBF = 'dbf',
  REP = 'rep',
  STATEMENT = 'statement',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ValidationLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  STRICT = 'strict',
}

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface FileUploadConfig {
  maxFileSize: string;
  allowedFileTypes: string[];
  uploadPath: string;
  tempPath: string;
  processedPath: string;
  backupPath: string;
}

export interface ValidationConfig {
  maxRecordCount: number;
  maxFileSize: number;
  allowedEncodings: string[];
  requiredFields: Record<string, string[]>;
}

export interface ProcessingConfig {
  batchSize: number;
  timeout: number;
  retryAttempts: number;
  parallelProcessing: boolean;
} 