// ========================================
// COMMON/UTILITY INTERFACES
// ========================================

// ========================================
// API RESPONSES
// ========================================

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string | undefined;
  timestamp: Date;
  requestId?: string | undefined;
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
// ENUMS
// ========================================

export enum FileType {
  DBF = 'dbf',
  REP = 'rep',
  STATEMENT = 'statement',
}

export enum FileProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  VALIDATION_COMPLETED = 'validation_completed',
  VALIDATION_FAILED = 'validation_failed',
  VALIDATION_ERROR = 'validation_error',
}

export enum ValidationLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  STRICT = 'strict',
}

export enum BatchStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PROCESSING = 'processing',
  PARTIAL = 'partial',
  PARTIAL_SUCCESS = 'partial_success',
}

export enum BatchProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExportStatus {
  NOT_EXPORTED = 'not_exported',
  EXPORTING = 'exporting',
  EXPORTED = 'exported',
  EXPORT_FAILED = 'export_failed',
}

// ========================================
// CONFIGURATION
// ========================================

export interface FileUploadConfig {
  maxFileSize: string;
  allowedFileTypes: string[];
  uploadPath: string;
  dbfPath: string;
  repPath: string;
  stmPath: string;
  tempPath: string;
  processedPath: string;
  backupPath: string;
  exportPath: string;
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

// ========================================
// STATISTICS
// ========================================

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

export interface RevenueReport {
  id: string;
  type: 'dbf' | 'rep' | 'statement';
  filename: string;
  uploadDate: Date;
  processedDate?: Date;
  status: 'pending' | 'processing' | 'success' | 'failed';
  statistics?: ProcessingStatistics;
  errors?: string[];
  warnings?: string[];
  fileSize: number;
  filePath: string;
}

export interface UploadHistory {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  status: 'success' | 'error' | 'processing';
  recordsCount?: number;
  errorMessage?: string;
  fileType?: string;
  batchId?: string;
  processingTime?: number;
  validRecords?: number;
  invalidRecords?: number;
  processedRecords?: number;
  skippedRecords?: number;
}

// ========================================
// SYSTEM HEALTH
// ========================================

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

export interface SystemMetrics {
  activeBatches: number;
  totalBatches: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: Date;
}

// ========================================
// DATA TRANSFORMATION
// ========================================

export interface DataTransformationResult<T> {
  success: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
}

// ========================================
// PROCESSING STATISTICS
// ========================================

export interface ProcessingStatistics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  processedRecords: number;
  skippedRecords: number;
  processingTime: number; // milliseconds
}
