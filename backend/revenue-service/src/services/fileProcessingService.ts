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
  FileProcessingResult,
  ProcessingStatistics,
  RevenueReport,
  FileValidationResult,
} from '@/types';
import { FileProcessingError } from '@/utils/errorHandler';
import { logFileProcessing } from '@/utils/logger';
import config from '@/config';

export interface IFileProcessingService {
  processFile(filePath: string, filename: string, validationResult: FileValidationResult): Promise<FileProcessingResult>;
  processDBF(filePath: string, filename: string): Promise<FileProcessingResult>;
  processREP(filePath: string, filename: string): Promise<FileProcessingResult>;
  processStatement(filePath: string, filename: string): Promise<FileProcessingResult>;
  generateReport(fileId: string, filename: string, fileType: string): Promise<RevenueReport>;
}

export class FileProcessingService implements IFileProcessingService {
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
          throw new FileProcessingError(`ประเภทไฟล์ไม่รองรับ: ${validationResult.fileType}`);
      }
      
      const processingTime = Date.now() - startTime;
      result.statistics.processingTime = processingTime;
      
      logFileProcessing(filename, result.success, processingTime, result.statistics.totalRecords);
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logFileProcessing(filename, false, processingTime, 0);
      
      if (error instanceof FileProcessingError) {
        throw error;
      }
      throw new FileProcessingError(`เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${error.message}`);
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
      const dbf = new DBF(utf8Buffer);
      const table = dbf.table;
      
      if (!table || !table.records) {
        throw new FileProcessingError('ไม่สามารถอ่านข้อมูลจากไฟล์ DBF ได้');
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
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error.message}`,
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
        errors: [error.message],
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 1) { // มี header + data
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);
          
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
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ REP: ${error.message}`,
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
        errors: [error.message],
      };
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 1) { // มี header + data
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);
          
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
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ Statement: ${error.message}`,
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
        errors: [error.message],
      };
    }
  }

  /**
   * สร้างรายงาน
   */
  async generateReport(fileId: string, filename: string, fileType: string): Promise<RevenueReport> {
    const report: RevenueReport = {
      id: fileId,
      type: fileType as 'dbf' | 'rep' | 'statement',
      filename,
      uploadDate: new Date(),
      processedDate: new Date(),
      status: 'completed',
      fileSize: 0, // จะต้องอัปเดตจากไฟล์จริง
      filePath: path.join(config.upload.processedPath, `${fileId}_${filename}`),
    };
    
    return report;
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

  private async processDBFRecord(record: any): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล DBF record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }

  private async processREPRecord(row: any[], headers: string[], sheetName: string): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล REP record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }

  private async processStatementRecord(row: any[], headers: string[], sheetName: string): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล Statement record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }
}

export default FileProcessingService; 