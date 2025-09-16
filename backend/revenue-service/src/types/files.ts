// ========================================
// FILE-RELATED INTERFACES
// ========================================

import { ProcessingStatistics } from './common';

// ========================================
// FILE UPLOAD
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

// File validation interfaces moved to validation.ts

// ========================================
// FILE PROCESSING
// ========================================

export interface FileProcessingResult {
  success: boolean;
  message: string;
  processedAt: Date;
  fileId: string;
  statistics: ProcessingStatistics;
  errors?: string[];
  metadata?: string;
}

// ProcessingStatistics moved to common.ts

// ========================================
// FILE STORAGE
// ========================================

export interface IFileStorageConfig {
  basePath: string;
  uploadPath: string;
  dbfPath: string;
  repPath: string;
  stmPath: string;
  tempPath: string;
  backupPath: string;
  processedPath: string;
}

export interface IFileStorageResult {
  success: boolean;
  filePath: string;
  relativePath: string;
  filename: string;
  uuid: string;
  dateFolder: string;
  batchFolder?: string;
  message?: string;
  error?: string;
}

export interface IBatchStorageResult extends IFileStorageResult {
  batchId: string;
  batchFolder: string;
}

// ========================================
// FILE INFO
// ========================================

export interface FileInfo {
  name: string;
  size: number;
  extension: string;
  mimeType: string;
  checksum: string;
  createdAt: Date;
  modifiedAt: Date;
}

// ========================================
// FILE STORAGE STRUCTURE
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

// DBFTable and DBFRecord moved to index.ts to avoid duplication
