import prisma from '../config/database.js';
import { DBFRecord, DBFField } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DatabaseService {
  /**
     * บันทึกข้อมูลไฟล์ลง database
     */
  public static async saveFile(
    filename: string,
    originalName: string,
    size: number,
    fileType: string,
    schema: DBFField[],
    userId: string,
    userName: string,
    ipAddress: string,
    filePath: string,
  ) {
    try {
      const file = await prisma.file.create({
        data: {
          filename,
          originalName,
          size,
          fileType,
          schema: JSON.stringify(schema),
          userId,
          userName,
          ipAddress,
          filePath,
          status: 'uploaded',
        },
      });

      logger.info(`บันทึกไฟล์ ${filename} ลง database สำเร็จ`);
      return file;
    } catch (error) {
      logger.error(`Error saving file ${filename}:`, error);
      throw error;
    }
  }

  /**
     * บันทึก records ลง database
     */
  public static async saveRecords(
    fileId: string,
    records: DBFRecord[],
  ) {
    try {
      const recordData = records.map((record, index) => ({
        fileId,
        rowIndex: index,
        data: JSON.stringify(record),
      }));

      await prisma.record.createMany({
        data: recordData,
      });

      logger.info(`บันทึก ${records.length} records สำหรับไฟล์ ${fileId} สำเร็จ`);
    } catch (error) {
      logger.error(`Error saving records for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * บันทึก schema ลง database
     */
  public static async saveSchema(
    fileId: string,
    schema: DBFField[],
  ) {
    try {
      const schemaData = schema.map((field, index) => ({
        fileId,
        fieldName: field.name,
        fieldType: field.type,
        fieldLength: field.length,
        fieldDecimal: field.decimalPlaces,
        fieldOffset: index * 32 + 32, // คำนวณ offset
      }));

      await prisma.schema.createMany({
        data: schemaData,
      });

      logger.info(`บันทึก schema สำหรับไฟล์ ${fileId} สำเร็จ`);
    } catch (error) {
      logger.error(`Error saving schema for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * บันทึก processing log
     */
  public static async saveProcessingLog(
    fileId: string,
    processType: string,
    processDetails: string,
    recordCount: number,
    processingTime: number,
    status: string,
    userId: string,
    userName: string,
    errorMessage?: string,
  ) {
    try {
      await prisma.processingLog.create({
        data: {
          fileId,
          processType,
          processDetails,
          recordCount,
          processingTime,
          status,
          userId,
          userName,
          errorMessage: errorMessage || null,
        },
      });

      logger.info(`บันทึก processing log สำหรับไฟล์ ${fileId} สำเร็จ`);
    } catch (error) {
      logger.error(`Error saving processing log for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * บันทึก export log
     */
  public static async saveExportLog(
    fileId: string,
    exportType: string,
    exportFormat: string,
    recordCount: number,
    fileSize: number,
    downloadPath: string,
    userId: string,
    userName: string,
  ) {
    try {
      await prisma.exportLog.create({
        data: {
          fileId,
          exportType,
          exportFormat,
          recordCount,
          fileSize,
          downloadPath,
          userId,
          userName,
        },
      });

      logger.info(`บันทึก export log สำหรับไฟล์ ${fileId} สำเร็จ`);
    } catch (error) {
      logger.error(`Error saving export log for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * ดึงข้อมูลไฟล์จาก database
     */
  public static async getFile(fileId: string) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
        include: {
          records: {
            orderBy: { rowIndex: 'asc' },
          },
          schemas: {
            orderBy: { fieldName: 'asc' },
          },
        },
      });

      return file;
    } catch (error) {
      logger.error(`Error getting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * ดึงรายการไฟล์ของผู้ใช้
     */
  public static async getUserFiles(userId: string) {
    try {
      const files = await prisma.file.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { records: true },
          },
        },
      });

      return files;
    } catch (error) {
      logger.error(`Error getting files for user ${userId}:`, error);
      throw error;
    }
  }

  /**
     * ลบข้อมูลไฟล์และ records ที่เกี่ยวข้อง
     */
  public static async deleteFile(fileId: string) {
    try {
      await prisma.file.delete({
        where: { id: fileId },
      });

      logger.info(`ลบไฟล์ ${fileId} และข้อมูลที่เกี่ยวข้องสำเร็จ`);
    } catch (error) {
      logger.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * อัปเดตสถานะไฟล์
     */
  public static async updateFileStatus(fileId: string, status: string) {
    try {
      await prisma.file.update({
        where: { id: fileId },
        data: { status },
      });

      logger.info(`อัปเดตสถานะไฟล์ ${fileId} เป็น ${status} สำเร็จ`);
    } catch (error) {
      logger.error(`Error updating file status ${fileId}:`, error);
      throw error;
    }
  }

  /**
     * ดึง processing logs ของผู้ใช้
     */
  public static async getUserProcessingLogs(userId: string) {
    try {
      const logs = await prisma.processingLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          file: {
            select: { filename: true, originalName: true },
          },
        },
      });

      return logs;
    } catch (error) {
      logger.error(`Error getting processing logs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
     * ดึง export logs ของผู้ใช้
     */
  public static async getUserExportLogs(userId: string) {
    try {
      const logs = await prisma.exportLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          file: {
            select: { filename: true, originalName: true },
          },
        },
      });

      return logs;
    } catch (error) {
      logger.error(`Error getting export logs for user ${userId}:`, error);
      throw error;
    }
  }
} 
