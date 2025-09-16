// ========================================
// DATABASE INTERFACES
// ========================================

import { BatchStatus, BatchProcessingStatus, ExportStatus } from './common';

// ========================================
// UPLOAD RECORD
// ========================================

export interface IUploadRecord {
  id: string;
  filename: string;
  originalName: string;
  fileType: string; // DBF, REP, STM
  fileSize: number;
  filePath: string;
  uploadDate: Date;
  processedAt?: Date | null;
  status: string; // PENDING, PROCESSING, SUCCESS, FAILED, VALIDATION_FAILED
  batchId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isValid?: boolean | null;
  errors?: string | null;
  warnings?: string | null;
  totalRecords?: number | null;
  validRecords?: number | null;
  invalidRecords?: number | null;
  processedRecords?: number | null;
  skippedRecords?: number | null;
  processingTime?: number | null;
  errorMessage?: string | null;
  metadata?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Alias for backward compatibility
export type UploadRecord = IUploadRecord;

// ========================================
// UPLOAD BATCH
// ========================================

export interface IUploadBatch {
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
  processingStatus: BatchProcessingStatus;
  exportStatus: ExportStatus;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  files?: IUploadRecord[];
}

// Alias for backward compatibility
export type UploadBatch = IUploadBatch;

// ========================================
// PROCESSING HISTORY
// ========================================

export interface IProcessingHistory {
  id: string;
  uploadId: string;
  action: string; // VALIDATE, PROCESS, BACKUP, CLEANUP
  status: string; // STARTED, SUCCESS, FAILED, CANCELLED
  message?: string | null;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null;
  error?: string | null;
  stackTrace?: string | null;
}

// ========================================
// UPLOAD STATISTICS
// ========================================

export interface IUploadStatistics {
  id: string;
  date: Date;
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  dbfUploads: number;
  repUploads: number;
  stmUploads: number;
  totalFileSize: number;
  averageFileSize: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}
