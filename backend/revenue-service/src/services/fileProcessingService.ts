// ========================================
// FILE PROCESSING SERVICE
// ========================================

import * as ExcelJS from 'exceljs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { DBFReader } from '@/utils/dbfParser';
import { v4 as uuidv4 } from 'uuid';
import { DateHelper, createTimer } from '@/utils/dateHelper';
import {
  FileValidationResult,
  FileProcessingResult,
  RevenueReport,
  BatchProcessingResult,
  ProcessingError,
  BatchStatus,
  FileProcessingStatus,
} from '@/types';
import { DatabaseService } from './databaseService';
import { logFileProcessing } from '@/utils/logger';
import config from '@/config';

export interface IFileProcessingService {
  processFile(filePath: string, filename: string, validationResult: FileValidationResult): Promise<FileProcessingResult>;
  processDBF(filePath: string, filename: string): Promise<FileProcessingResult>;
  // TODO: processREP, processStatement, generateReport, processBatch, processFileInBatch
  // ถูกลบออกเพื่อลดความซ้ำซ้อน - ใช้ BatchService สำหรับ batch operations
}

export class FileProcessingService implements IFileProcessingService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * ประมวลผลไฟล์ตามประเภท
   */
  async processFile(
    filePath: string,
    filename: string,
    validationResult: FileValidationResult,
  ): Promise<FileProcessingResult> {
    const timer = createTimer();

    try {

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

      // เพิ่ม metadata
      result.metadata = JSON.stringify({
        integrityValid: validationResult.isValid,
        validatedAt: DateHelper.toDate(DateHelper.now()),
      });

      const processingTime = timer.elapsed();
      result.statistics.processingTime = processingTime;
      
      logFileProcessing(filename, result.success, processingTime, result.statistics.totalRecords);
      return result;
      
    } catch (error) {
      const processingTime = timer.elapsed();
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
    const timer = createTimer();
    
    try {
      // อ่านไฟล์ DBF
      const buffer = await fs.readFile(filePath);
      const utf8Buffer = iconv.decode(buffer, config.fileRules.dbf.encoding);
      
      // Parse DBF ใช้ DBFReader ใหม่
      const reader = new DBFReader(Buffer.from(utf8Buffer, 'utf8'));
      const headerInfo = reader.getHeaderInfo();
      
      // ตรวจสอบขนาดไฟล์
      if (headerInfo.recordCount > 100000) {
        // ใช้ streaming processing สำหรับไฟล์ใหญ่
        return await this.processDBFStreaming(reader, filePath, filename, fileId, timer);
      } else {
        // ใช้ batch processing สำหรับไฟล์เล็ก
        return await this.processDBFBatch(reader, filePath, filename, fileId, timer);
      }
      
    } catch (error) {
      const processingTime = timer.elapsed();
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedAt: DateHelper.toDate(DateHelper.now()),
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
   * ประมวลผลไฟล์ DBF แบบ streaming สำหรับไฟล์ใหญ่
   */
  private async processDBFStreaming(
    reader: DBFReader,
    filePath: string,
    filename: string,
    fileId: string,
    timer: any
  ): Promise<FileProcessingResult> {
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    let processedRecords = 0;
    let skippedRecords = 0;

    // ใช้ streaming processing
    await reader.processRecordsStreaming(async (record, _index) => {
      totalRecords++;
      
      try {
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
    }, 1000); // Process 1000 records per batch

    // สร้าง backup
    const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
    await fs.copy(filePath, backupPath);
    
    // ย้ายไฟล์ไปยัง processed directory
    const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
    await fs.move(filePath, processedPath);
    
    const processingTime = timer.elapsed();
    
    const result: FileProcessingResult = {
      success: true,
      message: 'ประมวลผลไฟล์ DBF สำเร็จ (Streaming Mode)',
      processedAt: DateHelper.toDate(DateHelper.now()),
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
  }

  /**
   * ประมวลผลไฟล์ DBF แบบ batch สำหรับไฟล์เล็ก
   */
  private async processDBFBatch(
    reader: DBFReader,
    filePath: string,
    filename: string,
    fileId: string,
    timer: any
  ): Promise<FileProcessingResult> {
    const table = {
      header: { fields: reader.getFields() },
      records: reader.parseRecords()
    };
    
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
    
    const processingTime = timer.elapsed();
    
    const result: FileProcessingResult = {
      success: true,
      message: 'ประมวลผลไฟล์ DBF สำเร็จ (Batch Mode)',
      processedAt: DateHelper.toDate(DateHelper.now()),
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
  }

  // TODO: ฟังก์ชัน processREP ถูกลบออกเพราะไม่ได้ใช้งานใน routes
  // หากต้องการใช้งานในอนาคต สามารถเพิ่มกลับมาได้

  // TODO: ฟังก์ชัน processStatement ถูกลบออกเพราะไม่ได้ใช้งานใน routes
  // หากต้องการใช้งานในอนาคต สามารถเพิ่มกลับมาได้

  // TODO: ฟังก์ชัน generateReport ถูกลบออกเพราะไม่ได้ใช้งานใน routes
  // หากต้องการใช้งานในอนาคต สามารถเพิ่มกลับมาได้

  // TODO: ฟังก์ชัน processBatch ถูกย้ายไปใน BatchService เพื่อลดความซ้ำซ้อน
  // ใช้ BatchService.processBatch() แทน

  // TODO: ฟังก์ชัน processFileInBatch ถูกย้ายไปใน BatchService เพื่อลดความซ้ำซ้อน
  // ใช้ BatchService.processFileInBatch() แทน

  // Helper methods
  private isValidDBFRecord(record: any): boolean {
    // ตรวจสอบข้อมูลที่จำเป็นใน DBF record
    return record && (
      record.HN || record.AN || record.DATE || record.DIAG
    );
  }

  private async processDBFRecord(_record: any): Promise<void> {
    // เพิ่ม business logic สำหรับประมวลผล DBF record
    // เช่น การแปลงข้อมูล การตรวจสอบความถูกต้อง การบันทึกลงฐานข้อมูล
  }

  // TODO: Helper methods สำหรับ REP และ Statement ถูกลบออกเพราะไม่ได้ใช้งาน
  // หากต้องการใช้งานในอนาคต สามารถเพิ่มกลับมาได้
}

export default FileProcessingService; 