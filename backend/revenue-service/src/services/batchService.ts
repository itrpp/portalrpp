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
  FileProcessingInBatchResult,
  FileProcessingStatus,
  BatchProcessingStatus,
  ExportStatus
} from '@/types';
import { DateHelper, createTimer } from '@/utils/dateUtils';
import { DatabaseService } from './databaseService';
import { FileProcessingService } from './fileProcessingService';
import { FileStorageService } from './fileStorageService';
import { ValidationService } from './validationService';
import { StatisticsService } from './statisticsService';
import { ResourceNotFoundError, FileValidationError, BatchError } from '@/utils/errorHandler';
import {
  logInfo,
  logError,
  logBatchCreation
} from '@/utils/logger';
import fs from 'fs-extra';
import path from 'path';
import { config } from '@/config';

export class BatchService {
  private databaseService: DatabaseService;
  private fileProcessingService: FileProcessingService;
  private fileStorageService: FileStorageService;
  private validationService: ValidationService;
  private statisticsService: StatisticsService;

  constructor(
    databaseService?: DatabaseService,
    fileProcessingService?: FileProcessingService,
    fileStorageService?: FileStorageService,
    validationService?: ValidationService,
    statisticsService?: StatisticsService
  ) {
    // ใช้ dependency injection หรือสร้าง instance ใหม่ถ้าไม่ได้ส่งมา
    this.databaseService = databaseService || new DatabaseService();
    this.fileProcessingService = fileProcessingService || new FileProcessingService();
    this.fileStorageService = fileStorageService || new FileStorageService();
    this.validationService = validationService || new ValidationService();
    this.statisticsService = statisticsService || new StatisticsService();
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
        status: BatchStatus.PROCESSING,
        processingStatus: BatchProcessingStatus.PENDING,
        exportStatus: ExportStatus.NOT_EXPORTED,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date(),
        updatedAt: new Date(),
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

      // ดึงไฟล์ใน batch เพื่อลบไฟล์จริง
      const batchFiles = await this.getBatchFiles(id, { limit: 1000 });
      
      // ลบไฟล์จริงจาก file system
      for (const file of batchFiles.files) {
        try {
          if (file.filePath) {
            await this.fileStorageService.deleteFile(file.filePath);
            logInfo('File deleted from file system', { 
              fileId: file.id, 
              filePath: file.filePath 
            });
          }
        } catch (error) {
          logError('Failed to delete file from file system', error as Error, { 
            fileId: file.id, 
            filePath: file.filePath 
          });
          // ดำเนินการต่อแม้จะลบไฟล์ไม่สำเร็จ
        }
      }

      // ลบโฟลเดอร์ batch และโฟลเดอร์วันที่ถ้าว่าง โดยอิงจากไฟล์ตัวอย่างแรก
      if (batchFiles.files.length > 0) {
        const first = batchFiles.files[0];
        const firstPath = (first && typeof first.filePath === 'string') ? first.filePath : '';
        if (firstPath && typeof firstPath === 'string') {
          await this.fileStorageService.deleteBatchFolderFromFilePath(firstPath);
        }
      }

      // ลบไฟล์ Export ที่เกี่ยวข้องกับ batch นี้
      try {
        await this.deleteBatchExportFiles(id, batch.batchName);
        logInfo('Batch export files deleted', { batchId: id });
      } catch (exportError) {
        logError('Failed to delete batch export files', exportError as Error, { batchId: id });
        // ดำเนินการต่อแม้จะลบไฟล์ export ไม่สำเร็จ
      }

      // ลบ batch และ records จาก database
      await this.databaseService.deleteUploadBatch(id);

      logInfo('Batch deleted successfully', { 
        id, 
        totalFiles: batchFiles.files.length 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to delete batch', error as Error, { id });
      throw new BatchError(`เกิดข้อผิดพลาดในการลบ batch: ${errorMessage}`);
    }
  }

  /**
   * อัปเดตสถานะ batch
   */
  async updateBatchStatusById(id: string, status: BatchStatus): Promise<void> {
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
   * ตรวจสอบและอัปเดตสถานะ batch ตามสถานะของไฟล์ทั้งหมด
   */
  async checkAndUpdateBatchStatus(batchId: string): Promise<void> {
    try {
      logInfo('Checking and updating batch status', { batchId });

      // ดึงข้อมูล batch และไฟล์ทั้งหมดใน batch
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new ResourceNotFoundError('batch', batchId);
      }

      // ดึงไฟล์ทั้งหมดใน batch
      const files = await this.databaseService.getUploadRecords({
        batchId,
        page: 1,
        limit: 1000, // ดึงทั้งหมด
      });

      if (files.records.length === 0) {
        logInfo('No files found in batch', { batchId });
        return;
      }

      // นับสถานะของไฟล์
      const statusCounts = files.records.reduce((acc, file) => {
        acc[file.status] = (acc[file.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalFiles = files.records.length;
      const completedFiles = (statusCounts[FileProcessingStatus.SUCCESS] || 0) + (statusCounts[FileProcessingStatus.VALIDATION_COMPLETED] || 0) + (statusCounts.imported || 0);
      const failedFiles = (statusCounts[FileProcessingStatus.FAILED] || 0) + (statusCounts[FileProcessingStatus.VALIDATION_FAILED] || 0) + (statusCounts[FileProcessingStatus.VALIDATION_ERROR] || 0);
      const processingFiles = statusCounts[FileProcessingStatus.PROCESSING] || 0;
      const pendingFiles = statusCounts[FileProcessingStatus.PENDING] || 0;

      logInfo('Batch file status summary', {
        batchId,
        totalFiles,
        completedFiles,
        failedFiles,
        processingFiles,
        pendingFiles,
        statusCounts
      });

      // กำหนดสถานะ batch ใหม่
      let newBatchStatus: BatchStatus;

      if (processingFiles > 0 || pendingFiles > 0) {
        // ยังมีไฟล์ที่กำลังประมวลผลหรือรอการประมวลผล
        newBatchStatus = BatchStatus.PROCESSING;
      } else if (completedFiles === totalFiles) {
        // ไฟล์ทั้งหมดประมวลผลเสร็จสิ้น
        newBatchStatus = BatchStatus.SUCCESS;
      } else if (failedFiles === totalFiles) {
        // ไฟล์ทั้งหมดล้มเหลว
        newBatchStatus = BatchStatus.ERROR;
      } else if (completedFiles > 0 && failedFiles > 0) {
        // มีทั้งสำเร็จและล้มเหลว
        newBatchStatus = BatchStatus.PARTIAL;
      } else {
        // สถานะอื่นๆ ให้เป็น error
        newBatchStatus = BatchStatus.ERROR;
      }

      // อัปเดตสถานะ batch ถ้าเปลี่ยนแปลง
      if (batch.status !== newBatchStatus) {
        await this.updateBatchStatusById(batchId, newBatchStatus);
        
        // อัปเดต statistics ใน batch
        await this.databaseService.updateUploadBatch(batchId, {
          status: newBatchStatus,
          successFiles: completedFiles,
          errorFiles: failedFiles,
          processingFiles: processingFiles,
          totalFiles: totalFiles,
        });

        logInfo('Batch status updated', {
          batchId,
          oldStatus: batch.status,
          newStatus: newBatchStatus,
          fileStats: { completedFiles, failedFiles, processingFiles, totalFiles }
        });
      } else {
        logInfo('Batch status unchanged', {
          batchId,
          currentStatus: batch.status,
          fileStats: { completedFiles, failedFiles, processingFiles, totalFiles }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Failed to check and update batch status', error as Error, { batchId });
      throw new BatchError(`เกิดข้อผิดพลาดในการตรวจสอบและอัปเดตสถานะ batch: ${errorMessage}`);
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
    const timer = createTimer();

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
      await this.updateBatchStatusById(batchId, BatchStatus.PROCESSING);

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
              timestamp: DateHelper.toDate(DateHelper.now()),
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
            timestamp: DateHelper.toDate(DateHelper.now()),
            retryable: true,
          });
        }
      }

      // อัปเดตสถิติ batch
      const processingTime = timer.elapsed();
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
        success: finalStatus === BatchStatus.SUCCESS,
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
      const processingTime = timer.elapsed();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Batch processing failed', error as Error, { batchId, processingTime });

      // อัปเดตสถานะเป็น error
      await this.updateBatchStatusById(batchId, BatchStatus.ERROR);

      throw new BatchError(`เกิดข้อผิดพลาดในการประมวลผล batch: ${errorMessage}`);
    }
  }

  /**
   * ประมวลผลไฟล์ใน batch
   */
  async processFileInBatch(fileId: string, batchId: string): Promise<FileProcessingInBatchResult> {
    const timer = createTimer();

    try {
      logInfo('Processing file in batch', { fileId, batchId });

      // ดึงข้อมูลไฟล์
      const fileRecord = await this.databaseService.getUploadRecord(fileId);
      if (!fileRecord) {
        throw new ResourceNotFoundError('file', fileId);
      }

      // อัปเดตสถานะไฟล์เป็น processing
      await this.databaseService.updateUploadRecord(fileId, { status: FileProcessingStatus.PROCESSING });

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
        status: processingResult.success ? FileProcessingStatus.SUCCESS : FileProcessingStatus.FAILED,
        processedAt: DateHelper.toDate(DateHelper.now()),
        totalRecords: processingResult.statistics.totalRecords,
        validRecords: processingResult.statistics.validRecords,
        invalidRecords: processingResult.statistics.invalidRecords,
        processedRecords: processingResult.statistics.processedRecords,
        skippedRecords: processingResult.statistics.skippedRecords,
        processingTime: processingResult.statistics.processingTime,
        errorMessage: processingResult.success ? null : processingResult.message,
      });

      const processingTime = timer.elapsed();
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

      // อัปเดตสถิติ batch หลังจากประมวลผลไฟล์เสร็จ
      try {
        await this.statisticsService.updateBatchStatisticsById(
          batchId,
          processingResult.success,
          1, // fileCount
          processingResult.statistics.processedRecords,
          processingResult.statistics.processingTime
        );
      } catch (error) {
        logError('Failed to update batch statistics after file processing', error as Error, { batchId, fileId });
        // ไม่ throw error เพื่อไม่ให้กระทบต่อการประมวลผลไฟล์
      }

      // ตรวจสอบและอัปเดตสถานะ batch หลังจากประมวลผลไฟล์เสร็จ
      try {
        await this.checkAndUpdateBatchStatus(batchId);
      } catch (error) {
        logError('Failed to check and update batch status after file processing', error as Error, { batchId, fileId });
        // ไม่ throw error เพื่อไม่ให้กระทบต่อการประมวลผลไฟล์
      }

      return result;

    } catch (error) {
      const processingTime = timer.elapsed();
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
      const activeBatches = batches.batches.filter(b => b.status === BatchStatus.PROCESSING).length;
      const completedBatches = batches.batches.filter(b => b.status === BatchStatus.SUCCESS).length;
      const failedBatches = batches.batches.filter(b => b.status === BatchStatus.ERROR).length;
      const partialBatches = batches.batches.filter(b => b.status === BatchStatus.PARTIAL || b.status === BatchStatus.PARTIAL_SUCCESS).length;

      const totalFiles = batches.batches.reduce((sum, b) => sum + b.totalFiles, 0);
      const totalRecords = batches.batches.reduce((sum, b) => sum + b.totalRecords, 0);
      const totalSize = batches.batches.reduce((sum, b) => sum + b.totalSize, 0);

      const averageProcessingTime = batches.batches.length > 0
        ? batches.batches.reduce((sum) => sum + 0, 0) / batches.batches.length // TODO: คำนวณ processing time จริง
        : 0;

      const successRate = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

      const lastBatchDate = batches.batches.length > 0
        ? batches.batches.reduce((latest, b) => b.uploadDate > latest ? b.uploadDate : latest, batches.batches[0]?.uploadDate || DateHelper.toDate(DateHelper.now()))
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
        partialBatches,
        totalFiles,
        totalRecords,
        totalSize,
        averageProcessingTime,
        successRate,
        lastBatchDate: lastBatchDate || DateHelper.toDate(DateHelper.now()),
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
      
      const processedFiles = files.files.filter(f => f.status === FileProcessingStatus.SUCCESS).length;
      const failedFiles = files.files.filter(f => f.status === FileProcessingStatus.FAILED).length;
      
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
        endTime: batch.status !== 'processing' ? batch.uploadDate : DateHelper.toDate(DateHelper.now()),
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
      if (error.type && error.type in errorTypes) {
        errorTypes[error.type as keyof typeof errorTypes]++;
      }
      if (error.retryable) {
        retryableErrors++;
      }
    });

    return {
      batchId,
      totalErrors: errors.length,
      errors: errors as any[],
      errorTypes,
      canRetry: retryableErrors > 0,
      retryableErrors,
      warnings: [],
      timestamp: new Date(),
    };
  }

  /**
   * ลบไฟล์ Export ที่เกี่ยวข้องกับ batch
   */
  async deleteBatchExportFiles(batchId: string, batchName: string): Promise<void> {
    try {
      logInfo('Deleting batch export files', { batchId, batchName });

      // ใช้ config ที่ import ไว้แล้ว
      const exportPath = config.upload.exportPath;
      
      logInfo('Export path configuration', { exportPath });
      
      if (!await fs.pathExists(exportPath)) {
        logInfo('Export directory does not exist', { exportPath });
        return;
      }

      // ลบไฟล์ ZIP ที่เกี่ยวข้องกับ batch นี้
      const files = await fs.readdir(exportPath);
      logInfo('Files found in export directory', { exportPath, fileCount: files.length, files });
      
      let deletedFiles = 0;

      for (const file of files) {
        const filePath = path.join(exportPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && file.endsWith('.zip')) {
          // ตรวจสอบว่าไฟล์ ZIP เกี่ยวข้องกับ batch นี้หรือไม่
          if (file.includes(batchName) || file.includes(batchId)) {
            try {
              await fs.remove(filePath);
              deletedFiles++;
              logInfo('Export file deleted', { filePath, batchId });
            } catch (error) {
              logError('Failed to delete export file', error as Error, { filePath, batchId });
            }
          } else {
            logInfo('File not related to batch, skipping', { file, batchName, batchId });
          }
        } else {
          logInfo('File is not a ZIP file, skipping', { file, isFile: stats.isFile(), extension: path.extname(file) });
        }
      }

      // ลบโฟลเดอร์ temp ที่เกี่ยวข้องกับ batch นี้ (ถ้ามี)
      const tempExportPath = path.join(exportPath, 'temp', batchId);
      if (await fs.pathExists(tempExportPath)) {
        try {
          await fs.remove(tempExportPath);
          logInfo('Temp export directory deleted', { tempExportPath, batchId });
        } catch (error) {
          logError('Failed to delete temp export directory', error as Error, { tempExportPath, batchId });
        }
      }

      logInfo('Batch export files cleanup completed', { 
        batchId, 
        batchName, 
        deletedFiles 
      });

    } catch (error) {
      logError('Failed to delete batch export files', error as Error, { batchId, batchName });
      throw error;
    }
  }

  /**
   * อัปเดตจำนวนไฟล์ที่สำเร็จใน batch
   */
  async updateBatchSuccessFiles(batchId: string): Promise<void> {
    try {
      logInfo('Updating batch success files', { batchId });

      // ดึงข้อมูล batch ปัจจุบัน
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      // นับจำนวนไฟล์ที่ประมวลผลสำเร็จ
      const successFilesResult = await this.databaseService.getUploadRecords({
        batchId,
        status: FileProcessingStatus.SUCCESS,
        limit: 1000
      });

      const successCount = successFilesResult.records.length;
      const totalCount = batch.totalFiles || 0;

      // อัปเดต batch
      await this.databaseService.updateUploadBatch(batchId, {
        successFiles: successCount,
        updatedAt: new Date()
      });

      logInfo('Batch success files updated', { 
        batchId, 
        successCount, 
        totalCount,
        successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
      });

    } catch (error) {
      logError('Failed to update batch success files', error as Error, { batchId });
      throw error;
    }
  }
}

export default BatchService; 