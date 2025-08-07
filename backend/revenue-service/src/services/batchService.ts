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
  BatchStatistics,
  BatchMetrics,
  ProcessingError,
  BatchErrorSummary,
  BatchProcessingResult,
  FileProcessingInBatchResult
} from '@/types';
import { DatabaseService } from './databaseService';
import { FileProcessingService } from './fileProcessingService';
import { ValidationService } from './validationService';
import { BatchError, ResourceNotFoundError, FileValidationError } from '@/utils/errorHandler';
import {
  logInfo,
  logError,
  logBatchCreation
} from '@/utils/logger';

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
  async createBatch(data: BatchCreateRequest): Promise<UploadBatch> {
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
      throw new BatchError(`เกิดข้อผิดพลาดในการสร้าง batch: ${errorMessage}`);
    }
  }

  /**
   * ดึงรายการ batches
   */
  async getBatches(params: BatchQueryParams): Promise<BatchListResponse> {
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

      return {
        batches: result.batches as UploadBatch[],
        pagination: {
          page: result.page,
          limit: params.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to get batches', error as Error, params);
      throw new BatchError(`เกิดข้อผิดพลาดในการดึงรายการ batches: ${errorMessage}`);
    }
  }

  /**
   * ดึงข้อมูล batch เฉพาะ
   */
  async getBatch(id: string): Promise<UploadBatch | null> {
    try {
      logInfo('Fetching batch', { id });

      const batch = await this.databaseService.getUploadBatch(id);
      return batch as UploadBatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to get batch', error as Error, { id });
      throw new BatchError(`เกิดข้อผิดพลาดในการดึงข้อมูล batch: ${errorMessage}`);
    }
  }

  /**
   * อัปเดต batch
   */
  async updateBatch(id: string, data: BatchUpdateRequest): Promise<UploadBatch> {
    try {
      logInfo('Updating batch', { id, data });

      const batch = await this.databaseService.updateUploadBatch(id, data);
      return batch as UploadBatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to update batch', error as Error, { id, data });
      throw new BatchError(`เกิดข้อผิดพลาดในการอัปเดต batch: ${errorMessage}`);
    }
  }

  /**
   * ลบ batch
   */
  async deleteBatch(id: string): Promise<void> {
    try {
      logInfo('Deleting batch', { id });

      const batch = await this.databaseService.getUploadBatch(id);
      if (!batch) {
        throw new ResourceNotFoundError('batch', id);
      }
      // TODO: เพิ่มการลบไฟล์จริง
      await this.databaseService.updateUploadBatch(id, { status: 'error' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to delete batch', error as Error, { id });
      throw new BatchError(`เกิดข้อผิดพลาดในการลบ batch: ${errorMessage}`);
    }
  }

  /**
   * อัปเดตสถานะ batch
   */
  async updateBatchStatus(id: string, status: BatchStatus): Promise<void> {
    try {
      logInfo('Updating batch status', { id, status });

      await this.databaseService.updateUploadBatch(id, { status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to update batch status', error as Error, { id, status });
      throw new BatchError(`เกิดข้อผิดพลาดในการอัปเดตสถานะ batch: ${errorMessage}`);
    }
  }

  /**
   * ดึงไฟล์ใน batch
   */
  async getBatchFiles(id: string, params: BatchQueryParams): Promise<BatchFilesResponse> {
    try {
      logInfo('Fetching batch files', { id, params });

      const batch = await this.databaseService.getUploadBatch(id);
      if (!batch) {
        throw new ResourceNotFoundError('batch', id);
      }

      const result = await this.databaseService.getUploadRecords({
        page: params.page || 1,
        limit: params.limit || 20,
        batchId: id,
        status: params.status as any,
        userId: params.userId as any,
        startDate: params.startDate as any,
        endDate: params.endDate as any,
      });

      return {
        batch: batch as UploadBatch,
        files: result.records as UploadRecord[],
        pagination: {
          page: result.page,
          limit: params.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to get batch files', error as Error, { id, params });
      throw new BatchError(`เกิดข้อผิดพลาดในการดึงไฟล์ใน batch: ${errorMessage}`);
    }
  }

  /**
   * ประมวลผล batch
   */
  async processBatch(batchId: string): Promise<BatchProcessingResult> {
    const startTime = Date.now();

    try {
      logInfo('Starting batch processing', { batchId });

      // ตรวจสอบว่า batch มีอยู่หรือไม่
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new ResourceNotFoundError('batch', batchId);
      }

      // ตรวจสอบ batch security ก่อนประมวลผล
      const batchFiles = await this.getBatchFiles(batchId, { limit: 1000 });
      if (batchFiles.files.length > 0) {
        // สร้าง mock files สำหรับ validation (เนื่องจากไฟล์ถูกบันทึกแล้ว)
        const mockFiles = batchFiles.files.map(file => ({
          originalname: file.filename,
          size: file.fileSize,
          mimetype: 'application/octet-stream',
          buffer: Buffer.alloc(0), // ไม่ใช้ buffer ในการตรวจสอบ
        } as Express.Multer.File));

        try {
          const batchSecurityValidation = await this.validationService.validateBatchSecurity(batchId, mockFiles);
          if (!batchSecurityValidation.isValid) {
            throw new FileValidationError('Batch ไม่ปลอดภัย', {
              batchId,
              errors: batchSecurityValidation.errors,
            });
          }
        } catch (error) {
          if (error instanceof FileValidationError) {
            throw error;
          }
          // ถ้าไม่ใช่ FileValidationError ให้ดำเนินการต่อ
          logError('Batch security validation failed', error as Error, { batchId });
        }
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
          // ตรวจสอบ file integrity ก่อนประมวลผล
          const integrityValidation = await this.validationService.validateFileIntegrity(file.filePath);
          if (!integrityValidation.isValid) {
            failedFiles++;
            errors.push({
              type: 'validation',
              message: `ไฟล์ ${file.filename} ไม่สมบูรณ์: ${integrityValidation.errors.map(e => e.message).join(', ')}`,
              code: 'FILE_INTEGRITY_ERROR',
              timestamp: new Date(),
              retryable: false,
            });
            continue;
          }

          // ตรวจสอบ checksum
          try {
            const checksum = await this.validationService.generateChecksum(file.filePath, 'sha256');
            logInfo('File checksum generated', { 
              fileId: file.id, 
              filename: file.filename, 
              checksum 
            });
          } catch (error) {
            logError('Checksum generation failed', error as Error, { 
              fileId: file.id, 
              filename: file.filename 
            });
            // ไม่หยุดการประมวลผล แต่บันทึก warning
          }

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
            message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      const result: BatchProcessingResult = {
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

      throw new BatchError(`เกิดข้อผิดพลาดในการประมวลผล batch: ${errorMessage}`);
    }
  }

  /**
   * ประมวลผลไฟล์ใน batch
   */
  async processFileInBatch(fileId: string, batchId: string): Promise<FileProcessingInBatchResult> {
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
      const result: FileProcessingInBatchResult = {
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
      throw new BatchError(`เกิดข้อผิดพลาดในการดึงสถิติ batch: ${errorMessage}`);
    }
  }

  /**
   * ดึง metrics ของ batch
   */
  async getBatchMetrics(batchId: string): Promise<BatchMetrics> {
    try {
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

      // คำนวณ memory usage
      const memoryUsage = process.memoryUsage().heapUsed;

      // คำนวณ CPU usage (ประมาณการ)
      const cpuUsage = process.cpuUsage();
      const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / 1000000; // แปลงเป็นวินาที

      // คำนวณ disk usage (ประมาณการ)
      const diskUsage = batch.totalSize; // ใช้ขนาดไฟล์รวมเป็น disk usage

      const result: BatchMetrics = {
        batchId,
        startTime: batch.uploadDate,
        endTime: batch.status !== 'processing' ? batch.uploadDate : new Date(),
        duration: batch.status !== 'processing' ? 0 : 0, // ใช้ 0 แทนการคำนวณจริง
        totalFiles: batch.totalFiles,
        processedFiles,
        failedFiles,
        totalRecords: batch.totalRecords,
        processedRecords,
        failedRecords,
        averageProcessingTime,
        memoryUsage,
        cpuUsage: cpuUsagePercent,
        diskUsage,
      };

      return result;
    } catch (error) {
      logError('Failed to get batch metrics', error as Error, { batchId });
      throw error;
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