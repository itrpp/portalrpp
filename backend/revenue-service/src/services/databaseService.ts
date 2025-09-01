// ========================================
// DATABASE SERVICE
// ========================================

import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from '@/utils/logger';
import { FileType, FileProcessingStatus, BatchStatus, ExportStatus, BatchProcessingStatus } from '@/types';

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
}

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
}

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

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * ดึง Prisma client instance
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * สร้าง upload batch ใหม่
   */
  async createUploadBatch(data: Omit<IUploadBatch, 'id' | 'uploadDate'>): Promise<IUploadBatch> {
    try {
      const batch = await this.prisma.uploadBatch.create({
        data: {
          batchName: data.batchName,
          totalFiles: data.totalFiles,
          successFiles: data.successFiles,
          errorFiles: data.errorFiles,
          processingFiles: data.processingFiles,
          totalRecords: data.totalRecords,
          totalSize: data.totalSize,
          status: data.status,
          processingStatus: data.processingStatus || BatchProcessingStatus.PENDING,
          exportStatus: data.exportStatus || ExportStatus.NOT_EXPORTED,
          userId: data.userId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });

      logInfo('Upload batch created', { id: batch.id, batchName: batch.batchName });
      return batch as IUploadBatch;
    } catch (error) {
      logError('Failed to create upload batch', error as Error);
      throw error;
    }
  }

  /**
   * อัปเดต upload batch
   */
  async updateUploadBatch(id: string, data: Partial<IUploadBatch>): Promise<IUploadBatch> {
    try {
      const batch = await this.prisma.uploadBatch.update({
        where: { id },
        data,
      });
      logInfo('Upload batch updated', { id: batch.id, batchName: batch.batchName });
      return batch as IUploadBatch;
    } catch (error) {
      logError('Failed to update upload batch', error as Error);
      throw error;
    }
  }

  /**
   * อัปเดต successFiles ใน upload batch โดยนับจากไฟล์ที่มี status เป็น success หรือ validation_completed
   */
  async updateBatchSuccessFiles(batchId: string): Promise<void> {
    try {
      // นับไฟล์ที่มี status เป็น success, validation_completed, imported ใน batch  
      const completedFiles = await this.prisma.uploadRecord.count({
        where: {
          batchId: batchId,
          status: {
            in: [FileProcessingStatus.SUCCESS, FileProcessingStatus.VALIDATION_COMPLETED, 'imported']
          }
        }
      });

      // นับไฟล์ที่มี status เป็น validation_failed, validation_error หรือ error
      const failedFiles = await this.prisma.uploadRecord.count({
        where: {
          batchId: batchId,
          status: {
            in: [FileProcessingStatus.FAILED, FileProcessingStatus.VALIDATION_FAILED, FileProcessingStatus.VALIDATION_ERROR, 'error', 'failed']
          }
        }
      });

      // นับไฟล์ที่มี status เป็น pending หรือ processing
      const processingFiles = await this.prisma.uploadRecord.count({
        where: {
          batchId: batchId,
          status: {
            in: [FileProcessingStatus.PENDING, FileProcessingStatus.PROCESSING]
          }
        }
      });

      // อัปเดต batch statistics
      await this.prisma.uploadBatch.update({
        where: { id: batchId },
        data: {
          successFiles: completedFiles,
          errorFiles: failedFiles,
          processingFiles: processingFiles
        }
      });

      logInfo('Batch statistics updated', { 
        batchId, 
        successFiles: completedFiles,
        errorFiles: failedFiles,
        processingFiles: processingFiles
      });
    } catch (error) {
      logError('Failed to update batch success files', error as Error, { batchId });
      throw error;
    }
  }

  /**
   * ดึง upload batch ตาม ID
   */
  async getUploadBatch(id: string): Promise<IUploadBatch | null> {
    try {
      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id },
        include: {
          files: true,
        },
      });

      return batch as IUploadBatch | null;
    } catch (error) {
      logError('Failed to get upload batch', error as Error);
      throw error;
    }
  }

  /**
   * ดึง upload batches ทั้งหมด
   */
  async getUploadBatches(params: {
    page?: number;
    limit?: number;
    status?: BatchStatus;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ batches: IUploadBatch[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, status, userId, startDate, endDate } = params;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.uploadDate = {};
        if (startDate) where.uploadDate.gte = startDate;
        if (endDate) where.uploadDate.lte = endDate;
      }

      const [batches, total] = await Promise.all([
        this.prisma.uploadBatch.findMany({
          where,
          skip,
          take: limit,
          orderBy: { uploadDate: 'desc' },
          include: {
            files: true,
          },
        }),
        this.prisma.uploadBatch.count({ where }),
      ]);

      return {
        batches: batches as IUploadBatch[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logError('Failed to get upload batches', error as Error);
      throw error;
    }
  }

  /**
   * สร้าง upload record ใหม่
   */
  async createUploadRecord(data: Omit<IUploadRecord, 'id' | 'uploadDate' | 'createdAt' | 'updatedAt'>): Promise<IUploadRecord> {
    try {
      const record = await this.prisma.uploadRecord.create({
        data: {
          filename: data.filename,
          originalName: data.originalName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          filePath: data.filePath,
          status: data.status,
          batchId: data.batchId || null,
          userId: data.userId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          isValid: data.isValid || null,
          errors: data.errors || null,
          warnings: data.warnings || null,
          totalRecords: data.totalRecords || null,
          validRecords: data.validRecords || null,
          invalidRecords: data.invalidRecords || null,
          processedRecords: data.processedRecords || null,
          skippedRecords: data.skippedRecords || null,
          processingTime: data.processingTime || null,
          errorMessage: data.errorMessage || null,
          metadata: data.metadata || null,
        },
      });

      logInfo('Upload record created', { id: record.id, filename: record.filename });
      return record;
    } catch (error) {
      logError('Failed to create upload record', error as Error);
      throw error;
    }
  }

  /**
   * อัปเดต upload record
   */
  async updateUploadRecord(id: string, data: Partial<IUploadRecord>): Promise<IUploadRecord> {
    try {
      const record = await this.prisma.uploadRecord.update({
        where: { id },
        data,
      });

      logInfo('Upload record updated', { id, status: record.status });
      return record;
    } catch (error) {
      logError('Failed to update upload record', error as Error);
      throw error;
    }
  }

  /**
   * ดึง upload record ตาม ID
   */
  async getUploadRecord(id: string): Promise<IUploadRecord | null> {
    try {
      const record = await this.prisma.uploadRecord.findUnique({
        where: { id },
        include: {
          processingHistory: true,
        },
      });

      return record;
    } catch (error) {
      logError('Failed to get upload record', error as Error);
      throw error;
    }
  }

  /**
   * ดึง upload records ทั้งหมด
   */
  async getUploadRecords(params: {
    page?: number;
    limit?: number;
    fileType?: FileType;
    status?: FileProcessingStatus;
    userId?: string;
    batchId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ records: IUploadRecord[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, fileType, status, userId, batchId, startDate, endDate } = params;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (fileType) where.fileType = fileType;
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (batchId) where.batchId = batchId;
      if (startDate || endDate) {
        where.uploadDate = {};
        if (startDate) where.uploadDate.gte = startDate;
        if (endDate) where.uploadDate.lte = endDate;
      }

      const [records, total] = await Promise.all([
        this.prisma.uploadRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: { uploadDate: 'desc' },
          include: {
            processingHistory: true,
          },
        }),
        this.prisma.uploadRecord.count({ where }),
      ]);

      return {
        records,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logError('Failed to get upload records', error as Error);
      throw error;
    }
  }

  /**
   * สร้าง processing history
   */
  async createProcessingHistory(data: Omit<IProcessingHistory, 'id' | 'startTime'>): Promise<IProcessingHistory> {
    try {
      const history = await this.prisma.processingHistory.create({
        data: {
          uploadId: data.uploadId,
          action: data.action,
          status: data.status,
          message: data.message || null,
          endTime: data.endTime || null,
          duration: data.duration || null,
          error: data.error || null,
          stackTrace: data.stackTrace || null,
        },
      });

      logInfo('Processing history created', { id: history.id, action: history.action });
      return history;
    } catch (error) {
      logError('Failed to create processing history', error as Error);
      throw error;
    }
  }

  /**
   * อัปเดต upload statistics
   */
  async updateUploadStatistics(date: Date, data: Partial<IUploadStatistics>): Promise<IUploadStatistics> {
    try {
      const stats = await this.prisma.uploadStatistics.upsert({
        where: { date },
        update: data,
        create: {
          date,
          totalUploads: data.totalUploads || 0,
          successfulUploads: data.successfulUploads || 0,
          failedUploads: data.failedUploads || 0,
          dbfUploads: data.dbfUploads || 0,
          repUploads: data.repUploads || 0,
          stmUploads: data.stmUploads || 0,
          totalFileSize: data.totalFileSize || 0,
          averageFileSize: data.averageFileSize || 0,
          totalProcessingTime: data.totalProcessingTime || 0,
          averageProcessingTime: data.averageProcessingTime || 0,
          totalRecords: data.totalRecords || 0,
          validRecords: data.validRecords || 0,
          invalidRecords: data.invalidRecords || 0,
        },
      });

      logInfo('Upload statistics updated', { date: stats.date });
      return stats;
    } catch (error) {
      logError('Failed to update upload statistics', error as Error);
      throw error;
    }
  }

  /**
   * ดึง upload statistics
   */
  async getUploadStatistics(startDate?: Date, endDate?: Date): Promise<IUploadStatistics[]> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      const stats = await this.prisma.uploadStatistics.findMany({
        where,
        orderBy: { date: 'desc' },
      });

      return stats;
    } catch (error) {
      logError('Failed to get upload statistics', error as Error);
      throw error;
    }
  }

  /**
   * ดึง system configuration
   */
  async getSystemConfig(key: string): Promise<string | null> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key },
      });

      return config?.value || null;
    } catch (error) {
      logError('Failed to get system config', error as Error);
      throw error;
    }
  }

  /**
   * อัปเดต system configuration
   */
  async updateSystemConfig(key: string, value: string, description?: string): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value, description: description || null },
        create: { key, value, description: description || null },
      });

      logInfo('System config updated', { key, value });
    } catch (error) {
      logError('Failed to update system config', error as Error);
      throw error;
    }
  }

  /**
   * ค้นหา upload record ตามชื่อไฟล์
   */
  async findUploadRecordByFilename(filename: string): Promise<IUploadRecord | null> {
    try {
      logInfo('Finding upload record by filename', { filename });

      const record = await this.prisma.uploadRecord.findFirst({
        where: { filename },
        orderBy: { uploadDate: 'desc' } // เอา record ล่าสุด
      });

      if (record) {
        logInfo('Upload record found', { id: record.id, filename });
      } else {
        logInfo('Upload record not found', { filename });
      }

      return record;
    } catch (error) {
      logError('Failed to find upload record by filename', error as Error, { filename });
      throw error;
    }
  }

  /**
   * ลบ upload batch และไฟล์ที่เกี่ยวข้อง
   */
  async deleteUploadBatch(id: string): Promise<void> {
    try {
      logInfo('Deleting upload batch', { id });

      // ลบ records ที่เกี่ยวข้องกับ batch ก่อน
      await this.prisma.uploadRecord.deleteMany({
        where: { batchId: id },
      });

      // ลบ batch
      await this.prisma.uploadBatch.delete({
        where: { id },
      });

      logInfo('Upload batch deleted successfully', { id });
    } catch (error) {
      logError('Failed to delete upload batch', error as Error, { id });
      throw error;
    }
  }

  /**
   * ลบ upload record
   */
  async deleteUploadRecord(id: string): Promise<void> {
    try {
      logInfo('Deleting upload record', { id });

      await this.prisma.uploadRecord.delete({
        where: { id },
      });

      logInfo('Upload record deleted successfully', { id });
    } catch (error) {
      logError('Failed to delete upload record', error as Error, { id });
      throw error;
    }
  }

  /**
   * ลบ upload records ตามเงื่อนไข
   */
  async deleteUploadRecords(params: {
    batchId?: string;
    userId?: string;
    status?: FileProcessingStatus;
    fileType?: FileType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    try {
      logInfo('Deleting upload records', params);

      const where: any = {};
      if (params.batchId) where.batchId = params.batchId;
      if (params.userId) where.userId = params.userId;
      if (params.status) where.status = params.status;
      if (params.fileType) where.fileType = params.fileType;
      if (params.startDate || params.endDate) {
        where.uploadDate = {};
        if (params.startDate) where.uploadDate.gte = params.startDate;
        if (params.endDate) where.uploadDate.lte = params.endDate;
      }

      const result = await this.prisma.uploadRecord.deleteMany({
        where,
      });

      logInfo('Upload records deleted successfully', { 
        deletedCount: result.count,
        params 
      });

      return result.count;
    } catch (error) {
      logError('Failed to delete upload records', error as Error, params);
      throw error;
    }
  }

  /**
   * ปิดการเชื่อมต่อ database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default DatabaseService; 