// ========================================
// FILE VALIDATION SERVICE
// ========================================

import * as XLSX from 'xlsx';
import * as DBF from 'dbf';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import {
  FileValidationResult,
  DBFValidationResult,
  REPValidationResult,
  StatementValidationResult,
  DBFField,
} from '@/types';
import { FileValidationError } from '@/utils/errorHandler';
import { logFileValidation } from '@/utils/logger';
import config from '@/config';

export interface IFileValidationService {
  validateFile(filePath: string, filename: string): Promise<FileValidationResult>;
  validateDBF(filePath: string, filename: string): Promise<DBFValidationResult>;
  validateREP(filePath: string, filename: string): Promise<REPValidationResult>;
  validateStatement(filePath: string, filename: string): Promise<StatementValidationResult>;
}

export class FileValidationService implements IFileValidationService {
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
          throw new FileValidationError('ไม่สามารถระบุประเภทไฟล์ได้ (REP หรือ Statement)');
        }
      } else {
        throw new FileValidationError(`ประเภทไฟล์ไม่ถูกต้อง: ${fileExtension}`);
      }
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      throw new FileValidationError(`เกิดข้อผิดพลาดในการตรวจสอบไฟล์: ${error.message}`);
    }
  }

  /**
   * ตรวจสอบไฟล์ DBF
   */
  async validateDBF(filePath: string, filename: string): Promise<DBFValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // อ่านไฟล์ DBF
      const buffer = await fs.readFile(filePath);
      
      // แปลง encoding เป็น UTF-8
      const utf8Buffer = iconv.decode(buffer, config.fileRules.dbf.encoding);
      
      // Parse DBF
      const dbf = new DBF(utf8Buffer);
      const table = dbf.table;
      
      // ตรวจสอบโครงสร้าง
      if (!table || !table.fields || table.fields.length === 0) {
        errors.push('ไฟล์ DBF ไม่มีโครงสร้างที่ถูกต้อง');
      }
      
      // ตรวจสอบจำนวน records
      const recordCount = table ? table.records.length : 0;
      if (recordCount > config.validation.maxRecordCount) {
        errors.push(`จำนวน records เกินกว่าที่กำหนด (${recordCount} > ${config.validation.maxRecordCount})`);
      }
      
      // ตรวจสอบ fields ที่จำเป็น
      if (table && table.fields) {
        const fieldNames = table.fields.map((field: any) => field.name.toUpperCase());
        const requiredFields = config.validation.requiredFields.dbf;
        
        for (const requiredField of requiredFields) {
          if (!fieldNames.includes(requiredField)) {
            errors.push(`ไม่พบ field ที่จำเป็น: ${requiredField}`);
          }
        }
      }
      
      // ตรวจสอบ encoding
      if (table && table.encoding && !config.validation.allowedEncodings.includes(table.encoding)) {
        warnings.push(`Encoding ที่ใช้ (${table.encoding}) อาจไม่เหมาะสม`);
      }
      
      const result: DBFValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileType: 'dbf',
        tableName: table ? table.name : undefined,
        fieldCount: table ? table.fields.length : 0,
        recordCount,
        encoding: table ? table.encoding : undefined,
        fields: table ? table.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          length: field.length,
          decimalPlaces: field.decimalPlaces,
        })) : undefined,
        fileSize: buffer.length,
      };
      
      logFileValidation(filename, result.isValid, errors, warnings);
      return result;
      
    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ DBF: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'dbf',
        fileSize: 0,
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
      // อ่านไฟล์ Excel
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        errors.push('ไฟล์ Excel ไม่มี sheet');
      }
      
      // ตรวจสอบจำนวน sheets
      if (sheetNames.length > 10) {
        warnings.push(`จำนวน sheets มากเกินไป (${sheetNames.length} sheets)`);
      }
      
      // ตรวจสอบข้อมูลในแต่ละ sheet
      let totalRows = 0;
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          totalRows += jsonData.length;
          
          // ตรวจสอบ headers ใน sheet แรก
          if (sheetName === sheetNames[0] && jsonData.length > 0) {
            const headers = jsonData[0] as string[];
            const headerNames = headers.map(h => h?.toString().toUpperCase() || '');
            const requiredFields = config.validation.requiredFields.rep;
            
            for (const requiredField of requiredFields) {
              if (!headerNames.includes(requiredField)) {
                warnings.push(`ไม่พบ column ที่จำเป็นใน sheet "${sheetName}": ${requiredField}`);
              }
            }
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
      return result;
      
    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ REP: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'rep',
        fileSize: 0,
      };
    }
  }

  /**
   * ตรวจสอบไฟล์ Statement (Excel)
   */
  async validateStatement(filePath: string, filename: string): Promise<StatementValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // อ่านไฟล์ Excel
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        errors.push('ไฟล์ Excel ไม่มี sheet');
      }
      
      // ตรวจสอบจำนวน sheets
      if (sheetNames.length > 5) {
        warnings.push(`จำนวน sheets มากเกินไป (${sheetNames.length} sheets)`);
      }
      
      // ตรวจสอบข้อมูลในแต่ละ sheet
      let totalRows = 0;
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          totalRows += jsonData.length;
          
          // ตรวจสอบ headers ใน sheet แรก
          if (sheetName === sheetNames[0] && jsonData.length > 0) {
            const headers = jsonData[0] as string[];
            const headerNames = headers.map(h => h?.toString().toUpperCase() || '');
            const requiredFields = config.validation.requiredFields.statement;
            
            for (const requiredField of requiredFields) {
              if (!headerNames.includes(requiredField)) {
                warnings.push(`ไม่พบ column ที่จำเป็นใน sheet "${sheetName}": ${requiredField}`);
              }
            }
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
      return result;
      
    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการอ่านไฟล์ Statement: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'statement',
        fileSize: 0,
      };
    }
  }
}

export default FileValidationService; 