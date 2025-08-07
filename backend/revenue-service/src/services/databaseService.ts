// ========================================
// DATABASE SERVICE
// ========================================

import { PrismaClient, FileType, UploadStatus, ProcessingAction, ProcessingStatus } from '@prisma/client';
import { logInfo, logError } from '@/utils/logger';

export interface IUploadRecord {
  id: string;
  filename: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  uploadDate: Date;
  processedAt?: Date;
  status: UploadStatus;
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
  metadata?: string;
}

export interface IProcessingHistory {
  id: string;
  uploadId: string;
  action: ProcessingAction;
  status: ProcessingStatus;
  message?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  stackTrace?: string;
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
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          isValid: data.isValid,
          errors: data.errors,
          warnings: data.warnings,
          totalRecords: data.totalRecords,
          validRecords: data.validRecords,
          invalidRecords: data.invalidRecords,
          processedRecords: data.processedRecords,
          skippedRecords: data.skippedRecords,
          processingTime: data.processingTime,
          metadata: data.metadata,
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
   * ดึง upload records ตามเงื่อนไข
   */
  async getUploadRecords(params: {
    page?: number;
    limit?: number;
    fileType?: FileType;
    status?: UploadStatus;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ records: IUploadRecord[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, fileType, status, userId, startDate, endDate } = params;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (fileType) where.fileType = fileType;
      if (status) where.status = status;
      if (userId) where.userId = userId;
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
            processingHistory: {
              orderBy: { startTime: 'desc' },
              take: 5,
            },
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
          message: data.message,
          endTime: data.endTime,
          duration: data.duration,
          error: data.error,
          stackTrace: data.stackTrace,
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
        update: { value, description },
        create: { key, value, description },
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