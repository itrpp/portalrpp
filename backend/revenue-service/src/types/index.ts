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
  errors?: string[] | undefined;
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
  metadata?: string;
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

export enum BatchStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PROCESSING = 'processing',
  PARTIAL = 'partial',
}

// ========================================
// BATCH TYPES
// ========================================

export interface UploadBatch {
  id: string;
  batchName: string;
  uploadDate: Date;
  totalFiles: number;
  successFiles: number;
  errorFiles: number;
  processingFiles: number;
  totalRecords: number;
  totalSize: number;
  status: BatchStatus;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  files?: UploadRecord[];
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

export interface UploadRecord {
  id: string;
  filename: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  uploadDate: Date;
  processedAt?: Date;
  status: ProcessingStatus;
  batchId?: string;
  batch?: UploadBatch;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  isValid?: boolean;
  errors?: string;
  warnings?: string;
  totalRecords?: number;
  validRecords?: number;
  invalidRecords?: number;
  processedRecords?: number;
  skippedRecords?: number;
  processingTime?: number;
  errorMessage?: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// BATCH MANAGEMENT TYPES
// ========================================

export interface BatchCreateRequest {
  batchName: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface BatchUpdateRequest {
  batchName?: string;
  totalFiles?: number;
  successFiles?: number;
  errorFiles?: number;
  processingFiles?: number;
  totalRecords?: number;
  totalSize?: number;
  status?: BatchStatus;
}

export interface BatchQueryParams {
  page?: number;
  limit?: number;
  status?: BatchStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface BatchListResponse {
  batches: UploadBatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BatchFilesResponse {
  batch: UploadBatch;
  files: UploadRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========================================
// BATCH STATISTICS TYPES
// ========================================

export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  failedBatches: number;
  totalFiles: number;
  totalRecords: number;
  totalSize: number;
  averageProcessingTime: number;
  successRate: number;
  lastBatchDate?: Date;
  batchTypeBreakdown: {
    dbf: number;
    rep: number;
    statement: number;
  };
}

export interface BatchProgress {
  batchId: string;
  batchName: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  processingFiles: number;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  currentFile?: string;
  status: BatchStatus;
}

export interface BatchError {
  batchId: string;
  fileName: string;
  errorType: 'validation' | 'processing' | 'system';
  errorMessage: string;
  timestamp: Date;
  retryCount?: number;
  canRetry?: boolean;
}

// ========================================
// BATCH UPLOAD TYPES
// ========================================

export interface BatchUploadRequest {
  files: File[];
  batchName?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface BatchUploadResult {
  batchId: string;
  batchName: string;
  totalFiles: number;
  successFiles: number;
  errorFiles: number;
  results: FileUploadResult[];
  totalSize: number;
  totalRecords: number;
  processingTime: number;
  status: BatchStatus;
}

export interface BatchUploadProgress {
  batchId: string;
  currentFile: number;
  totalFiles: number;
  progress: number;
  currentFileName?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  estimatedTimeRemaining?: number;
}

export interface BatchProcessingResult {
  batchId: string;
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  processingTime: number;
  errors: ProcessingError[];
  progress: BatchProgress;
}

export interface FileProcessingInBatchResult {
  fileId: string;
  success: boolean;
  processingTime: number;
  recordsProcessed: number;
  recordsFailed: number;
  errors: ProcessingError[];
}

// ========================================
// CONFIGURATION TYPES
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
// FILE STORAGE TYPES
// ========================================

export interface FileStorageInfo {
  fileType: 'dbf' | 'rep' | 'stm';
  date: string; // YYYY-MM-DD
  uuid: string;
  filename: string;
  fullPath: string;
  relativePath: string;
  fileSize: number;
  uploadDate: Date;
}

export interface FileStorageStructure {
  uploadPath: string;
  dbfPath: string;
  repPath: string;
  stmPath: string;
  tempPath: string;
  processedPath: string;
  backupPath: string;
}

export interface FileLocation {
  fileType: 'dbf' | 'rep' | 'stm';
  date: string;
  uuid: string;
  filename: string;
}

// ========================================
// ERROR HANDLING TYPES
// ========================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ProcessingError {
  type: 'validation' | 'processing' | 'system' | 'file' | 'database';
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface BatchErrorSummary {
  batchId: string;
  totalErrors: number;
  errors: ProcessingError[];
  errorTypes: {
    validation: number;
    processing: number;
    system: number;
    file: number;
    database: number;
  };
  canRetry: boolean;
  retryableErrors: number;
}

// ========================================
// VALIDATION TYPES
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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  fieldResults: Record<string, {
    isValid: boolean;
    errors: ValidationError[];
    warnings: string[];
  }>;
  securityScore?: number;
  totalFiles?: number;
}

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
// MONITORING TYPES
// ========================================

export interface BatchMetrics {
  batchId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
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
// NOTIFICATION TYPES
// ========================================

export interface BatchNotification {
  batchId: string;
  type: 'started' | 'completed' | 'failed' | 'progress';
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  email?: string;
  sms?: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  notificationTypes: {
    batchStarted: boolean;
    batchCompleted: boolean;
    batchFailed: boolean;
    batchProgress: boolean;
  };
} 