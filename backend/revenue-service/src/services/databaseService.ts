// ========================================
// DATABASE SERVICE
// ========================================

import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from '@/utils/logger';
import { FileType, ProcessingStatus, BatchStatus } from '@/types';

export interface IUploadRecord {
  id: string;
  filename: string;
  originalName: string;
  fileType: string; // DBF, REP, STM
  fileSize: number;
  filePath: string;
  uploadDate: Date;
  processedAt?: Date | null;
  status: string; // PENDING, PROCESSING, COMPLETED, FAILED, VALIDATION_FAILED
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
  status: string; // SUCCESS, ERROR, PROCESSING, PARTIAL
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface IProcessingHistory {
  id: string;
  uploadId: string;
  action: string; // VALIDATE, PROCESS, BACKUP, CLEANUP
  status: string; // STARTED, COMPLETED, FAILED, CANCELLED
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
          userId: data.userId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });

      logInfo('Upload batch created', { id: batch.id, batchName: batch.batchName });
      return batch;
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
      return batch;
    } catch (error) {
      logError('Failed to update upload batch', error as Error);
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

      return batch;
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
        batches,
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
    status?: ProcessingStatus;
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
   * ปิดการเชื่อมต่อ database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default DatabaseService; 