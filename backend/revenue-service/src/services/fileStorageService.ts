// ========================================
// FILE STORAGE SERVICE
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import { DateHelper, DateFormatter } from '@/utils/dateHelper';
import { logInfo, logError } from '@/utils/logger';

// กำหนด FileType enum เอง
export enum FileType {
  DBF = 'DBF',
  REP = 'REP',
  STM = 'STM',
}

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

export class FileStorageService {
  private config: IFileStorageConfig;

  constructor(basePath: string = './uploads') {
    this.config = {
      basePath: path.resolve(basePath),
      uploadPath: path.resolve(basePath),
      dbfPath: path.resolve(basePath, 'dbf'),
      repPath: path.resolve(basePath, 'rep'),
      stmPath: path.resolve(basePath, 'stm'),
      tempPath: path.resolve(basePath, 'temp'),
      backupPath: path.resolve(basePath, 'backup'),
      processedPath: path.resolve(basePath, 'processed'),
    };
  }

  /**
   * แปลงวันที่เป็น format yyyyMMdd
   */
  private formatDateToYYYYMMDD(date: DateTime): string {
    return DateFormatter.toFolderFormat(date);
  }

  /**
   * สร้างโครงสร้างโฟลเดอร์ตามรูปแบบที่กำหนด
   * /uploads/{fileType}/{date}/{batchId}/
   */
  async createDirectoryStructure(): Promise<void> {
    try {
      const directories = [
        this.config.basePath,
        this.config.dbfPath,
        this.config.repPath,
        this.config.stmPath,
        this.config.tempPath,
        this.config.backupPath,
        this.config.processedPath,
      ];

      for (const dir of directories) {
        await fs.ensureDir(dir);
        logInfo('Directory ensured', { path: dir });
      }
    } catch (error) {
      logError('Failed to create directory structure', error as Error);
      throw error;
    }
  }

  /**
   * สร้างโฟลเดอร์ตามวันที่
   * /uploads/{fileType}/{date}/
   */
  async createDateFolder(fileType: FileType, date: DateTime = DateHelper.now()): Promise<string> {
    const dateStr = this.formatDateToYYYYMMDD(date); // yyyyMMdd
    const typePath = this.getTypePath(fileType);
    const datePath = path.join(typePath, dateStr || '');
    
    await fs.ensureDir(datePath);
    logInfo('Date folder created', { fileType, date: dateStr, path: datePath });
    return datePath;
  }

  /**
   * สร้างโฟลเดอร์ตาม Batch ID (ใช้ UUID เป็น batchId)
   * /uploads/{fileType}/{date}/{batchId}/
   */
  async createBatchFolder(fileType: FileType, batchId: string, date: DateTime = DateHelper.now()): Promise<string> {
    if (!batchId) {
      throw new Error('Batch ID is required');
    }
    
    const dateFolder = await this.createDateFolder(fileType, date);
    const batchFolder = path.join(dateFolder, batchId);
    
    await fs.ensureDir(batchFolder);
    logInfo('Batch folder created', { fileType, batchId, path: batchFolder });
    return batchFolder;
  }

  /**
   * สร้าง Batch ID ใหม่ (ใช้ UUID)
   * และสร้างโฟลเดอร์ batch
   * /uploads/{fileType}/{date}/{batchId}/
   */
  async createNewBatch(fileType: FileType, date: DateTime = DateHelper.now()): Promise<{ batchId: string; folderPath: string }> {
    const batchId = uuidv4(); // สร้าง UUID เป็น batchId
    const batchFolder = await this.createBatchFolder(fileType, batchId, date);
    
    logInfo('New batch created', { fileType, batchId, path: batchFolder });
    return { batchId, folderPath: batchFolder };
  }

  /**
   * สร้างโฟลเดอร์ตาม UUID (legacy - ไม่มี batch)
   * /uploads/{fileType}/{date}/{uuid}/
   */
  async createUuidFolder(fileType: FileType, date: DateTime = DateHelper.now()): Promise<{ uuid: string; folderPath: string }> {
    const uuid = uuidv4();
    const dateFolder = await this.createDateFolder(fileType, date);
    const uuidFolder = path.join(dateFolder, uuid);
    
    await fs.ensureDir(uuidFolder);
    logInfo('UUID folder created', { fileType, uuid, path: uuidFolder });
    return { uuid, folderPath: uuidFolder };
  }

  /**
   * บันทึกไฟล์ใน batch
   * /uploads/{fileType}/{date}/{batchId}/{filename}
   */
  async saveFileInBatch(
    fileType: FileType,
    originalName: string,
    fileBuffer: Buffer,
    batchId: string,
    date: DateTime = DateHelper.now(),
  ): Promise<IBatchStorageResult> {
    if (!batchId) {
      throw new Error('Batch ID is required');
    }
    
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const batchFolder = await this.createBatchFolder(fileType, batchId, date);
      const filePath = path.join(batchFolder, originalName);
      
      await fs.writeFile(filePath, fileBuffer);
      
      const relativePath = path.relative(this.config.basePath, filePath);
      const dateFolder = path.dirname(path.dirname(filePath)); // ขึ้นไป 2 ระดับ
      
      logInfo('File saved in batch', { 
        fileType, 
        batchId, 
        filename: originalName, 
        path: filePath 
      });

      return {
        success: true,
        filePath,
        relativePath,
        filename: originalName,
        uuid: batchId, // batchId คือ UUID แล้ว
        dateFolder: path.basename(dateFolder),
        batchFolder: path.basename(batchFolder),
        batchId,
        message: 'ไฟล์ถูกบันทึกใน batch สำเร็จ',
      };
    } catch (error) {
      logError('Failed to save file in batch', error as Error, { 
        fileType, 
        batchId, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid: batchId,
        dateFolder: '',
        batchFolder: '',
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * บันทึกไฟล์ (legacy - ไม่มี batch)
   * /uploads/{fileType}/{date}/{uuid}/{filename}
   */
  async saveFile(
    fileType: FileType,
    originalName: string,
    fileBuffer: Buffer,
    date: DateTime = DateHelper.now(),
  ): Promise<IFileStorageResult> {
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const { uuid, folderPath } = await this.createUuidFolder(fileType, date);
      const filePath = path.join(folderPath, originalName);
      
      await fs.writeFile(filePath, fileBuffer);
      
      const relativePath = path.relative(this.config.basePath, filePath);
      const dateFolder = path.dirname(path.dirname(filePath)); // ขึ้นไป 2 ระดับ
      
      logInfo('File saved', { 
        fileType, 
        uuid, 
        filename: originalName, 
        path: filePath 
      });

      return {
        success: true,
        filePath,
        relativePath,
        filename: originalName,
        uuid,
        dateFolder: path.basename(dateFolder),
        message: 'ไฟล์ถูกบันทึกสำเร็จ',
      };
    } catch (error) {
      logError('Failed to save file', error as Error, { 
        fileType, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid: '',
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ย้ายไฟล์ไปยัง processed directory ใน batch
   * /uploads/processed/{fileType}/{date}/{batchId}/{filename}
   */
  async moveToProcessedInBatch(
    fileType: FileType,
    batchId: string,
    date: DateTime,
    originalName: string,
  ): Promise<IBatchStorageResult> {
    if (!batchId) {
      throw new Error('Batch ID is required');
    }
    
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const dateStr = this.formatDateToYYYYMMDD(date);
      const processedTypePath = path.join(this.config.processedPath, fileType.toLowerCase());
      const processedDatePath = path.join(processedTypePath, dateStr || "");
      const processedBatchPath = path.join(processedDatePath, batchId);
      
      await fs.ensureDir(processedBatchPath);
      
      const sourcePath = path.join(this.getTypePath(fileType), dateStr || "", batchId, originalName);
      const targetPath = path.join(processedBatchPath, originalName);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.move(sourcePath, targetPath);
        
        const relativePath = path.relative(this.config.basePath, targetPath);
        
        logInfo('File moved to processed in batch', { 
          fileType, 
          batchId, 
          filename: originalName, 
          path: targetPath 
        });

        return {
          success: true,
          filePath: targetPath,
          relativePath,
          filename: originalName,
          uuid: batchId, // batchId คือ UUID
          dateFolder: dateStr || "",
          batchFolder: batchId,
          batchId,
          message: 'ไฟล์ถูกย้ายไปยัง processed directory ใน batch สำเร็จ',
        };
      } else {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
    } catch (error) {
      logError('Failed to move file to processed in batch', error as Error, { 
        fileType, 
        batchId, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid: batchId,
        dateFolder: '',
        batchFolder: '',
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ย้ายไฟล์ไปยัง processed directory (legacy - ไม่มี batch)
   * /uploads/processed/{fileType}/{date}/{uuid}/{filename}
   */
  async moveToProcessed(
    fileType: FileType,
    uuid: string,
    date: DateTime,
    originalName: string,
  ): Promise<IFileStorageResult> {
    if (!uuid) {
      throw new Error('UUID is required');
    }
    
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const dateStr = this.formatDateToYYYYMMDD(date);
      const processedTypePath = path.join(this.config.processedPath, fileType.toLowerCase());
      const processedDatePath = path.join(processedTypePath, dateStr || "");
      const processedUuidPath = path.join(processedDatePath, uuid);
      
      await fs.ensureDir(processedUuidPath);
      
      const sourcePath = path.join(this.getTypePath(fileType), dateStr || "", uuid, originalName);
      const targetPath = path.join(processedUuidPath, originalName);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.move(sourcePath, targetPath);
        
        const relativePath = path.relative(this.config.basePath, targetPath);
        
        logInfo('File moved to processed', { 
          fileType, 
          uuid, 
          filename: originalName, 
          path: targetPath 
        });

        return {
          success: true,
          filePath: targetPath,
          relativePath,
          filename: originalName,
          uuid,
          dateFolder: dateStr || "",
          message: 'ไฟล์ถูกย้ายไปยัง processed directory สำเร็จ',
        };
      } else {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
    } catch (error) {
      logError('Failed to move file to processed', error as Error, { 
        fileType, 
        uuid, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid,
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * สร้าง backup ใน batch
   * /uploads/backup/{fileType}/{date}/{batchId}/{filename}
   */
  async createBackupInBatch(
    fileType: FileType,
    batchId: string,
    date: DateTime,
    originalName: string,
  ): Promise<IBatchStorageResult> {
    if (!batchId) {
      throw new Error('Batch ID is required');
    }
    
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const dateStr = this.formatDateToYYYYMMDD(date);
      const backupTypePath = path.join(this.config.backupPath, fileType.toLowerCase());
      const backupDatePath = path.join(backupTypePath, dateStr || "");
      const backupBatchPath = path.join(backupDatePath, batchId);
      
      await fs.ensureDir(backupBatchPath);
      
      const sourcePath = path.join(this.getTypePath(fileType), dateStr || "", batchId, originalName);
      const backupPath = path.join(backupBatchPath, originalName);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, backupPath);
        
        const relativePath = path.relative(this.config.basePath, backupPath);
        
        logInfo('Backup created in batch', { 
          fileType, 
          batchId, 
          filename: originalName, 
          path: backupPath 
        });

        return {
          success: true,
          filePath: backupPath,
          relativePath,
          filename: originalName,
          uuid: batchId, // batchId คือ UUID
          dateFolder: dateStr || "",
          batchFolder: batchId,
          batchId,
          message: 'Backup ถูกสร้างใน batch สำเร็จ',
        };
      } else {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
    } catch (error) {
      logError('Failed to create backup in batch', error as Error, { 
        fileType, 
        batchId, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid: batchId,
        dateFolder: '',
        batchFolder: '',
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * สร้าง backup (legacy - ไม่มี batch)
   * /uploads/backup/{fileType}/{date}/{uuid}/{filename}
   */
  async createBackup(
    fileType: FileType,
    uuid: string,
    date: DateTime,
    originalName: string,
  ): Promise<IFileStorageResult> {
    if (!uuid) {
      throw new Error('UUID is required');
    }
    
    if (!originalName) {
      throw new Error('Original name is required');
    }
    
    try {
      const dateStr = this.formatDateToYYYYMMDD(date);
      const backupTypePath = path.join(this.config.backupPath, fileType.toLowerCase());
      const backupDatePath = path.join(backupTypePath, dateStr || "");
      const backupUuidPath = path.join(backupDatePath, uuid);
      
      await fs.ensureDir(backupUuidPath);
      
      const sourcePath = path.join(this.getTypePath(fileType), dateStr || "", uuid, originalName);
      const backupPath = path.join(backupUuidPath, originalName);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, backupPath);
        
        const relativePath = path.relative(this.config.basePath, backupPath);
        
        logInfo('Backup created', { 
          fileType, 
          uuid, 
          filename: originalName, 
          path: backupPath 
        });

        return {
          success: true,
          filePath: backupPath,
          relativePath,
          filename: originalName,
          uuid,
          dateFolder: dateStr || "",
          message: 'Backup ถูกสร้างสำเร็จ',
        };
      } else {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
    } catch (error) {
      logError('Failed to create backup', error as Error, { 
        fileType, 
        uuid, 
        filename: originalName 
      });
      
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: originalName,
        uuid,
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ลบไฟล์
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        logInfo('File deleted', { path: filePath });
        return true;
      }
      return false;
    } catch (error) {
      logError('Failed to delete file', error as Error, { path: filePath });
      return false;
    }
  }

  /**
   * ลบโฟลเดอร์ของ batch จากตัวอย่าง path ของไฟล์ใน batch นั้น
   * และพยายามลบโฟลเดอร์วันที่ถ้าว่าง
   */
  async deleteBatchFolderFromFilePath(exampleFilePath: string): Promise<void> {
    try {
      const normalized = path.resolve(exampleFilePath);

      // โฟลเดอร์ของ batch คือโฟลเดอร์แม่ของไฟล์
      const batchFolder = path.dirname(normalized);

      // ป้องกัน path traversal: ต้องอยู่ภายใต้ basePath เสมอ
      if (!batchFolder.startsWith(this.config.basePath)) {
        throw new Error('Invalid batch folder path');
      }

      // ลบโฟลเดอร์ batch (recursive เผื่อมีไฟล์ตกค้าง)
      if (await fs.pathExists(batchFolder)) {
        await fs.remove(batchFolder);
        logInfo('Batch folder deleted', { path: batchFolder });
      }

      // พยายามลบโฟลเดอร์วันที่ถ้าว่าง เพื่อไม่ให้เหลือโฟลเดอร์เปล่า
      const dateFolder = path.dirname(batchFolder);
      if (dateFolder.startsWith(this.config.basePath) && (await fs.pathExists(dateFolder))) {
        const items = await fs.readdir(dateFolder);
        if (items.length === 0) {
          await fs.remove(dateFolder);
          logInfo('Date folder deleted (empty)', { path: dateFolder });
        }
      }
    } catch (error) {
      logError('Failed to delete batch or date folder', error as Error, { exampleFilePath });
    }
  }

  /**
   * ตรวจสอบว่าไฟล์มีอยู่หรือไม่
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      logError('Failed to check file existence', error as Error, { path: filePath });
      return false;
    }
  }

  /**
   * ดึงข้อมูลไฟล์
   */
  async getFileInfo(filePath: string): Promise<{ size: number; created: Date; modified: Date } | null> {
    try {
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      }
      return null;
    } catch (error) {
      logError('Failed to get file info', error as Error, { path: filePath });
      return null;
    }
  }

  /**
   * ดึง path ตามประเภทไฟล์
   */
  private getTypePath(fileType: FileType): string {
    switch (fileType) {
      case FileType.DBF:
        return this.config.dbfPath;
      case FileType.REP:
        return this.config.repPath;
      case FileType.STM:
        return this.config.stmPath;
      default:
        return this.config.tempPath;
    }
  }

  /**
   * ดึง config
   */
  getConfig(): IFileStorageConfig {
    return this.config;
  }
}

export default FileStorageService; 