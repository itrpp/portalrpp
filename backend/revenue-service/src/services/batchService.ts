// ========================================
// REVENUE SERVICE BATCH SERVICE
// ========================================

import {
  UploadBatch,
  UploadRecord,
  BatchStatus,
  BatchCreateRequest,
  BatchUpdateRequest,
  BatchQueryParams,
  BatchListResponse,
  BatchFilesResponse,
  BatchProgress,
  BatchError,
  BatchUploadResult,
  BatchUploadProgress,
  BatchStatistics,
  BatchMetrics,
  ProcessingError,
  BatchErrorSummary
} from '@/types';
import { DatabaseService } from './databaseService';
import { FileProcessingService } from './fileProcessingService';
import { ValidationService } from './validationService';
import { BatchError as BatchServiceError, ResourceNotFoundError, ConflictError } from '@/utils/errorHandler';
import {
  logInfo,
  logError,
  logWarn,
  logBatchCreation,
  logBatchProcessing,
  logBatchCompletion,
  logBatchError,
  logBatchProgress,
  logBatchFileProcessing
} from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ICreateBatchRequest {
  batchName: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IGetBatchesParams {
  page?: number;
  limit?: number;
  status?: BatchStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IBatchProcessingResult {
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

export interface IFileProcessingInBatchResult {
  fileId: string;
  success: boolean;
  processingTime: number;
  recordsProcessed: number;
  recordsFailed: number;
  errors: ProcessingError[];
}

export class BatchService {
  private databaseService: DatabaseService;
  private fileProcessingService: FileProcessingService;
  private validationService: ValidationService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.fileProcessingService = new FileProcessingService();
    this.validationService = new ValidationService();
  }

  /**
   * สร้าง batch ใหม่
   */
  async createBatch(data: ICreateBatchRequest): Promise<UploadBatch> {
    try {
      logInfo('Creating new batch', { batchName: data.batchName, userId: data.userId });

      const batch = await this.databaseService.createUploadBatch({
        batchName: data.batchName,
        totalFiles: 0,
        successFiles: 0,
        errorFiles: 0,
        processingFiles: 0,
        totalRecords: 0,
        totalSize: 0,
        status: 'processing',
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      });

      // ใช้ logBatchCreation แทน logInfo
      logBatchCreation(batch.id, {
        batchName: data.batchName,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });

      return batch as UploadBatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to create batch', error as Error, { batchName: data.batchName });
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการสร้าง batch: ${errorMessage}`);
    }
  }

  /**
   * ดึงรายการ batches
   */
  async getBatches(params: IGetBatchesParams): Promise<BatchListResponse> {
    try {
      logInfo('Fetching batches', params);

      const result = await this.databaseService.getUploadBatches({
        page: params.page || 1,
        limit: params.limit || 20,
        status: params.status as any,
        userId: params.userId as any,
        startDate: params.startDate as any,
        endDate: params.endDate as any,
      });

      const response: BatchListResponse = {
        batches: result.batches as UploadBatch[],
        pagination: {
          page: result.page,
          limit: params.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      logInfo('Batches fetched successfully', {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to fetch batches', error as Error, params);
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการดึงรายการ batches: ${errorMessage}`);
    }
  }

  /**
   * ดึงข้อมูล batch เฉพาะ
   */
  async getBatch(id: string): Promise<UploadBatch | null> {
    try {
      logInfo('Fetching batch', { batchId: id });

      const batch = await this.databaseService.getUploadBatch(id);

      if (!batch) {
        logWarn('Batch not found', { batchId: id });
        return null;
      }

      logInfo('Batch fetched successfully', { batchId: id, batchName: batch.batchName });
      return batch as UploadBatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to fetch batch', error as Error, { batchId: id });
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการดึงข้อมูล batch: ${errorMessage}`);
    }
  }

  /**
   * อัปเดต batch
   */
  async updateBatch(id: string, data: BatchUpdateRequest): Promise<UploadBatch> {
    try {
      logInfo('Updating batch', { batchId: id, updates: data });

      const batch = await this.databaseService.updateUploadBatch(id, data);

      logInfo('Batch updated successfully', { batchId: id, batchName: batch.batchName });
      return batch as UploadBatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to update batch', error as Error, { batchId: id, updates: data });
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการอัปเดต batch: ${errorMessage}`);
    }
  }

  /**
   * ลบ batch
   */
  async deleteBatch(id: string): Promise<void> {
    try {
      logInfo('Deleting batch', { batchId: id });

      // ตรวจสอบว่า batch มีอยู่หรือไม่
      const batch = await this.databaseService.getUploadBatch(id);
      if (!batch) {
        throw new ResourceNotFoundError('batch', id);
      }

      // ลบ batch และไฟล์ที่เกี่ยวข้อง
      // TODO: เพิ่มการลบไฟล์จริง
      await this.databaseService.updateUploadBatch(id, { status: BatchStatus.ERROR });

      logInfo('Batch deleted successfully', { batchId: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to delete batch', error as Error, { batchId: id });
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการลบ batch: ${errorMessage}`);
    }
  }

  /**
   * อัปเดตสถานะ batch
   */
  async updateBatchStatus(id: string, status: BatchStatus): Promise<void> {
    try {
      logInfo('Updating batch status', { batchId: id, status });

      await this.databaseService.updateUploadBatch(id, { status });

      logInfo('Batch status updated successfully', { batchId: id, status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to update batch status', error as Error, { batchId: id, status });
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการอัปเดตสถานะ batch: ${errorMessage}`);
    }
  }

  /**
   * ดึงไฟล์ใน batch
   */
  async getBatchFiles(id: string, params: IGetBatchesParams): Promise<BatchFilesResponse> {
    try {
      logInfo('Fetching batch files', { batchId: id, params });

      // ตรวจสอบว่า batch มีอยู่หรือไม่
      const batch = await this.databaseService.getUploadBatch(id);
      if (!batch) {
        throw new ResourceNotFoundError('batch', id);
      }

      // ดึงไฟล์ใน batch
      const result = await this.databaseService.getUploadRecords({
        page: params.page || 1,
        limit: params.limit || 20,
        batchId: id,
        status: params.status as any,
        userId: params.userId as any,
        startDate: params.startDate as any,
        endDate: params.endDate as any,
      });

      const response: BatchFilesResponse = {
        batch: batch as UploadBatch,
        files: result.records as UploadRecord[],
        pagination: {
          page: result.page,
          limit: params.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      logInfo('Batch files fetched successfully', {
        batchId: id,
        totalFiles: result.total,
        page: result.page
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to fetch batch files', error as Error, { batchId: id, params });
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการดึงไฟล์ใน batch: ${errorMessage}`);
    }
  }

  /**
   * ประมวลผล batch
   */
  async processBatch(batchId: string): Promise<IBatchProcessingResult> {
    const startTime = Date.now();

    try {
      logInfo('Starting batch processing', { batchId });

      // ตรวจสอบว่า batch มีอยู่หรือไม่
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new ResourceNotFoundError('batch', batchId);
      }

      // อัปเดตสถานะเป็น processing
      await this.updateBatchStatus(batchId, BatchStatus.PROCESSING);

      // ดึงไฟล์ใน batch
      const filesResult = await this.getBatchFiles(batchId, { limit: 1000 });
      const files = filesResult.files;

      let processedFiles = 0;
      let failedFiles = 0;
      let totalRecords = 0;
      let processedRecords = 0;
      let failedRecords = 0;
      const errors: ProcessingError[] = [];

      // ประมวลผลไฟล์แต่ละไฟล์
      for (const file of files) {
        try {
          const fileResult = await this.processFileInBatch(file.id, batchId);

          if (fileResult.success) {
            processedFiles++;
            processedRecords += fileResult.recordsProcessed;
            totalRecords += fileResult.recordsProcessed + fileResult.recordsFailed;
          } else {
            failedFiles++;
            failedRecords += fileResult.recordsFailed;
            totalRecords += fileResult.recordsProcessed + fileResult.recordsFailed;
          }

          // เพิ่ม errors จากไฟล์
          errors.push(...fileResult.errors);

        } catch (error) {
          failedFiles++;
          errors.push({
            type: 'processing',
            message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ ${file.filename}: ${error.message}`,
            code: 'FILE_PROCESSING_ERROR',
            timestamp: new Date(),
            retryable: true,
          });
        }
      }

      // อัปเดตสถิติ batch
      const processingTime = Date.now() - startTime;
      const finalStatus = failedFiles === 0 ? BatchStatus.SUCCESS :
        processedFiles === 0 ? BatchStatus.ERROR : BatchStatus.PARTIAL;

      await this.databaseService.updateUploadBatch(batchId, {
        totalFiles: files.length,
        successFiles: processedFiles,
        errorFiles: failedFiles,
        processingFiles: 0,
        totalRecords,
        status: finalStatus,
      });

      const result: IBatchProcessingResult = {
        batchId,
        success: finalStatus === 'success',
        totalFiles: files.length,
        processedFiles,
        failedFiles,
        totalRecords,
        processedRecords,
        failedRecords,
        processingTime,
        errors,
        progress: {
          batchId,
          batchName: batch.batchName,
          totalFiles: files.length,
          completedFiles: processedFiles + failedFiles,
          failedFiles,
          processingFiles: 0,
          progress: 100,
          status: finalStatus,
        },
      };

      logInfo('Batch processing completed', {
        batchId,
        success: result.success,
        processingTime,
        processedFiles,
        failedFiles
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Batch processing failed', error as Error, { batchId, processingTime });

      // อัปเดตสถานะเป็น error
      await this.updateBatchStatus(batchId, BatchStatus.ERROR);

      throw new BatchServiceError(`เกิดข้อผิดพลาดในการประมวลผล batch: ${errorMessage}`);
    }
  }

  /**
   * ประมวลผลไฟล์ใน batch
   */
  async processFileInBatch(fileId: string, batchId: string): Promise<IFileProcessingInBatchResult> {
    const startTime = Date.now();

    try {
      logInfo('Processing file in batch', { fileId, batchId });

      // ดึงข้อมูลไฟล์
      const fileRecord = await this.databaseService.getUploadRecord(fileId);
      if (!fileRecord) {
        throw new ResourceNotFoundError('file', fileId);
      }

      // อัปเดตสถานะไฟล์เป็น processing
      await this.databaseService.updateUploadRecord(fileId, { status: 'processing' });

      // ประมวลผลไฟล์
      const processingResult = await this.fileProcessingService.processFile(
        fileRecord.filePath,
        fileRecord.filename,
        {
          isValid: fileRecord.isValid || false,
          errors: fileRecord.errors ? JSON.parse(fileRecord.errors) : [],
          warnings: fileRecord.warnings ? JSON.parse(fileRecord.warnings) : [],
          fileType: fileRecord.fileType as any,
          recordCount: fileRecord.totalRecords || 0,
          fileSize: fileRecord.fileSize,
        }
      );

      // อัปเดตผลการประมวลผล
      await this.databaseService.updateUploadRecord(fileId, {
        status: processingResult.success ? 'completed' : 'failed',
        processedAt: new Date(),
        totalRecords: processingResult.statistics.totalRecords,
        validRecords: processingResult.statistics.validRecords,
        invalidRecords: processingResult.statistics.invalidRecords,
        processedRecords: processingResult.statistics.processedRecords,
        skippedRecords: processingResult.statistics.skippedRecords,
        processingTime: processingResult.statistics.processingTime,
        errorMessage: processingResult.success ? null : processingResult.message,
      });

      const processingTime = Date.now() - startTime;
      const result: IFileProcessingInBatchResult = {
        fileId,
        success: processingResult.success,
        processingTime,
        recordsProcessed: processingResult.statistics.processedRecords,
        recordsFailed: processingResult.statistics.invalidRecords,
        errors: processingResult.errors ? processingResult.errors.map(error => ({
          type: 'processing',
          message: error,
          code: 'PROCESSING_ERROR',
          timestamp: new Date(),
          retryable: false,
        })) : [],
      };

      logInfo('File processing in batch completed', {
        fileId,
        batchId,
        success: result.success,
        processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('File processing in batch failed', error as Error, { fileId, batchId, processingTime });

      // อัปเดตสถานะไฟล์เป็น failed
      await this.databaseService.updateUploadRecord(fileId, {
        status: 'failed',
        errorMessage: errorMessage,
      });

      return {
        fileId,
        success: false,
        processingTime,
        recordsProcessed: 0,
        recordsFailed: 0,
        errors: [{
          type: 'processing',
          message: errorMessage,
          code: 'FILE_PROCESSING_ERROR',
          timestamp: new Date(),
          retryable: true,
        }],
      };
    }
  }

  /**
   * ดึงสถิติ batch
   */
  async getBatchStatistics(): Promise<BatchStatistics> {
    try {
      logInfo('Fetching batch statistics');

      const batches = await this.databaseService.getUploadBatches({ limit: 1000 });

      const totalBatches = batches.total;
      const activeBatches = batches.batches.filter(b => b.status === 'processing').length;
      const completedBatches = batches.batches.filter(b => b.status === 'success').length;
      const failedBatches = batches.batches.filter(b => b.status === 'error').length;

      const totalFiles = batches.batches.reduce((sum, b) => sum + b.totalFiles, 0);
      const totalRecords = batches.batches.reduce((sum, b) => sum + b.totalRecords, 0);
      const totalSize = batches.batches.reduce((sum, b) => sum + b.totalSize, 0);

      const averageProcessingTime = batches.batches.length > 0
        ? batches.batches.reduce((sum, b) => sum + (b.uploadDate.getTime() - b.uploadDate.getTime()), 0) / batches.batches.length
        : 0;

      const successRate = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

      const lastBatchDate = batches.batches.length > 0
        ? batches.batches.reduce((latest, b) => b.uploadDate > latest ? b.uploadDate : latest, batches.batches[0]?.uploadDate || new Date())
        : undefined;

      const batchTypeBreakdown = {
        dbf: 0,
        rep: 0,
        statement: 0,
      };

      // คำนวณ batch type breakdown จากไฟล์ในแต่ละ batch
      for (const batch of batches.batches) {
        const files = await this.getBatchFiles(batch.id, { limit: 1000 });
        for (const file of files.files) {
          const fileType = file.fileType.toLowerCase();
          if (fileType in batchTypeBreakdown) {
            batchTypeBreakdown[fileType as keyof typeof batchTypeBreakdown]++;
          }
        }
      }

      const statistics: BatchStatistics = {
        totalBatches,
        activeBatches,
        completedBatches,
        failedBatches,
        totalFiles,
        totalRecords,
        totalSize,
        averageProcessingTime,
        successRate,
        lastBatchDate: lastBatchDate || new Date(),
        batchTypeBreakdown,
      };

      logInfo('Batch statistics fetched successfully', {
        totalBatches,
        activeBatches,
        completedBatches,
        failedBatches
      });

      return statistics;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to fetch batch statistics', error as Error);
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการดึงสถิติ batch: ${errorMessage}`);
    }
  }

  /**
   * ดึง metrics ของ batch
   */
  async getBatchMetrics(batchId: string): Promise<BatchMetrics> {
    try {
      logInfo('Fetching batch metrics', { batchId });

      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new ResourceNotFoundError('batch', batchId);
      }

      const files = await this.getBatchFiles(batchId, { limit: 1000 });

      const processedFiles = files.files.filter(f => f.status === 'completed').length;
      const failedFiles = files.files.filter(f => f.status === 'failed').length;

      const processedRecords = files.files.reduce((sum, f) => sum + (f.processedRecords || 0), 0);
      const failedRecords = files.files.reduce((sum, f) => sum + (f.invalidRecords || 0), 0);

      const averageProcessingTime = files.files.length > 0
        ? files.files.reduce((sum, f) => sum + (f.processingTime || 0), 0) / files.files.length
        : 0;

      const metrics: BatchMetrics = {
        batchId,
        startTime: batch.uploadDate,
        endTime: batch.status !== 'processing' ? batch.uploadDate : batch.uploadDate,
        duration: batch.status !== 'processing' ? 0 : 0,
        totalFiles: batch.totalFiles,
        processedFiles,
        failedFiles,
        totalRecords: batch.totalRecords,
        processedRecords,
        failedRecords,
        averageProcessingTime,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0, // TODO: เพิ่มการวัด CPU usage
        diskUsage: 0, // TODO: เพิ่มการวัด disk usage
      };

      logInfo('Batch metrics fetched successfully', {
        batchId,
        totalFiles: metrics.totalFiles,
        processedFiles: metrics.processedFiles
      });

      return metrics;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to fetch batch metrics', error as Error, { batchId });
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new BatchServiceError(`เกิดข้อผิดพลาดในการดึง metrics ของ batch: ${errorMessage}`);
    }
  }

  /**
   * สร้าง error summary สำหรับ batch
   */
  createBatchErrorSummary(batchId: string, errors: ProcessingError[]): BatchErrorSummary {
    const errorTypes = {
      validation: 0,
      processing: 0,
      system: 0,
      file: 0,
      database: 0,
    };

    let retryableErrors = 0;

    errors.forEach(error => {
      if (error.type in errorTypes) {
        errorTypes[error.type as keyof typeof errorTypes]++;
      }
      if (error.retryable) {
        retryableErrors++;
      }
    });

    return {
      batchId,
      totalErrors: errors.length,
      errors,
      errorTypes,
      canRetry: retryableErrors > 0,
      retryableErrors,
    };
  }
}

export default BatchService; 