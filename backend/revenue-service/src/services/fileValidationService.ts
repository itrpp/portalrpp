// ========================================
// REVENUE SERVICE FILE VALIDATION SERVICE
// ========================================

import * as ExcelJS from 'exceljs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { DBFReader, parseDBFWithSchema } from '@/utils/dbfParser';
import {
  FileValidationResult,
  DBFValidationResult,
  REPValidationResult,
  StatementValidationResult,
  // DBFField,
  FileProcessingStatus,
  BatchStatus
} from '@/types';
import { FileValidationError } from '@/utils/errorHandler';
import { logFileValidation } from '@/utils/logger';
import { ValidationService } from './validationService';
import { DatabaseService } from './databaseService';
import config from '@/config';

export interface IFileValidationService {
  validateFile(filePath: string, filename: string): Promise<FileValidationResult>;
  validateDBF(filePath: string, filename: string): Promise<DBFValidationResult>;
  validateREP(filePath: string, filename: string): Promise<REPValidationResult>;
  validateStatement(filePath: string, filename: string): Promise<StatementValidationResult>;
  updateBatchSuccessFiles(batchId: string): Promise<void>;
}

export class FileValidationService implements IFileValidationService {
  private validationService: ValidationService;
  private databaseService: DatabaseService;

  constructor() {
    this.validationService = new ValidationService();
    this.databaseService = new DatabaseService();
  }

  /**
   * ตรวจสอบไฟล์ตามประเภท
   */
  async validateFile(filePath: string, filename: string): Promise<FileValidationResult> {
    const fileExtension = path.extname(filename).toLowerCase();
    
    try {
      // ตรวจสอบขนาดไฟล์
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      if (fileSize > config.validation.maxFileSize) {
        throw new FileValidationError(
          `ไฟล์มีขนาดใหญ่เกินไป (${fileSize} bytes > ${config.validation.maxFileSize} bytes)`,
        );
      }

      // ตรวจสอบ file integrity
      const integrityValidation = await this.validationService.validateFileIntegrity(filePath);
      if (!integrityValidation.isValid) {
        throw new FileValidationError(
          'ไฟล์ไม่สมบูรณ์หรือเสียหาย',
          { 
            errors: integrityValidation.errors 
          }
        );
      }

      // ตรวจสอบประเภทไฟล์
      if (fileExtension === '.dbf') {
        return await this.validateDBF(filePath, filename);
      } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        // ตรวจสอบว่าเป็น REP หรือ Statement ตามชื่อไฟล์
        if (filename.toLowerCase().includes('rep')) {
          return await this.validateREP(filePath, filename);
        } else if (filename.toLowerCase().includes('statement') || filename.toLowerCase().includes('stm')) {
          return await this.validateStatement(filePath, filename);
        } else {
          // ถ้าไม่สามารถระบุประเภทได้ ให้ถือว่าเป็น REP
          console.log('Cannot determine file type, treating as REP file');
          return await this.validateREP(filePath, filename);
        }
      } else {
        throw new FileValidationError(`ประเภทไฟล์ไม่ถูกต้อง: ${fileExtension}`);
      }
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      throw new FileValidationError(`เกิดข้อผิดพลาดในการตรวจสอบไฟล์: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ตรวจสอบไฟล์ DBF
   */
  async validateDBF(filePath: string, filename: string): Promise<DBFValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // ตรวจสอบขนาดไฟล์ก่อนโหลด
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      // ถ้าไฟล์ใหญ่มาก (> 50MB) ให้อ่านเฉพาะ header
      const MAX_SAFE_SIZE = 50 * 1024 * 1024; // 50MB
      let buffer: Buffer;
      
      if (fileSize > MAX_SAFE_SIZE) {
        // อ่านเฉพาะ header (first 1KB) สำหรับไฟล์ใหญ่
        const headerSize = 1024;
        const fd = await fs.open(filePath, 'r');
        try {
          const headerBuffer = Buffer.allocUnsafe(headerSize);
          const readResult = await fs.read(fd, headerBuffer, 0, headerSize, 0);
          buffer = headerBuffer.slice(0, readResult.bytesRead);
          warnings.push(`ไฟล์มีขนาดใหญ่ (${(fileSize / 1024 / 1024).toFixed(2)} MB) - ตรวจสอบเฉพาะ header`);
        } finally {
          await fs.close(fd);
        }
      } else {
        // อ่านไฟล์ทั้งหมดสำหรับไฟล์ขนาดปกติ
        buffer = await fs.readFile(filePath);
      }
      
      // ตรวจสอบขนาดไฟล์
      if (buffer.length === 0) {
        errors.push('ไฟล์ DBF ว่างเปล่า');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'dbf',
          fileSize: 0,
          recordCount: 0,
        };
      }
      
      // ตรวจสอบ header ของ DBF (DBF header ต้องมีขนาดอย่างน้อย 32 bytes)
      if (buffer.length < 32) {
        errors.push('ไฟล์ DBF มีขนาดเล็กเกินไป (ไม่ใช่ไฟล์ DBF ที่ถูกต้อง)');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'dbf',
          fileSize: buffer.length,
          recordCount: 0,
        };
      }
      
      // ตรวจสอบ DBF signature (0x03 = dBASE III, 0x83 = dBASE III with memo)
      const signature = buffer[0];
      if (signature !== undefined && signature !== 0x03 && signature !== 0x83) {
        warnings.push(`ไฟล์ DBF อาจไม่ใช่ dBASE III format (signature: 0x${signature.toString(16)})`);
      }
      
      let table: any = null;
      let recordCount = 0;
      
      try {
        // ลองอ่านด้วย encoding ต่างๆ
        const encodings = ['cp874', 'tis620', 'utf8', 'latin1'];
        let parseSuccess = false;
        
        for (const encoding of encodings) {
          try {
            // แปลง encoding
            const decodedBuffer = iconv.decode(buffer, encoding);
            const utf8Buffer = Buffer.from(decodedBuffer, 'utf8');
            
            // Parse DBF ใช้ DBFReader ใหม่
            const reader = new DBFReader(utf8Buffer);
            const fields = reader.getFields();
            
            // สำหรับไฟล์ใหญ่ ไม่ parse records ทั้งหมด
            let records: any[] = [];
            let actualRecordCount = 0;
            
            if (fileSize > MAX_SAFE_SIZE) {
              // สำหรับไฟล์ใหญ่ ใช้ประมาณการจาก header
              actualRecordCount = reader.getRecordCount() || 0;
              warnings.push(`ข้ามการตรวจสอบ records เนื่องจากไฟล์ใหญ่เกินไป`);
            } else {
              // สำหรับไฟล์ปกติ parse records แต่จำกัดจำนวน
              const maxRecordsToParse = 1000; // จำกัดที่ 1000 records
              const allRecords = reader.parseRecords();
              records = allRecords.slice(0, maxRecordsToParse);
              actualRecordCount = records.length;
              
              if (allRecords.length > maxRecordsToParse) {
                warnings.push(`ตรวจสอบเฉพาะ ${maxRecordsToParse} records แรกจากทั้งหมด ${allRecords.length} records`);
              }
            }
            
            table = {
              header: { fields },
              records
            };
            recordCount = actualRecordCount;
            parseSuccess = true;
            console.log(`Successfully parsed DBF with encoding: ${encoding}`);
            break;
          } catch (parseError) {
            console.log(`Failed to parse DBF with encoding ${encoding}:`, parseError);
            continue;
          }
        }
        
        if (!parseSuccess) {
          // ถ้าไม่สามารถ parse ได้ ให้ลองอ่านแบบ raw buffer
          try {
            const reader = new DBFReader(buffer);
            const fields = reader.getFields();
            
            // จำกัดการ parse records สำหรับ raw buffer ด้วย
            let records: any[] = [];
            let actualRecordCount = 0;
            
            if (fileSize > MAX_SAFE_SIZE) {
              actualRecordCount = reader.getRecordCount() || 0;
              warnings.push(`ข้ามการตรวจสอบ records (raw buffer) เนื่องจากไฟล์ใหญ่เกินไป`);
            } else {
              const maxRecordsToParse = 1000;
              const allRecords = reader.parseRecords();
              records = allRecords.slice(0, maxRecordsToParse);
              actualRecordCount = records.length;
              
              if (allRecords.length > maxRecordsToParse) {
                warnings.push(`ตรวจสอบเฉพาะ ${maxRecordsToParse} records แรกจากทั้งหมด ${allRecords.length} records (raw buffer)`);
              }
            }
            
            table = {
              header: { fields },
              records
            };
            recordCount = actualRecordCount;
            parseSuccess = true;
            console.log('Successfully parsed DBF with raw buffer');
          } catch (rawError) {
            console.log('Failed to parse DBF with raw buffer:', rawError);
            
            // ลองใช้วิธีอื่นในการอ่าน DBF
            try {
              // ใช้ parseDBFWithSchema function
              const result = parseDBFWithSchema(buffer);
              table = {
                header: { fields: result.schema },
                records: result.records
              };
              parseSuccess = true;
              console.log('Successfully parsed DBF with alternative method');
            } catch (altError) {
              console.log('Failed to parse DBF with alternative method:', altError);
              
              // ลองใช้วิธี manual parsing สำหรับไฟล์ขนาดเล็ก
              if (buffer.length < 1000) {
                try {
                  // Manual parsing สำหรับไฟล์ขนาดเล็ก
                  const headerSize = 32;
                  const header = buffer.slice(0, headerSize);
                  
                  // ตรวจสอบ signature
                  if (header[0] === 0x03 || header[0] === 0x83) {
                                         // คำนวณจำนวน records จาก header
                     const recordCountBytes = header.slice(4, 8);
                     const recordCount = recordCountBytes.length >= 4 ? recordCountBytes.readUInt32LE(0) : 0;
                    
                    // คำนวณขนาด header
                    const headerLengthBytes = header.slice(8, 10);
                    const headerLength = headerLengthBytes.readUInt16LE(0);
                    
                    // คำนวณขนาด record
                    const recordLengthBytes = header.slice(10, 12);
                    const recordLength = recordLengthBytes.readUInt16LE(0);
                    
                    console.log(`Manual parsing - Records: ${recordCount}, Header length: ${headerLength}, Record length: ${recordLength}`);
                    
                    // สร้าง table object จำลอง
                    table = {
                      header: {
                        fields: [],
                        recordCount: recordCount,
                        headerLength: headerLength,
                        recordLength: recordLength
                      },
                      records: []
                    };
                    
                    // อ่าน field definitions
                    const fieldCount = (headerLength - 33) / 32;
                    for (let i = 0; i < fieldCount; i++) {
                      const fieldStart = 32 + (i * 32);
                      const fieldData = buffer.slice(fieldStart, fieldStart + 32);
                      
                      if (fieldData[0] === 0x0D) break; // End of field definitions
                      
                      const fieldName = fieldData.slice(0, 11).toString('ascii').replace(/\0/g, '').trim();
                      const fieldType = String.fromCharCode(fieldData[11] || 0);
                      const fieldLength = fieldData[16] || 0;
                      const fieldDecimal = fieldData[17] || 0;
                      
                      if (fieldName) {
                        table.header.fields.push({
                          name: fieldName,
                          type: fieldType,
                          length: fieldLength,
                          decimal: fieldDecimal
                        });
                      }
                    }
                    
                    parseSuccess = true;
                    console.log('Successfully parsed DBF with manual parsing');
                  }
                } catch (manualError) {
                  console.log('Failed manual parsing:', manualError);
                }
              }
              
              if (!parseSuccess) {
                errors.push('ไม่สามารถอ่านไฟล์ DBF ได้ (อาจเป็นไฟล์ที่เสียหายหรือไม่ใช่ DBF format)');
                return {
                  isValid: false,
                  errors,
                  warnings,
                  fileType: 'dbf',
                  fileSize: buffer.length,
                  recordCount: 0,
                };
              }
            }
          }
        }
        
        // ตรวจสอบโครงสร้าง
        if (!table || !table.header) {
          errors.push('ไฟล์ DBF ไม่มีโครงสร้างที่ถูกต้อง (ไม่มี header)');
        } else {
          // ตรวจสอบจำนวน records
          recordCount = table.records ? table.records.length : (table.header.recordCount || 0);
          
          if (recordCount > config.validation.maxRecordCount) {
            errors.push(`จำนวน records เกินกว่าที่กำหนด (${recordCount} > ${config.validation.maxRecordCount})`);
          }
          
          // ตรวจสอบ fields ที่จำเป็น (เป็น warning เท่านั้น ไม่ใช่ error)
          if (table.header.fields && table.header.fields.length > 0) {
            const fieldNames = table.header.fields.map((field: any) => field.name.toUpperCase());
            const requiredFields = config.validation.requiredFields.dbf;
            
            console.log('DBF Fields found:', fieldNames);
            console.log('Required fields:', requiredFields);
            
            for (const requiredField of requiredFields || []) {
              if (!fieldNames.includes(requiredField)) {
                warnings.push(`ไม่พบ field ที่จำเป็น: ${requiredField}`);
              }
            }
            
            // เพิ่มข้อมูล debug
            console.log(`DBF Validation - Fields found:`, fieldNames);
            console.log(`DBF Validation - Record count:`, recordCount);
          } else {
            warnings.push('ไฟล์ DBF ไม่มี fields (อาจเป็นไฟล์ว่าง)');
          }
        }
        
      } catch (parseError) {
        console.error('DBF parsing error:', parseError);
        errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ DBF: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      const result: DBFValidationResult = {
        isValid: errors.length === 0, // ถ้าไม่มี errors ให้ถือว่าผ่าน
        errors,
        warnings,
        fileType: 'dbf',
        recordCount,
        fileSize: fileSize || buffer.length,
        encoding: config.fileRules.dbf.encoding,
        fields: table && table.header ? table.header.fields : [],
      };
      
      // ทำความสะอาด memory
      table = null;
      
      // Force garbage collection ถ้ามีให้ใช้
      if (global.gc) {
        global.gc();
      }
      
      logFileValidation(filename, result.isValid, errors, warnings);
      
      // อัปเดตสถานะในฐานข้อมูลหลังจากตรวจสอบเสร็จ
      try {
        // ค้นหา upload record ที่เกี่ยวข้องกับไฟล์นี้
        const uploadRecord = await this.databaseService.findUploadRecordByFilename(filename);
        if (uploadRecord) {
          await this.databaseService.updateUploadRecord(uploadRecord.id, {
            isValid: result.isValid,
            errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
            warnings: result.warnings.length > 0 ? JSON.stringify(result.warnings) : null,
            totalRecords: result.recordCount || 0,
            status: result.isValid ? FileProcessingStatus.VALIDATION_COMPLETED : FileProcessingStatus.VALIDATION_FAILED
          });
          console.log(`✅ อัปเดตสถานะการตรวจสอบไฟล์ ${filename} ในฐานข้อมูลสำเร็จ`);
          
          // อัปเดต batch status ถ้ามี batchId
          if (uploadRecord.batchId) {
            await this.updateBatchStatusAfterValidation(uploadRecord.batchId);
          }
        }
      } catch (dbError) {
        console.error(`❌ ไม่สามารถอัปเดตสถานะการตรวจสอบไฟล์ ${filename} ในฐานข้อมูล:`, dbError);
        // ไม่ throw error เพราะการตรวจสอบไฟล์สำเร็จแล้ว การอัปเดตฐานข้อมูลเป็นเพียงส่วนเสริม
      }
      
      return result;
      
    } catch (error) {
      console.error('DBF validation error:', error);
      errors.push(`เกิดข้อผิดพลาดในการตรวจสอบไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // อัปเดตสถานะ error ในฐานข้อมูล
      try {
        const uploadRecord = await this.databaseService.findUploadRecordByFilename(filename);
        if (uploadRecord) {
          await this.databaseService.updateUploadRecord(uploadRecord.id, {
            isValid: false,
            errors: JSON.stringify(errors),
            status: 'validation_error'
          });
          console.log(`✅ อัปเดตสถานะ error การตรวจสอบไฟล์ ${filename} ในฐานข้อมูลสำเร็จ`);
          
          // อัปเดต batch status ถ้ามี batchId
          if (uploadRecord.batchId) {
            await this.updateBatchStatusAfterValidation(uploadRecord.batchId);
          }
        }
      } catch (dbError) {
        console.error(`❌ ไม่สามารถอัปเดตสถานะ error การตรวจสอบไฟล์ ${filename} ในฐานข้อมูล:`, dbError);
      }
      
      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'dbf',
        fileSize: 0,
        recordCount: 0,
      };
    }
  }

  /**
   * ตรวจสอบไฟล์ REP (Excel)
   */
  async validateREP(filePath: string, filename: string): Promise<REPValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const fileExtension = path.extname(filename).toLowerCase();
      
      if (fileExtension === '.dbf') {
        // ถ้าเป็นไฟล์ DBF ให้เรียกใช้ validateDBF แทน
        const dbfResult = await this.validateDBF(filePath, filename);
        // แปลงผลลัพธ์ให้ตรงกับ REPValidationResult
        return {
          isValid: dbfResult.isValid,
          errors: dbfResult.errors,
          warnings: dbfResult.warnings,
          fileType: 'rep', // เปลี่ยนเป็น rep
          recordCount: dbfResult.recordCount || 0,
          fileSize: dbfResult.fileSize,
          sheetCount: 1, // DBF มี 1 sheet
          sheetNames: ['DBF_DATA'],
          totalRows: dbfResult.recordCount || 0,
        };
      } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        // ใช้ ExcelJS แทน XLSX
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const sheetNames = workbook.worksheets.map(sheet => sheet.name);
        let totalRows = 0;
        
        // นับจำนวนแถวทั้งหมดในทุก sheet
        for (const worksheet of workbook.worksheets) {
          const rowCount = worksheet.rowCount;
          totalRows += rowCount;
        }
        
        // ตรวจสอบข้อมูลใน sheet แรก
        const firstSheet = workbook.worksheets[0];
        if (!firstSheet) {
          return {
            isValid: false,
            errors: ['ไม่พบ sheet ในไฟล์ Excel'],
            warnings: [],
            fileType: 'rep',
            recordCount: 0,
            fileSize: fs.statSync(filePath).size,
            sheetCount: 0,
            sheetNames: [],
            totalRows: 0,
          };
        }
        
        // แปลงข้อมูลเป็น JSON เพื่อตรวจสอบ
        const jsonData: any[][] = [];
        firstSheet.eachRow((row, _rowNumber) => {
          const rowData: any[] = [];
          row.eachCell((cell, _colNumber) => {
            rowData.push(cell.value);
          });
          jsonData.push(rowData);
        });
        
        // ตรวจสอบ headers ใน sheet แรก
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const headerNames = headers.map(h => h?.toString().toUpperCase() || '');
          const requiredFields = config.validation.requiredFields.rep;
          
          for (const requiredField of requiredFields || []) {
            if (!headerNames.includes(requiredField)) {
              warnings.push(`ไม่พบ column ที่จำเป็นใน sheet "${firstSheet.name}": ${requiredField}`);
            }
          }
        }
        
        if (totalRows > config.validation.maxRecordCount) {
          errors.push(`จำนวน rows เกินกว่าที่กำหนด (${totalRows} > ${config.validation.maxRecordCount})`);
        }
        
        const result: REPValidationResult = {
          isValid: errors.length === 0,
          errors,
          warnings,
          fileType: 'rep',
          sheetCount: sheetNames.length,
          sheetNames,
          totalRows,
          fileSize: (await fs.stat(filePath)).size,
        };
        
        logFileValidation(filename, result.isValid, errors, warnings);
        
        // อัปเดตสถานะในฐานข้อมูลหลังจากตรวจสอบเสร็จ
        try {
          // ค้นหา upload record ที่เกี่ยวข้องกับไฟล์นี้
          const uploadRecord = await this.databaseService.findUploadRecordByFilename(filename);
          if (uploadRecord) {
            await this.databaseService.updateUploadRecord(uploadRecord.id, {
              isValid: result.isValid,
              errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
              warnings: result.warnings.length > 0 ? JSON.stringify(result.warnings) : null,
              totalRecords: result.totalRows || 0,
              status: result.isValid ? FileProcessingStatus.VALIDATION_COMPLETED : FileProcessingStatus.VALIDATION_FAILED
            });
            console.log(`✅ อัปเดตสถานะการตรวจสอบไฟล์ REP ${filename} ในฐานข้อมูลสำเร็จ`);
            
            // อัปเดต batch status ถ้ามี batchId
            if (uploadRecord.batchId) {
              await this.updateBatchStatusAfterValidation(uploadRecord.batchId);
            }
          }
        } catch (dbError) {
          console.error(`❌ ไม่สามารถอัปเดตสถานะการตรวจสอบไฟล์ REP ${filename} ในฐานข้อมูล:`, dbError);
          // ไม่ throw error เพราะการตรวจสอบไฟล์สำเร็จแล้ว การอัปเดตฐานข้อมูลเป็นเพียงส่วนเสริม
        }
        
        return result;
        
      } else {
        throw new FileValidationError(`ประเภทไฟล์ไม่ถูกต้อง: ${fileExtension}`);
      }
    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ REP: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      const result: REPValidationResult = {
        isValid: false,
        errors,
        warnings,
        fileType: 'rep',
        recordCount: 0,
        fileSize: (await fs.stat(filePath)).size,
        sheetCount: 0,
        sheetNames: [],
        totalRows: 0,
      };
      
      logFileValidation(filename, result.isValid, errors, warnings);
      return result;
    }
  }

  /**
   * ตรวจสอบไฟล์ Statement (Excel)
   */
  async validateStatement(filePath: string, filename: string): Promise<StatementValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const fileExtension = path.extname(filename).toLowerCase();
      
      if (fileExtension === '.dbf') {
        // ถ้าเป็นไฟล์ DBF ให้เรียกใช้ validateDBF แทน
        const dbfResult = await this.validateDBF(filePath, filename);
        // แปลงผลลัพธ์ให้ตรงกับ StatementValidationResult
        return {
          isValid: dbfResult.isValid,
          errors: dbfResult.errors,
          warnings: dbfResult.warnings,
          fileType: 'statement', // เปลี่ยนเป็น statement
          recordCount: dbfResult.recordCount || 0,
          fileSize: dbfResult.fileSize,
          sheetCount: 1, // DBF มี 1 sheet
          sheetNames: ['DBF_DATA'],
          totalRows: dbfResult.recordCount || 0,
        };
      } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        // ใช้ ExcelJS แทน XLSX
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const sheetNames = workbook.worksheets.map(sheet => sheet.name);
        let totalRows = 0;
        
        // นับจำนวนแถวทั้งหมดในทุก sheet
        for (const worksheet of workbook.worksheets) {
          const rowCount = worksheet.rowCount;
          totalRows += rowCount;
        }
        
        // ตรวจสอบข้อมูลใน sheet แรก
        const firstSheet = workbook.worksheets[0];
        if (!firstSheet) {
          return {
            isValid: false,
            errors: ['ไม่พบ sheet ในไฟล์ Excel'],
            warnings: [],
            fileType: 'statement',
            recordCount: 0,
            fileSize: fs.statSync(filePath).size,
            sheetCount: 0,
            sheetNames: [],
            totalRows: 0,
          };
        }
        
        // แปลงข้อมูลเป็น JSON เพื่อตรวจสอบ
        const jsonData: any[][] = [];
        firstSheet.eachRow((row, _rowNumber) => {
          const rowData: any[] = [];
          row.eachCell((cell, _colNumber) => {
            rowData.push(cell.value);
          });
          jsonData.push(rowData);
        });
        
        // ตรวจสอบ headers ใน sheet แรก
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const headerNames = headers.map(h => h?.toString().toUpperCase() || '');
          const requiredFields = config.validation.requiredFields.statement;
          
          for (const requiredField of requiredFields || []) {
            if (!headerNames.includes(requiredField)) {
              warnings.push(`ไม่พบ column ที่จำเป็นใน sheet "${firstSheet.name}": ${requiredField}`);
            }
          }
        }
        
        if (totalRows > config.validation.maxRecordCount) {
          errors.push(`จำนวน rows เกินกว่าที่กำหนด (${totalRows} > ${config.validation.maxRecordCount})`);
        }
        
        const result: StatementValidationResult = {
          isValid: errors.length === 0,
          errors,
          warnings,
          fileType: 'statement',
          sheetCount: sheetNames.length,
          sheetNames,
          totalRows,
          fileSize: (await fs.stat(filePath)).size,
        };
        
        logFileValidation(filename, result.isValid, errors, warnings);
        
        // อัปเดตสถานะในฐานข้อมูลหลังจากตรวจสอบเสร็จ
        try {
          // ค้นหา upload record ที่เกี่ยวข้องกับไฟล์นี้
          const uploadRecord = await this.databaseService.findUploadRecordByFilename(filename);
          if (uploadRecord) {
            await this.databaseService.updateUploadRecord(uploadRecord.id, {
              isValid: result.isValid,
              errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
              warnings: result.warnings.length > 0 ? JSON.stringify(result.warnings) : null,
              totalRecords: result.totalRows || 0,
              status: result.isValid ? FileProcessingStatus.VALIDATION_COMPLETED : FileProcessingStatus.VALIDATION_FAILED
            });
            console.log(`✅ อัปเดตสถานะการตรวจสอบไฟล์ Statement ${filename} ในฐานข้อมูลสำเร็จ`);
            
            // อัปเดต batch status ถ้ามี batchId
            if (uploadRecord.batchId) {
              await this.updateBatchStatusAfterValidation(uploadRecord.batchId);
            }
          }
        } catch (dbError) {
          console.error(`❌ ไม่สามารถอัปเดตสถานะการตรวจสอบไฟล์ Statement ${filename} ในฐานข้อมูล:`, dbError);
          // ไม่ throw error เพราะการตรวจสอบไฟล์สำเร็จแล้ว การอัปเดตฐานข้อมูลเป็นเพียงส่วนเสริม
        }
        
        return result;
        
      } else {
        throw new FileValidationError(`ประเภทไฟล์ไม่ถูกต้อง: ${fileExtension}`);
      }
    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ Statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      const result: StatementValidationResult = {
        isValid: false,
        errors,
        warnings,
        fileType: 'statement',
        recordCount: 0,
        fileSize: (await fs.stat(filePath)).size,
        sheetCount: 0,
        sheetNames: [],
        totalRows: 0,
      };
      
      logFileValidation(filename, result.isValid, errors, warnings);
      return result;
    }
  }

  /**
   * อัปเดต batch status หลังจาก validation เสร็จ
   */
  private async updateBatchStatusAfterValidation(batchId: string): Promise<void> {
    try {
      // ดึงข้อมูล batch ปัจจุบัน
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        console.log(`⚠️ ไม่พบ batch ${batchId} สำหรับการอัปเดต status`);
        return;
      }

      // ดึงข้อมูล files ทั้งหมดใน batch
      const files = await this.databaseService.getUploadRecords({
        batchId,
        limit: 1000 // ดึงไฟล์ทั้งหมดใน batch
      });

      if (!files.records || files.records.length === 0) {
        console.log(`⚠️ ไม่พบไฟล์ใน batch ${batchId}`);
        return;
      }

      // คำนวณสถานะของ batch
      const totalFiles = files.records.length;
      const completedFiles = files.records.filter(f => 
        f.status === FileProcessingStatus.VALIDATION_COMPLETED || 
        f.status === FileProcessingStatus.VALIDATION_FAILED || 
        f.status === FileProcessingStatus.VALIDATION_ERROR ||
        f.status === 'imported' ||

        f.status === FileProcessingStatus.SUCCESS
      ).length;
      const successFiles = files.records.filter(f => 
        f.status === FileProcessingStatus.VALIDATION_COMPLETED || 
        f.status === 'imported' ||
        f.status === FileProcessingStatus.SUCCESS
      ).length;
      const errorFiles = files.records.filter(f => 
        f.status === FileProcessingStatus.VALIDATION_FAILED || 
        f.status === FileProcessingStatus.VALIDATION_ERROR ||

        f.status === FileProcessingStatus.FAILED
      ).length;
      const processingFiles = files.records.filter(f => 
        f.status === FileProcessingStatus.PENDING || 
        f.status === FileProcessingStatus.PROCESSING
      ).length;

      // กำหนด batch status ใหม่
      let newBatchStatus: BatchStatus;
      if (completedFiles === totalFiles) {
        // ประมวลผลเสร็จแล้วทั้งหมด
        if (errorFiles === 0) {
          newBatchStatus = BatchStatus.SUCCESS; // ใช้ BatchStatus.SUCCESS แทน string
        } else if (successFiles === 0) {
          newBatchStatus = BatchStatus.ERROR;
        } else {
          newBatchStatus = BatchStatus.PARTIAL_SUCCESS;
        }
      } else {
        newBatchStatus = BatchStatus.PROCESSING;
      }

      // อัปเดต batch status
      await this.databaseService.updateUploadBatch(batchId, {
        totalFiles,
        successFiles,
        errorFiles,
        processingFiles,
        status: newBatchStatus
      });

      console.log(`✅ อัปเดต batch ${batchId} status เป็น ${newBatchStatus} (${successFiles}/${totalFiles} สำเร็จ, ${errorFiles}/${totalFiles} ผิดพลาด)`);

    } catch (error) {
      console.error(`❌ ไม่สามารถอัปเดต batch status สำหรับ batch ${batchId}:`, error);
      // ไม่ throw error เพราะการอัปเดต batch status เป็นเพียงส่วนเสริม
    }
  }

  async updateBatchSuccessFiles(batchId: string): Promise<void> {
    try {
      // อัปเดต batch status และ statistics หลังจาก validation เสร็จ
      await this.updateBatchStatusAfterValidation(batchId);
      
      // อัปเดต batch success files ใน database service
      await this.databaseService.updateBatchSuccessFiles(batchId);
      
      console.log(`Successfully updated batch ${batchId} with success files and status.`);
    } catch (error) {
      console.error(`Failed to update batch ${batchId} with success files:`, error);
      throw new Error(`Failed to update batch ${batchId} with success files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default FileValidationService; 