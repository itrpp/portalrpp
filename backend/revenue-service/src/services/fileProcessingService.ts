// ========================================
// FILE PROCESSING SERVICE
// ========================================

import * as XLSX from 'xlsx';
import * as DBF from 'dbf';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { v4 as uuidv4 } from 'uuid';
import {
  FileValidationResult,
  FileProcessingResult,
  RevenueReport,
  BatchProcessingResult,
  ProcessingError,
  BatchStatus,
} from '@/types';
import { DatabaseService } from './databaseService';
import { ValidationService } from './validationService';
import { logFileProcessing } from '@/utils/logger';
import config from '@/config';

export interface IFileProcessingService {
  processFile(filePath: string, filename: string, validationResult: FileValidationResult): Promise<FileProcessingResult>;
  processDBF(filePath: string, filename: string): Promise<FileProcessingResult>;
  processREP(filePath: string, filename: string): Promise<FileProcessingResult>;
  processStatement(filePath: string, filename: string): Promise<FileProcessingResult>;
  generateReport(fileId: string, filename: string, fileType: string): Promise<RevenueReport>;
  processBatch(batchId: string): Promise<BatchProcessingResult>;
  processFileInBatch(fileId: string, batchId: string): Promise<FileProcessingResult>;
}

export class FileProcessingService implements IFileProcessingService {
  private databaseService: DatabaseService;
  private validationService: ValidationService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.validationService = new ValidationService();
  }

  /**
   * ประมวลผลไฟล์ตามประเภท
   */
  async processFile(
    filePath: string,
    filename: string,
    validationResult: FileValidationResult,
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();

    try {
      // ตรวจสอบ file integrity ก่อนประมวลผล
      const integrityValidation = await this.validationService.validateFileIntegrity(filePath);
      if (!integrityValidation.isValid) {
        return {
          success: false,
          message: 'ไฟล์ไม่สมบูรณ์',
          processedAt: new Date(),
          fileId: '',
          statistics: {
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            processedRecords: 0,
            skippedRecords: 0,
            processingTime: Date.now() - startTime,
          },
          errors: integrityValidation.errors.map(e => e.message),
        };
      }

      // สร้าง checksum สำหรับไฟล์
      const checksum = await this.validationService.generateChecksum(filePath, 'sha256');

      // ประมวลผลตามประเภทไฟล์
      let result: FileProcessingResult;
      switch (validationResult.fileType) {
        case 'dbf':
          result = await this.processDBF(filePath, filename);
          break;
        case 'rep':
          result = await this.processREP(filePath, filename);
          break;
        case 'statement':
          result = await this.processStatement(filePath, filename);
          break;
        default:
          throw new Error(`ประเภทไฟล์ไม่รองรับ: ${validationResult.fileType}`);
      }

      // เพิ่ม checksum ใน metadata
      result.metadata = JSON.stringify({
        checksum,
        algorithm: 'sha256',
        integrityValid: integrityValidation.isValid,
      });

      const processingTime = Date.now() - startTime;
      result.statistics.processingTime = processingTime;
      
      logFileProcessing(filename, result.success, processingTime, result.statistics.totalRecords);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logFileProcessing(filename, false, processingTime, 0);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ประมวลผลไฟล์ DBF
   */
  async processDBF(filePath: string, filename: string): Promise<FileProcessingResult> {
    const fileId = uuidv4();
    const startTime = Date.now();
    
    try {
      // อ่านไฟล์ DBF
      const buffer = await fs.readFile(filePath);
      const utf8Buffer = iconv.decode(buffer, config.fileRules.dbf.encoding);
      
      // Parse DBF
      const dbf = DBF.parse(Buffer.from(utf8Buffer, 'utf8'));
      const table = dbf;
      
      if (!table || !table.records) {
        throw new Error('ไม่สามารถอ่านข้อมูลจากไฟล์ DBF ได้');
      }
      
      // ประมวลผลข้อมูล
      const records = table.records;
      const totalRecords = records.length;
      let validRecords = 0;
      let invalidRecords = 0;
      let processedRecords = 0;
      let skippedRecords = 0;
      
      // ตรวจสอบและประมวลผลแต่ละ record
      for (const record of records) {
        try {
          // ตรวจสอบข้อมูลที่จำเป็น
          if (this.isValidDBFRecord(record)) {
            validRecords++;
            processedRecords++;
            
            // ประมวลผลข้อมูล (เพิ่ม business logic ตามต้องการ)
            await this.processDBFRecord(record);
            
          } else {
            invalidRecords++;
          }
        } catch (error) {
          invalidRecords++;
          skippedRecords++;
        }
      }
      
      // สร้าง backup
      const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
      await fs.copy(filePath, backupPath);
      
      // ย้ายไฟล์ไปยัง processed directory
      const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
      await fs.move(filePath, processedPath);
      
      const processingTime = Date.now() - startTime;
      
      const result: FileProcessingResult = {
        success: true,
        message: 'ประมวลผลไฟล์ DBF สำเร็จ',
        processedAt: new Date(),
        fileId,
        statistics: {
          totalRecords,
          validRecords,
          invalidRecords,
          processedRecords,
          skippedRecords,
          processingTime,
        },
      };
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedAt: new Date(),
        fileId,
        statistics: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          processedRecords: 0,
          skippedRecords: 0,
          processingTime,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * ประมวลผลไฟล์ REP (Excel)
   */
  async processREP(filePath: string, filename: string): Promise<FileProcessingResult> {
    const fileId = uuidv4();
    const startTime = Date.now();
    
    try {
      // อ่านไฟล์ Excel
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      let totalRecords = 0;
      let validRecords = 0;
      let invalidRecords = 0;
      let processedRecords = 0;
      let skippedRecords = 0;
      
      // ประมวลผลแต่ละ sheet
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = worksheet ? XLSX.utils.sheet_to_json(worksheet, { header: 1 }) : [];
        
        if (jsonData.length > 1) { // มี header + data
          const headers = (jsonData[0] as string[]) || [];
          const dataRows = jsonData.slice(1) as any[][];
          
          totalRecords += dataRows.length;
          
          for (const row of dataRows) {
            try {
              if (this.isValidREPRecord(row, headers)) {
                validRecords++;
                processedRecords++;
                
                // ประมวลผลข้อมูล (เพิ่ม business logic ตามต้องการ)
                await this.processREPRecord(row, headers, sheetName);
                
              } else {
                invalidRecords++;
              }
            } catch (error) {
              invalidRecords++;
              skippedRecords++;
            }
          }
        }
      }
      
      // สร้าง backup
      const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
      await fs.copy(filePath, backupPath);
      
      // ย้ายไฟล์ไปยัง processed directory
      const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
      await fs.move(filePath, processedPath);
      
      const processingTime = Date.now() - startTime;
      
      const result: FileProcessingResult = {
        success: true,
        message: 'ประมวลผลไฟล์ REP สำเร็จ',
        processedAt: new Date(),
        fileId,
        statistics: {
          totalRecords,
          validRecords,
          invalidRecords,
          processedRecords,
          skippedRecords,
          processingTime,
        },
      };
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logFileProcessing(filename, false, processingTime, 0);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ REP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ประมวลผลไฟล์ Statement (Excel)
   */
  async processStatement(filePath: string, filename: string): Promise<FileProcessingResult> {
    const fileId = uuidv4();
    const startTime = Date.now();
    
    try {
      // อ่านไฟล์ Excel
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      let totalRecords = 0;
      let validRecords = 0;
      let invalidRecords = 0;
      let processedRecords = 0;
      let skippedRecords = 0;
      
      // ประมวลผลแต่ละ sheet
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = worksheet ? XLSX.utils.sheet_to_json(worksheet, { header: 1 }) : [];
        
        if (jsonData.length > 1) { // มี header + data
          const headers = (jsonData[0] as string[]) || [];
          const dataRows = jsonData.slice(1) as any[][];
          
          totalRecords += dataRows.length;
          
          for (const row of dataRows) {
            try {
              if (this.isValidStatementRecord(row, headers)) {
                validRecords++;
                processedRecords++;
                
                // ประมวลผลข้อมูล (เพิ่ม business logic ตามต้องการ)
                await this.processStatementRecord(row, headers, sheetName);
                
              } else {
                invalidRecords++;
              }
            } catch (error) {
              invalidRecords++;
              skippedRecords++;
            }
          }
        }
      }
      
      // สร้าง backup
      const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
      await fs.copy(filePath, backupPath);
      
      // ย้ายไฟล์ไปยัง processed directory
      const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
      await fs.move(filePath, processedPath);
      
      const processingTime = Date.now() - startTime;
      
      const result: FileProcessingResult = {
        success: true,
        message: 'ประมวลผลไฟล์ Statement สำเร็จ',
        processedAt: new Date(),
        fileId,
        statistics: {
          totalRecords,
          validRecords,
          invalidRecords,
          processedRecords,
          skippedRecords,
          processingTime,
        },
      };
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logFileProcessing(filename, false, processingTime, 0);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ Statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * สร้างรายงาน
   */
  async generateReport(fileId: string, filename: string, fileType: string): Promise<RevenueReport> {
    return {
      id: fileId,
      type: fileType as 'dbf' | 'rep' | 'statement',
      filename,
      uploadDate: new Date(),
      status: 'completed',
      fileSize: 0,
      filePath: '',
    };
  }

  /**
   * ประมวลผล batch
   */
  async processBatch(batchId: string): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    
    try {
      // ดึงข้อมูล batch จาก database
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new Error(`ไม่พบ batch ที่มี ID: ${batchId}`);
      }

      // ดึงไฟล์ใน batch
      const filesResult = await this.databaseService.getUploadRecords({
        batchId,
        limit: 1000,
      });
      const files = filesResult.records;

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
            processedRecords += fileResult.statistics.processedRecords;
            totalRecords += fileResult.statistics.totalRecords;
          } else {
            failedFiles++;
            failedRecords += fileResult.statistics.invalidRecords;
            totalRecords += fileResult.statistics.totalRecords;
          }

          if (fileResult.errors) {
            errors.push(...fileResult.errors.map(error => ({
              type: 'processing' as const,
              message: error,
              code: 'FILE_PROCESSING_ERROR',
              timestamp: new Date(),
              retryable: true,
            })));
          }
        } catch (error) {
          failedFiles++;
          errors.push({
            type: 'processing' as const,
            message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'FILE_PROCESSING_ERROR',
            timestamp: new Date(),
            retryable: true,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const success = failedFiles === 0;

      const result: BatchProcessingResult = {
        batchId,
        success,
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
          status: success ? BatchStatus.SUCCESS : failedFiles === files.length ? BatchStatus.ERROR : BatchStatus.PARTIAL,
        },
      };

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        batchId,
        success: false,
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        processingTime,
        errors: [{
          type: 'processing' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'BATCH_PROCESSING_ERROR',
          timestamp: new Date(),
          retryable: true,
        }],
        progress: {
          batchId,
          batchName: '',
          totalFiles: 0,
          completedFiles: 0,
          failedFiles: 0,
          processingFiles: 0,
          progress: 0,
          status: BatchStatus.ERROR,
        },
      };
    }
  }

  /**
   * ประมวลผลไฟล์ใน batch
   */
  async processFileInBatch(fileId: string, _batchId: string): Promise<FileProcessingResult> {
    const startTime = Date.now();
    
    try {
      // ดึงข้อมูลไฟล์จาก database
      const fileRecord = await this.databaseService.getUploadRecord(fileId);
      if (!fileRecord) {
        throw new Error(`ไม่พบไฟล์ที่มี ID: ${fileId}`);
      }

      // อัปเดตสถานะไฟล์เป็น processing
      await this.databaseService.updateUploadRecord(fileId, { status: 'processing' });

      // สร้าง validation result จากข้อมูลใน database
      const validationResult: FileValidationResult = {
        isValid: fileRecord.isValid || false,
        errors: fileRecord.errors ? JSON.parse(fileRecord.errors) : [],
        warnings: fileRecord.warnings ? JSON.parse(fileRecord.warnings) : [],
        fileType: fileRecord.fileType.toLowerCase() as any,
        recordCount: fileRecord.totalRecords || 0,
        fileSize: fileRecord.fileSize,
      };

      // ประมวลผลไฟล์
      const processingResult = await this.processFile(
        fileRecord.filePath,
        fileRecord.filename,
        validationResult
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

      return processingResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ใน batch',
        processedAt: new Date(),
        fileId,
        statistics: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          processedRecords: 0,
          skippedRecords: 0,
          processingTime,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // Helper methods
  private isValidDBFRecord(record: any): boolean {
    // ตรวจสอบข้อมูลที่จำเป็นใน DBF record
    return record && (
      record.HN || record.AN || record.DATE || record.DIAG
    );
  }

  private isValidREPRecord(row: any[], headers: string[]): boolean {
    // ตรวจสอบข้อมูลที่จำเป็นใน REP record
    const hnIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('HN'));
    const anIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('AN'));
    const dateIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('DATE'));
    
    return row && (
      (hnIndex >= 0 && row[hnIndex]) ||
      (anIndex >= 0 && row[anIndex]) ||
      (dateIndex >= 0 && row[dateIndex])
    );
  }

  private isValidStatementRecord(row: any[], headers: string[]): boolean {
    // ตรวจสอบข้อมูลที่จำเป็นใน Statement record
    const hnIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('HN'));
    const anIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('AN'));
    const dateIndex = headers.findIndex(h => h?.toString().toUpperCase().includes('DATE'));
    
    return row && (
      (hnIndex >= 0 && row[hnIndex]) ||
      (anIndex >= 0 && row[anIndex]) ||
      (dateIndex >= 0 && row[dateIndex])
    );
  }

  private async processDBFRecord(_record: any): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล DBF record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }

  private async processREPRecord(_row: any[], _headers: string[], _sheetName: string): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล REP record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }

  private async processStatementRecord(_row: any[], _headers: string[], _sheetName: string): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล Statement record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }
}

export default FileProcessingService; 