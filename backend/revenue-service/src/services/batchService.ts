import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { AuthUser } from '../types/index.js';

export interface BatchUploadOptions {
  batchName?: string;
  validateOnUpload?: boolean;
  processOnUpload?: boolean;
  metadata?: Record<string, any>;
}

export interface BatchStatus {
  id: string;
  batchId: string;
  batchName?: string;
  status: string;
  totalFiles: number;
  uploadedFiles: number;
  processedFiles: number;
  totalRecords: number;
  totalSize: number;
  uploadProgress: number;
  processingProgress: number;
  uploadStartTime: Date;
  uploadEndTime?: Date;
  processingStartTime?: Date;
  processingEndTime?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  status: string;
  fileType?: string;
  recordCount: number;
  fieldCount: number;
  uploadProgress: number;
  validationStatus?: string;
  validationErrors?: string[];
  checksum: string;
  uploadStartTime: Date;
  uploadEndTime?: Date;
  error?: string;
}

export class BatchService {
  /**
   * สร้าง batch ใหม่
   */
  public static async createBatch(
    user: AuthUser,
    clientIP: string,
    options: BatchUploadOptions = {},
  ): Promise<{ batchId: string; batch: any }> {
    try {
      const batchId = uuidv4();
      const batch = await prisma.uploadBatch.create({
        data: {
          batchId,
          batchName: options.batchName,
          status: 'created',
          userId: user.userId,
          userName: user.userName,
          ipAddress: clientIP,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        },
      });

      logger.info(`สร้าง batch ${batchId} สำหรับผู้ใช้ ${user.userName}`);
      return { batchId, batch };
    } catch (error) {
      logger.error('Error creating batch:', error);
      throw error;
    }
  }

  /**
   * อัปเดตสถานะ batch
   */
  public static async updateBatchStatus(
    batchId: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const updateData: any = { status };

      if (status === 'uploading') {
        updateData.uploadStartTime = new Date();
      } else if (status === 'completed') {
        updateData.uploadEndTime = new Date();
      } else if (status === 'processing') {
        updateData.processingStartTime = new Date();
      } else if (status === 'failed') {
        updateData.processingEndTime = new Date();
      }

      if (metadata) {
        updateData.metadata = JSON.stringify(metadata);
      }

      await prisma.uploadBatch.update({
        where: { batchId },
        data: updateData,
      });

      logger.info(`อัปเดตสถานะ batch ${batchId} เป็น ${status}`);
    } catch (error) {
      logger.error(`Error updating batch status ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * เพิ่มไฟล์ลงใน batch
   */
  public static async addFileToBatch(
    batchId: string,
    fileData: {
      filename: string;
      originalName: string;
      size: number;
      fileType?: string;
      recordCount: number;
      fieldCount: number;
      checksum: string;
      filePath: string;
      schema?: any;
    },
    user: AuthUser,
    clientIP: string,
  ): Promise<FileUploadResult> {
    try {
      // สร้างไฟล์ใน database
      const file = await prisma.file.create({
        data: {
          filename: fileData.filename,
          originalName: fileData.originalName,
          size: fileData.size,
          fileType: fileData.fileType,
          schema: fileData.schema ? JSON.stringify(fileData.schema) : null,
          userId: user.userId,
          userName: user.userName,
          ipAddress: clientIP,
          filePath: fileData.filePath,
          uploadBatchId: batchId,
          recordCount: fileData.recordCount,
          fieldCount: fileData.fieldCount,
          checksum: fileData.checksum,
          status: 'uploaded',
          uploadProgress: 100,
          uploadEndTime: new Date(),
        },
      });

      // อัปเดตสถิติของ batch
      await this.updateBatchStats(batchId);

      const result: FileUploadResult = {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        status: file.status,
        fileType: file.fileType || undefined,
        recordCount: file.recordCount,
        fieldCount: file.fieldCount,
        uploadProgress: file.uploadProgress,
        checksum: file.checksum || '',
        uploadStartTime: file.uploadStartTime,
        uploadEndTime: file.uploadEndTime || undefined,
      };

      logger.info(`เพิ่มไฟล์ ${fileData.originalName} ลงใน batch ${batchId}`);
      return result;
    } catch (error) {
      logger.error(`Error adding file to batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * อัปเดตสถิติของ batch
   */
  public static async updateBatchStats(batchId: string): Promise<void> {
    try {
      const batch = await prisma.uploadBatch.findUnique({
        where: { batchId },
        include: {
          files: {
            select: {
              size: true,
              recordCount: true,
              status: true,
            },
          },
        },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const totalFiles = batch.files.length;
      const uploadedFiles = batch.files.filter(f => f.status === 'uploaded').length;
      const processedFiles = batch.files.filter(f => f.status === 'completed').length;
      const totalRecords = batch.files.reduce((sum, f) => sum + f.recordCount, 0);
      const totalSize = batch.files.reduce((sum, f) => sum + f.size, 0);

      const uploadProgress = totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0;
      const processingProgress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

      await prisma.uploadBatch.update({
        where: { batchId },
        data: {
          totalFiles,
          uploadedFiles,
          processedFiles,
          totalRecords,
          totalSize,
        },
      });

      logger.info(`อัปเดตสถิติ batch ${batchId}: ${uploadedFiles}/${totalFiles} files, ${totalRecords} records`);
    } catch (error) {
      logger.error(`Error updating batch stats ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล batch
   */
  public static async getBatch(batchId: string): Promise<BatchStatus | null> {
    try {
      const batch = await prisma.uploadBatch.findUnique({
        where: { batchId },
        include: {
          files: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              size: true,
              status: true,
              fileType: true,
              recordCount: true,
              fieldCount: true,
              uploadProgress: true,
              validationStatus: true,
              validationErrors: true,
              checksum: true,
              uploadStartTime: true,
              uploadEndTime: true,
            },
          },
        },
      });

      if (!batch) {
        return null;
      }

      const uploadProgress = batch.totalFiles > 0 ? Math.round((batch.uploadedFiles / batch.totalFiles) * 100) : 0;
      const processingProgress = batch.totalFiles > 0 ? Math.round((batch.processedFiles / batch.totalFiles) * 100) : 0;

      return {
        id: batch.id,
        batchId: batch.batchId,
        batchName: batch.batchName || undefined,
        status: batch.status,
        totalFiles: batch.totalFiles,
        uploadedFiles: batch.uploadedFiles,
        processedFiles: batch.processedFiles,
        totalRecords: batch.totalRecords,
        totalSize: batch.totalSize,
        uploadProgress,
        processingProgress,
        uploadStartTime: batch.uploadStartTime,
        uploadEndTime: batch.uploadEndTime || undefined,
        processingStartTime: batch.processingStartTime || undefined,
        processingEndTime: batch.processingEndTime || undefined,
        errorMessage: batch.errorMessage || undefined,
        metadata: batch.metadata ? JSON.parse(batch.metadata) : undefined,
      };
    } catch (error) {
      logger.error(`Error getting batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * ดึงรายการ batch ของผู้ใช้
   */
  public static async getUserBatches(userId: string): Promise<BatchStatus[]> {
    try {
      const batches = await prisma.uploadBatch.findMany({
        where: { userId },
        include: {
          files: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              size: true,
              status: true,
              fileType: true,
              recordCount: true,
              fieldCount: true,
              uploadProgress: true,
              validationStatus: true,
              validationErrors: true,
              checksum: true,
              uploadStartTime: true,
              uploadEndTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return batches.map(batch => {
        const uploadProgress = batch.totalFiles > 0 ? Math.round((batch.uploadedFiles / batch.totalFiles) * 100) : 0;
        const processingProgress = batch.totalFiles > 0 ? Math.round((batch.processedFiles / batch.totalFiles) * 100) : 0;

        return {
          id: batch.id,
          batchId: batch.batchId,
          batchName: batch.batchName || undefined,
          status: batch.status,
          totalFiles: batch.totalFiles,
          uploadedFiles: batch.uploadedFiles,
          processedFiles: batch.processedFiles,
          totalRecords: batch.totalRecords,
          totalSize: batch.totalSize,
          uploadProgress,
          processingProgress,
          uploadStartTime: batch.uploadStartTime,
          uploadEndTime: batch.uploadEndTime || undefined,
          processingStartTime: batch.processingStartTime || undefined,
          processingEndTime: batch.processingEndTime || undefined,
          errorMessage: batch.errorMessage || undefined,
          metadata: batch.metadata ? JSON.parse(batch.metadata) : undefined,
        };
      });
    } catch (error) {
      logger.error(`Error getting user batches for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * ลบ batch
   */
  public static async deleteBatch(batchId: string, userId: string): Promise<void> {
    try {
      const batch = await prisma.uploadBatch.findUnique({
        where: { batchId },
        select: { userId: true },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      if (batch.userId !== userId) {
        throw new Error('Access denied');
      }

      await prisma.uploadBatch.delete({
        where: { batchId },
      });

      logger.info(`ลบ batch ${batchId} สำเร็จ`);
    } catch (error) {
      logger.error(`Error deleting batch ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * คำนวณ checksum ของไฟล์
   */
  public static calculateChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * บันทึก user activity
   */
  public static async logUserActivity(
    userId: string,
    userName: string,
    activityType: string,
    activityDetails?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          userName,
          activityType,
          activityDetails,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      logger.error('Error logging user activity:', error);
      // ไม่ throw error เพราะไม่ต้องการให้กระทบการทำงานหลัก
    }
  }
} 
