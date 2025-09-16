// ========================================
// BATCH-RELATED INTERFACES
// ========================================

import { BatchStatus } from './common';
import { ProcessingError } from './errors';
import { FileUploadResult } from './files';
import { IUploadBatch, IUploadRecord } from './database';

// ========================================
// BATCH TYPES
// ========================================

// UploadBatch and UploadRecord moved to database.ts to avoid duplication

// ========================================
// BATCH REQUESTS
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

// ========================================
// BATCH RESPONSES
// ========================================

export interface BatchListResponse {
  batches: IUploadBatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BatchFilesResponse {
  batch: IUploadBatch;
  files: IUploadRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========================================
// BATCH STATISTICS
// ========================================

export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  failedBatches: number;
  partialBatches: number;
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

// ========================================
// BATCH ERRORS
// ========================================

// BatchError and BatchErrorSummary are now imported from './errors'

// ========================================
// BATCH UPLOAD
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
  status: 'uploading' | 'processing' | 'success' | 'error';
  estimatedTimeRemaining?: number;
}

// ========================================
// BATCH PROCESSING
// ========================================

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
// BATCH NOTIFICATIONS
// ========================================

export interface BatchNotification {
  batchId: string;
  type: 'started' | 'success' | 'failed' | 'progress';
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
