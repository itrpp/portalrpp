// ========================================
// FILE STORAGE SERVICE
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileType } from '@prisma/client';
import { logInfo, logError } from '@/utils/logger';

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
  message?: string;
  error?: string;
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
   * สร้างโครงสร้างโฟลเดอร์ตามรูปแบบที่กำหนด
   * /uploads/{fileType}/{date}/{uuid}/
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
  async createDateFolder(fileType: FileType, date: Date = new Date()): Promise<string> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const typePath = this.getTypePath(fileType);
    const datePath = path.join(typePath, dateStr);
    
    await fs.ensureDir(datePath);
    logInfo('Date folder created', { fileType, date: dateStr, path: datePath });
    return datePath;
  }

  /**
   * สร้างโฟลเดอร์ตาม UUID
   * /uploads/{fileType}/{date}/{uuid}/
   */
  async createUuidFolder(fileType: FileType, date: Date = new Date()): Promise<{ uuid: string; folderPath: string }> {
    const uuid = uuidv4();
    const dateFolder = await this.createDateFolder(fileType, date);
    const uuidFolder = path.join(dateFolder, uuid);
    
    await fs.ensureDir(uuidFolder);
    logInfo('UUID folder created', { fileType, uuid, path: uuidFolder });
    return { uuid, folderPath: uuidFolder };
  }

  /**
   * บันทึกไฟล์ตามโครงสร้างที่กำหนด
   */
  async saveFile(
    fileType: FileType,
    originalName: string,
    fileBuffer: Buffer,
    date: Date = new Date(),
  ): Promise<IFileStorageResult> {
    try {
      // สร้างโฟลเดอร์ตาม UUID
      const { uuid, folderPath } = await this.createUuidFolder(fileType, date);
      
      // สร้างชื่อไฟล์ใหม่
      const extension = path.extname(originalName);
      const filename = `${uuid}${extension}`;
      const filePath = path.join(folderPath, filename);
      
      // บันทึกไฟล์
      await fs.writeFile(filePath, fileBuffer);
      
      // สร้าง relative path สำหรับเก็บในฐานข้อมูล
      const relativePath = path.relative(this.config.basePath, filePath);
      
      logInfo('File saved successfully', {
        fileType,
        originalName,
        filename,
        uuid,
        filePath,
        relativePath,
      });

      return {
        success: true,
        filePath,
        relativePath,
        filename,
        uuid,
        dateFolder: path.dirname(folderPath),
        message: 'ไฟล์ถูกบันทึกสำเร็จ',
      };
    } catch (error) {
      logError('Failed to save file', error as Error);
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: '',
        uuid: '',
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ย้ายไฟล์ไปยังโฟลเดอร์ที่ประมวลผลแล้ว
   */
  async moveToProcessed(
    fileType: FileType,
    uuid: string,
    date: Date,
    originalName: string,
  ): Promise<IFileStorageResult> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const typePath = this.getTypePath(fileType);
      const sourcePath = path.join(typePath, dateStr, uuid);
      
      // สร้างโฟลเดอร์ processed
      const processedPath = path.join(this.config.basePath, 'processed', fileType.toLowerCase());
      const processedDatePath = path.join(processedPath, dateStr);
      const processedUuidPath = path.join(processedDatePath, uuid);
      
      await fs.ensureDir(processedUuidPath);
      
      // ย้ายไฟล์ทั้งหมดในโฟลเดอร์
      await fs.move(sourcePath, processedUuidPath, { overwrite: true });
      
      const extension = path.extname(originalName);
      const filename = `${uuid}${extension}`;
      const filePath = path.join(processedUuidPath, filename);
      const relativePath = path.relative(this.config.basePath, filePath);
      
      logInfo('File moved to processed', {
        fileType,
        uuid,
        sourcePath,
        processedPath: filePath,
      });

      return {
        success: true,
        filePath,
        relativePath,
        filename,
        uuid,
        dateFolder: processedDatePath,
        message: 'ไฟล์ถูกย้ายไปยังโฟลเดอร์ที่ประมวลผลแล้ว',
      };
    } catch (error) {
      logError('Failed to move file to processed', error as Error);
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: '',
        uuid: '',
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * สร้าง backup ของไฟล์
   */
  async createBackup(
    fileType: FileType,
    uuid: string,
    date: Date,
    originalName: string,
  ): Promise<IFileStorageResult> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const typePath = this.getTypePath(fileType);
      const sourcePath = path.join(typePath, dateStr, uuid);
      
      // สร้างโฟลเดอร์ backup
      const backupPath = path.join(this.config.backupPath, fileType.toLowerCase());
      const backupDatePath = path.join(backupPath, dateStr);
      const backupUuidPath = path.join(backupDatePath, uuid);
      
      await fs.ensureDir(backupUuidPath);
      
      // คัดลอกไฟล์ทั้งหมดในโฟลเดอร์
      await fs.copy(sourcePath, backupUuidPath);
      
      const extension = path.extname(originalName);
      const filename = `${uuid}${extension}`;
      const filePath = path.join(backupUuidPath, filename);
      const relativePath = path.relative(this.config.basePath, filePath);
      
      logInfo('Backup created', {
        fileType,
        uuid,
        sourcePath,
        backupPath: filePath,
      });

      return {
        success: true,
        filePath,
        relativePath,
        filename,
        uuid,
        dateFolder: backupDatePath,
        message: 'Backup ถูกสร้างสำเร็จ',
      };
    } catch (error) {
      logError('Failed to create backup', error as Error);
      return {
        success: false,
        filePath: '',
        relativePath: '',
        filename: '',
        uuid: '',
        dateFolder: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ลบไฟล์และโฟลเดอร์
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.remove(filePath);
      logInfo('File deleted', { filePath });
      return true;
    } catch (error) {
      logError('Failed to delete file', error as Error);
      return false;
    }
  }

  /**
   * ตรวจสอบว่าไฟล์มีอยู่หรือไม่
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      logError('Failed to check file existence', error as Error);
      return false;
    }
  }

  /**
   * ดึงข้อมูลไฟล์
   */
  async getFileInfo(filePath: string): Promise<{ size: number; created: Date; modified: Date } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      logError('Failed to get file info', error as Error);
      return null;
    }
  }

  /**
   * ดึง path ตามประเภทไฟล์
   */
  private getTypePath(fileType: FileType): string {
    switch (fileType) {
      case 'DBF':
        return this.config.dbfPath;
      case 'REP':
        return this.config.repPath;
      case 'STM':
        return this.config.stmPath;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * ดึงโครงสร้างโฟลเดอร์ปัจจุบัน
   */
  getConfig(): IFileStorageConfig {
    return { ...this.config };
  }
}

export default FileStorageService; 