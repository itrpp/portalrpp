// ========================================
// REVENUE SERVICE VALIDATION SERVICE (CONSOLIDATED)
// ========================================

import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { 
  ValidationError, 
  ProcessingError, 
  ValidationResult, 
  BatchValidationResult, 
  FileValidationRule,
  FileValidationResult,
  DBFValidationResult,
  REPValidationResult,
  StatementValidationResult,
  IValidationService
} from '@/types';
import { FileValidationError } from '@/utils/errorHandler';
import { DateHelper } from '@/utils/dateUtils';
import { logError, logInfo, logFileValidation } from '@/utils/logger';
import { parseDBFWithSchema } from '@/services/dbfService';
import { DatabaseService } from './databaseService';
import config from '@/config';

// Interfaces moved to @/types

export class ValidationService implements IValidationService {
  private rules: Map<string, FileValidationRule[]>;
  private allowedAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];
  private maxFileSize: number = 52428800; // 50MB
  private databaseService: DatabaseService;
  private allowedFileTypes: string[] = ['.dbf', '.xls', '.xlsx'];
  private maliciousPatterns: RegExp[] = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
  ];

  constructor(databaseService?: DatabaseService) {
    this.rules = new Map();
    // ใช้ dependency injection หรือสร้าง instance ใหม่ถ้าไม่ได้ส่งมา
    this.databaseService = databaseService || new DatabaseService();
    this.initializeRules();
  }

  private initializeRules(): void {
    // File validation rules
    this.rules.set('file', [
      {
        field: 'filename',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255,
        errorMessage: 'ชื่อไฟล์ไม่ถูกต้อง',
      },
      {
        field: 'size',
        required: true,
        type: 'number',
        minValue: 1,
        maxValue: this.maxFileSize,
        errorMessage: 'ขนาดไฟล์ไม่ถูกต้อง',
      },
      {
        field: 'mimetype',
        required: true,
        type: 'string',
        pattern: '^application/(octet-stream|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet)$',
        errorMessage: 'ประเภทไฟล์ไม่ถูกต้อง',
      },
    ]);

    // Batch validation rules
    this.rules.set('batch', [
      {
        field: 'batchName',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255,
        errorMessage: 'ชื่อ batch ไม่ถูกต้อง',
      },
      {
        field: 'files',
        required: true,
        type: 'string',
        minValue: 1,
        maxValue: 10,
        errorMessage: 'จำนวนไฟล์ไม่ถูกต้อง',
      },
    ]);

    // Security validation rules
    this.rules.set('security', [
      {
        field: 'filename',
        required: true,
        type: 'string',
        customValidator: (value: string) => !this.isMaliciousFilename(value),
        errorMessage: 'ชื่อไฟล์ไม่ปลอดภัย',
      },
      {
        field: 'size',
        required: true,
        type: 'number',
        maxValue: this.maxFileSize,
        errorMessage: 'ขนาดไฟล์เกินขีดจำกัด',
      },
    ]);
  }

  /**
   * ตรวจสอบ checksum ของไฟล์
   */
  async validateChecksum(filePath: string, expectedChecksum?: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      if (!await fs.pathExists(filePath)) {
        const errorMessage = 'ไม่พบไฟล์ที่ระบุ';
        errors.push({
          field: 'filePath',
          message: errorMessage,
          code: 'FILE_NOT_FOUND',
        });
        throw new FileValidationError(errorMessage, { filePath, errors });
      }

      const actualChecksum = await this.generateChecksum(filePath, 'sha256');
      
      if (expectedChecksum && actualChecksum !== expectedChecksum) {
        const errorMessage = 'Checksum ไม่ตรงกัน';
        errors.push({
          field: 'checksum',
          message: errorMessage,
          code: 'CHECKSUM_MISMATCH',
          value: { expected: expectedChecksum, actual: actualChecksum },
        });
        throw new FileValidationError(errorMessage, { 
          filePath, 
          expectedChecksum, 
          actualChecksum, 
          errors 
        });
      }

      logInfo('Checksum validation passed', { 
        filePath, 
        checksum: actualChecksum 
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          checksum: {
            isValid: errors.length === 0,
            errors: errors.filter(e => e.field === 'checksum'),
            warnings: [],
          },
        },
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('Checksum validation failed', error as Error, { filePath });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบ checksum';
      errors.push({
        field: 'checksum',
        message: errorMessage,
        code: 'CHECKSUM_ERROR',
      });
      throw new FileValidationError(errorMessage, { filePath, errors });
    }
  }

  /**
   * ตรวจสอบความสมบูรณ์ของไฟล์
   */
  async validateFileIntegrity(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      if (!await fs.pathExists(filePath)) {
        const errorMessage = 'ไม่พบไฟล์ที่ระบุ';
        errors.push({
          field: 'filePath',
          message: errorMessage,
          code: 'FILE_NOT_FOUND',
        });
        throw new FileValidationError(errorMessage, { filePath, errors });
      }

      const stats = await fs.stat(filePath);
      
      // ตรวจสอบขนาดไฟล์
      if (stats.size === 0) {
        const errorMessage = 'ไฟล์ว่างเปล่า';
        errors.push({
          field: 'fileSize',
          message: errorMessage,
          code: 'EMPTY_FILE',
        });
        throw new FileValidationError(errorMessage, { filePath, fileSize: stats.size, errors });
      }

      // ตรวจสอบสิทธิ์การเข้าถึง
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch (error) {
        const errorMessage = 'ไม่มีสิทธิ์ในการอ่านไฟล์';
        errors.push({
          field: 'filePermissions',
          message: errorMessage,
          code: 'PERMISSION_DENIED',
        });
        throw new FileValidationError(errorMessage, { filePath, errors });
      }

      // ตรวจสอบนามสกุลไฟล์
      const extension = path.extname(filePath).toLowerCase();
      if (!this.allowedFileTypes.includes(extension)) {
        const errorMessage = 'นามสกุลไฟล์ไม่ได้รับอนุญาต';
        errors.push({
          field: 'fileExtension',
          message: errorMessage,
          code: 'INVALID_EXTENSION',
          value: extension,
        });
        throw new FileValidationError(errorMessage, { filePath, extension, errors });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          integrity: {
            isValid: errors.length === 0,
            errors: errors.filter(e => e.field !== 'filePath'),
            warnings: [],
          },
        },
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('File integrity validation failed', error as Error, { filePath });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบความสมบูรณ์ของไฟล์';
      errors.push({
        field: 'integrity',
        message: errorMessage,
        code: 'INTEGRITY_ERROR',
      });
      throw new FileValidationError(errorMessage, { filePath, errors });
    }
  }

  /**
   * ตรวจสอบความปลอดภัยของไฟล์
   */
  async validateFileSecurity(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // ตรวจสอบชื่อไฟล์
      if (this.isMaliciousFilename(file.originalname)) {
        const errorMessage = 'ชื่อไฟล์ไม่ปลอดภัย';
        errors.push({
          field: 'filename',
          message: errorMessage,
          code: 'MALICIOUS_FILENAME',
          value: file.originalname,
        });
        throw new FileValidationError(errorMessage, { 
          filename: file.originalname, 
          errors 
        });
      }

      // ตรวจสอบขนาดไฟล์
      if (file.size > this.maxFileSize) {
        const errorMessage = 'ขนาดไฟล์เกินขีดจำกัด';
        errors.push({
          field: 'fileSize',
          message: errorMessage,
          code: 'FILE_TOO_LARGE',
          value: file.size,
        });
        throw new FileValidationError(errorMessage, { 
          filename: file.originalname, 
          fileSize: file.size, 
          maxFileSize: this.maxFileSize, 
          errors 
        });
      }

      // ตรวจสอบประเภทไฟล์
      const extension = path.extname(file.originalname).toLowerCase();
      if (!this.allowedFileTypes.includes(extension)) {
        const errorMessage = 'ประเภทไฟล์ไม่ได้รับอนุญาต';
        errors.push({
          field: 'fileType',
          message: errorMessage,
          code: 'INVALID_FILE_TYPE',
          value: extension,
        });
        throw new FileValidationError(errorMessage, { 
          filename: file.originalname, 
          extension, 
          allowedTypes: this.allowedFileTypes, 
          errors 
        });
      }

      // ตรวจสอบ MIME type
      if (!this.isValidMimeType(file.mimetype)) {
        const errorMessage = 'MIME type ไม่ถูกต้อง';
        errors.push({
          field: 'mimetype',
          message: errorMessage,
          code: 'INVALID_MIME_TYPE',
          value: file.mimetype,
        });
        throw new FileValidationError(errorMessage, { 
          filename: file.originalname, 
          mimetype: file.mimetype, 
          errors 
        });
      }

      // ตรวจสอบเนื้อหาไฟล์ (basic check)
      if (file.buffer && file.buffer.length > 0) {
        const contentCheck = this.checkFileContent(file.buffer);
        if (!contentCheck.isValid) {
          errors.push(...contentCheck.errors);
          warnings.push(...contentCheck.warnings);
          
          if (contentCheck.errors.length > 0) {
            const errorMessage = 'พบเนื้อหาที่ไม่ปลอดภัยในไฟล์';
            throw new FileValidationError(errorMessage, { 
              filename: file.originalname, 
              errors: contentCheck.errors 
            });
          }
        }
      }



      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          security: {
            isValid: errors.length === 0,
            errors,
            warnings,
          },
        },
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('File security validation failed', error as Error, { filename: file.originalname });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบความปลอดภัย';
      errors.push({
        field: 'security',
        message: errorMessage,
        code: 'SECURITY_ERROR',
      });
      throw new FileValidationError(errorMessage, { filename: file.originalname, errors });
    }
  }

  /**
   * สร้าง checksum ของไฟล์
   */
  async generateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    if (!this.allowedAlgorithms.includes(algorithm)) {
      throw new FileValidationError(`Algorithm ไม่ได้รับอนุญาต: ${algorithm}`, { 
        algorithm, 
        allowedAlgorithms: this.allowedAlgorithms 
      });
    }

    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error) => {
        reject(new FileValidationError('เกิดข้อผิดพลาดในการสร้าง checksum', { 
          filePath, 
          algorithm, 
          error: error.message 
        }));
      });
    });
  }

  /**
   * ตรวจสอบความปลอดภัยของ batch
   */
  async validateBatchSecurity(batchId: string, files: Express.Multer.File[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // ตรวจสอบจำนวนไฟล์
      if (files.length > 10) {
        const errorMessage = 'จำนวนไฟล์ใน batch เกินขีดจำกัด';
        errors.push({
          field: 'batchSize',
          message: errorMessage,
          code: 'BATCH_TOO_LARGE',
          value: files.length,
        });
        throw new FileValidationError(errorMessage, { 
          batchId, 
          fileCount: files.length, 
          maxFiles: 10, 
          errors 
        });
      }

      // ตรวจสอบขนาดรวมของ batch
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxBatchSize = this.maxFileSize * 10; // 500MB
      
      if (totalSize > maxBatchSize) {
        const errorMessage = 'ขนาดรวมของ batch เกินขีดจำกัด';
        errors.push({
          field: 'batchSize',
          message: errorMessage,
          code: 'BATCH_SIZE_TOO_LARGE',
          value: totalSize,
        });
        throw new FileValidationError(errorMessage, { 
          batchId, 
          totalSize, 
          maxBatchSize, 
          errors 
        });
      }

      // ตรวจสอบไฟล์แต่ละไฟล์
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const fileSecurity = await this.validateFileSecurity(file!);
          
          if (!fileSecurity.isValid) {
            errors.push(...fileSecurity.errors.map(error => ({
              ...error,
              field: `file_${i}_${error.field}`,
            })));
          }
          
          warnings.push(...fileSecurity.warnings.map(warning => `File ${i + 1}: ${warning}`));
        } catch (error) {
          if (error instanceof FileValidationError) {
            errors.push(...error.details?.errors || []);
          } else {
            errors.push({
              field: `file_${i}`,
              message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
              code: 'FILE_SECURITY_ERROR',
            });
          }
        }
      }

      if (errors.length > 0) {
        const errorMessage = 'พบไฟล์ที่ไม่ปลอดภัยใน batch';
        throw new FileValidationError(errorMessage, { 
          batchId, 
          totalFiles: files.length, 
          errors 
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          batchSecurity: {
            isValid: errors.length === 0,
            errors,
            warnings,
          },
        },
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('Batch security validation failed', error as Error, { batchId });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบความปลอดภัยของ batch';
      errors.push({
        field: 'batchSecurity',
        message: errorMessage,
        code: 'BATCH_SECURITY_ERROR',
      });
      throw new FileValidationError(errorMessage, { batchId, errors });
    }
  }

  /**
   * ตรวจสอบว่าเป็นชื่อไฟล์ที่เป็นอันตรายหรือไม่
   */
  private isMaliciousFilename(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    
    // ตรวจสอบนามสกุลที่เป็นอันตราย
    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(lowerFilename)) {
        return true;
      }
    }
    
    // ตรวจสอบชื่อไฟล์ที่สงสัย
    const suspiciousNames = [
      'virus', 'malware', 'trojan', 'spyware', 'backdoor',
      'keylogger', 'rootkit', 'worm', 'ransomware',
    ];
    
    for (const suspicious of suspiciousNames) {
      if (lowerFilename.includes(suspicious)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * ตรวจสอบ MIME type
   */
  private isValidMimeType(mimetype: string): boolean {
    const allowedMimeTypes = [
      'application/octet-stream',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    return allowedMimeTypes.includes(mimetype);
  }

  /**
   * ตรวจสอบเนื้อหาไฟล์
   */
  private checkFileContent(buffer: Buffer): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)); // ตรวจสอบ 1KB แรก
      
      // ตรวจสอบสคริปต์ที่เป็นอันตราย
      const scriptPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload/i,
        /onerror/i,
        /eval\(/i,
        /document\./i,
        /window\./i,
      ];
      
      for (const pattern of scriptPatterns) {
        if (pattern.test(content)) {
          errors.push({
            field: 'content',
            message: 'พบสคริปต์ที่เป็นอันตรายในไฟล์',
            code: 'MALICIOUS_CONTENT',
          });
          break;
        }
      }
      
      // ตรวจสอบ null bytes
      if (buffer.includes(0)) {
        warnings.push('พบ null bytes ในไฟล์');
      }
      
      // ตรวจสอบ encoding ที่ไม่ปกติ
      if (content.includes('')) {
        warnings.push('พบ encoding ที่ไม่ปกติในไฟล์');
      }
      
    } catch (error) {
      warnings.push('ไม่สามารถตรวจสอบเนื้อหาไฟล์ได้');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldResults: {},
    };
  }



  async validateFile(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const fieldResults: Record<string, any> = {};

    try {
      // ตรวจสอบไฟล์มีอยู่หรือไม่
      if (!file) {
        const errorMessage = 'ไม่พบไฟล์ที่อัปโหลด';
        errors.push({
          field: 'file',
          message: errorMessage,
          code: 'FILE_MISSING',
        });
        throw new FileValidationError(errorMessage, { errors });
      }

      // ตรวจสอบความปลอดภัย
      const securityValidation = await this.validateFileSecurity(file);
      if (!securityValidation.isValid) {
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      // ตรวจสอบตาม rules
      const fileRules = this.rules.get('file') || [];
      for (const rule of fileRules) {
        const fieldValue = this.getFieldValue(file, rule.field);
        const fieldResult = this.validateField(fieldValue, rule);
        
        fieldResults[rule.field] = fieldResult;
        
        if (!fieldResult.isValid) {
          errors.push(...fieldResult.errors);
        }
        
        warnings.push(...fieldResult.warnings);
      }

      if (errors.length > 0) {
        const errorMessage = 'ไฟล์ไม่ผ่านการตรวจสอบ';
        throw new FileValidationError(errorMessage, { 
          filename: file.originalname, 
          errors 
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults,
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('File validation failed', error as Error, { filename: file?.originalname });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์';
      errors.push({
        field: 'validation',
        message: errorMessage,
        code: 'VALIDATION_ERROR',
      });
      throw new FileValidationError(errorMessage, { filename: file?.originalname, errors });
    }
  }

  async validateBatch(batchId: string, files: Express.Multer.File[]): Promise<BatchValidationResult> {
    const errors: ProcessingError[] = [];
    const fileResults: Record<string, ValidationResult> = {};

    try {
      // ตรวจสอบความปลอดภัยของ batch
      const batchSecurity = await this.validateBatchSecurity(batchId, files);
      if (!batchSecurity.isValid) {
        errors.push(...batchSecurity.errors.map(error => ({
          type: 'validation' as const,
          message: error.message,
          code: 'PROCESSING_ERROR' as const,
          details: error.value,
          timestamp: DateHelper.toDate(DateHelper.now()),
          retryable: false,
        })));
      }

      // ตรวจสอบไฟล์แต่ละไฟล์
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const fileValidation = await this.validateFile(file!);
          
          fileResults[`file_${i}`] = fileValidation;
          
          if (!fileValidation.isValid) {
            errors.push(...fileValidation.errors.map(error => ({
              type: 'validation' as const,
              message: error.message,
              code: 'PROCESSING_ERROR' as const,
              details: { filename: file!.originalname, field: error.field },
              timestamp: DateHelper.toDate(DateHelper.now()),
              retryable: false,
            })));
          }
        } catch (error) {
          if (error instanceof FileValidationError) {
            errors.push({
              type: 'validation' as const,
              message: error.message,
              code: 'FILE_VALIDATION_ERROR',
              details: { filename: file!.originalname, errors: error.details?.errors },
              timestamp: DateHelper.toDate(DateHelper.now()),
              retryable: false,
            });
          } else {
            errors.push({
              type: 'system' as const,
              message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
              code: 'FILE_VALIDATION_SYSTEM_ERROR',
              details: { filename: file!.originalname },
              timestamp: DateHelper.toDate(DateHelper.now()),
              retryable: true,
            });
          }
        }
      }

      if (errors.length > 0) {
        const errorMessage = 'Batch ไม่ผ่านการตรวจสอบ';
        throw new FileValidationError(errorMessage, { 
          batchId, 
          totalFiles: files.length, 
          errors 
        });
      }

      return {
        batchId,
        isValid: errors.length === 0,
        totalFiles: files.length,
        validFiles: files.length - errors.length,
        invalidFiles: errors.length,
        errors,
        fileResults,
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('Batch validation failed', error as Error, { batchId });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบ batch';
      errors.push({
        type: 'system',
        message: errorMessage,
        code: 'BATCH_VALIDATION_ERROR',
        details: { batchId },
        timestamp: new Date(),
        retryable: true,
      });
      
      throw new FileValidationError(errorMessage, { batchId, errors });
    }
  }

  validateField(value: any, rule: FileValidationRule): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // ตรวจสอบ required
      if (rule.required) {
        const requiredErrors = this.validateRequired(value, rule.field);
        errors.push(...requiredErrors);
      }

      if (value !== undefined && value !== null) {
        // ตรวจสอบ type
        const typeErrors = this.validateType(value, rule.type, rule.field);
        errors.push(...typeErrors);

        // ตรวจสอบ length (สำหรับ string)
        if (rule.type === 'string' && typeof value === 'string') {
          const lengthErrors = this.validateLength(value, rule.minLength, rule.maxLength, rule.field);
          errors.push(...lengthErrors);
        }

        // ตรวจสอบ range (สำหรับ number)
        if (rule.type === 'number' && typeof value === 'number') {
          const rangeErrors = this.validateRange(value, rule.minValue, rule.maxValue, rule.field);
          errors.push(...rangeErrors);
        }

        // ตรวจสอบ pattern
        if (rule.pattern && typeof value === 'string') {
          const patternErrors = this.validatePattern(value, rule.pattern, rule.field);
          errors.push(...patternErrors);
        }

        // ตรวจสอบ custom validator
        if (rule.customValidator) {
          const customErrors = this.validateCustom(value, rule.customValidator, rule.field);
          errors.push(...customErrors);
        }
      }

      if (errors.length > 0 && rule.errorMessage) {
        throw new FileValidationError(rule.errorMessage, { 
          field: rule.field, 
          value, 
          errors 
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {},
      };
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      logError('Field validation failed', error as Error, { field: rule.field, value });
      const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบ field';
      errors.push({
        field: rule.field,
        message: errorMessage,
        code: 'FIELD_VALIDATION_ERROR',
        value,
      });
      throw new FileValidationError(errorMessage, { field: rule.field, value, errors });
    }
  }

  validateRequired(value: any, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === undefined || value === null || value === '') {
      errors.push({
        field: fieldName,
        message: `${fieldName} จำเป็นต้องมีค่า`,
        code: 'REQUIRED_FIELD_MISSING',
        value,
      });
    }

    return errors;
  }

  validateType(value: any, expectedType: string, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: fieldName,
            message: `${fieldName} ต้องเป็นข้อความ`,
            code: 'INVALID_TYPE',
            value,
          });
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} ต้องเป็นตัวเลข`,
            code: 'INVALID_TYPE',
            value,
          });
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: fieldName,
            message: `${fieldName} ต้องเป็น boolean`,
            code: 'INVALID_TYPE',
            value,
          });
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} ต้องเป็น array`,
            code: 'INVALID_TYPE',
            value,
          });
        }
        break;
      case 'date':
        if (!(value instanceof Date) && !DateHelper.isValid(DateHelper.fromISO(value))) {
          errors.push({
            field: fieldName,
            message: `${fieldName} ต้องเป็นวันที่`,
            code: 'INVALID_TYPE',
            value,
          });
        }
        break;
    }

    return errors;
  }

  validateLength(value: string, minLength?: number, maxLength?: number, fieldName?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        errors.push({
          field: fieldName || 'length',
          message: `${fieldName || 'Field'} ต้องมีความยาวอย่างน้อย ${minLength} ตัวอักษร`,
          code: 'LENGTH_TOO_SHORT',
          value: value.length,
        });
      }

      if (maxLength !== undefined && value.length > maxLength) {
        errors.push({
          field: fieldName || 'length',
          message: `${fieldName || 'Field'} ต้องมีความยาวไม่เกิน ${maxLength} ตัวอักษร`,
          code: 'LENGTH_TOO_LONG',
          value: value.length,
        });
      }
    }

    return errors;
  }

  validateRange(value: number, minValue?: number, maxValue?: number, fieldName?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value === 'number') {
      if (minValue !== undefined && value < minValue) {
        errors.push({
          field: fieldName || 'range',
          message: `${fieldName || 'Field'} ต้องมีค่าอย่างน้อย ${minValue}`,
          code: 'VALUE_TOO_SMALL',
          value,
        });
      }

      if (maxValue !== undefined && value > maxValue) {
        errors.push({
          field: fieldName || 'range',
          message: `${fieldName || 'Field'} ต้องมีค่าไม่เกิน ${maxValue}`,
          code: 'VALUE_TOO_LARGE',
          value,
        });
      }
    }

    return errors;
  }

  validatePattern(value: string, pattern: string, fieldName?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        errors.push({
          field: fieldName || 'pattern',
          message: `${fieldName || 'Field'} ไม่ตรงกับรูปแบบที่กำหนด`,
          code: 'PATTERN_MISMATCH',
          value,
        });
      }
    }

    return errors;
  }

  validateCustom(value: any, validator: (value: any) => boolean, fieldName?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      if (!validator(value)) {
        errors.push({
          field: fieldName || 'custom',
          message: `${fieldName || 'Field'} ไม่ผ่านการตรวจสอบแบบกำหนดเอง`,
          code: 'CUSTOM_VALIDATION_FAILED',
          value,
        });
      }
    } catch (error) {
      errors.push({
        field: fieldName || 'custom',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบแบบกำหนดเอง',
        code: 'CUSTOM_VALIDATION_ERROR',
        value,
      });
    }

    return errors;
  }

  private getFieldValue(file: Express.Multer.File, field: string): any {
    switch (field) {
      case 'filename':
        return file.originalname;
      case 'size':
        return file.size;
      case 'mimetype':
        return file.mimetype;
      case 'fieldname':
        return file.fieldname;
      case 'encoding':
        return file.encoding;
      default:
        return undefined;
    }
  }

  // ========================================
  // FILE TYPE VALIDATION METHODS (from FileValidationService)
  // ========================================

  /**
   * ตรวจสอบไฟล์ตามประเภท
   */
  async validateFileByType(filePath: string, filename: string): Promise<FileValidationResult> {
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
      const integrityValidation = await this.validateFileIntegrity(filePath);
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

      // ตรวจสอบ header ของไฟล์ DBF
      if (buffer.length < 32) {
        errors.push('ไฟล์ DBF ไม่สมบูรณ์ (header สั้นเกินไป)');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'dbf',
          fileSize: fileSize,
          recordCount: 0,
        };
      }

      // ตรวจสอบ signature ของไฟล์ DBF
      const signature = buffer[0];
      if (signature && signature !== 0x03 && signature !== 0x83 && signature !== 0x8B && signature !== 0x30) {
        errors.push(`ไฟล์ DBF ไม่ถูกต้อง (signature: 0x${signature.toString(16)})`);
      }

      // อ่าน header information
      const recordCount = buffer.readUInt32LE(4);
      const headerLength = buffer.readUInt16LE(8);
      const recordLength = buffer.readUInt16LE(10);

      // ตรวจสอบความสมเหตุสมผลของข้อมูล
      if (recordCount < 0) {
        errors.push('จำนวน record ไม่ถูกต้อง');
      }

      if (headerLength < 32 || headerLength > buffer.length) {
        errors.push('ความยาว header ไม่ถูกต้อง');
      }

      if (recordLength <= 0) {
        errors.push('ความยาว record ไม่ถูกต้อง');
      }

      // ตรวจสอบ field definitions
      const fieldCount = (headerLength - 33) / 32;
      if (fieldCount <= 0 || fieldCount > 255) {
        errors.push('จำนวน field ไม่ถูกต้อง');
      }

      // ตรวจสอบ field definitions
      const fields: any[] = [];
      for (let i = 0; i < fieldCount; i++) {
        const fieldStart = 32 + (i * 32);
        if (fieldStart + 32 > buffer.length) {
          errors.push(`Field ${i + 1} ไม่สมบูรณ์`);
          break;
        }

        const fieldName = buffer.slice(fieldStart, fieldStart + 11).toString('ascii').replace(/\0/g, '');
        const fieldType = String.fromCharCode(buffer[fieldStart + 11] || 0);
        const fieldLength = buffer[fieldStart + 16] || 0;
        const fieldDecimal = buffer[fieldStart + 17] || 0;

        // ตรวจสอบ field name
        if (!fieldName || fieldName.length === 0) {
          errors.push(`Field ${i + 1} ไม่มีชื่อ`);
        }

        // ตรวจสอบ field type
        const validTypes = ['C', 'N', 'L', 'D', 'M', 'F', 'B', 'G', 'P', 'Y', 'T', 'I', 'V', 'X', 'O', '+', '@'];
        if (!validTypes.includes(fieldType)) {
          errors.push(`Field ${fieldName} มี type ไม่ถูกต้อง: ${fieldType}`);
        }

        // ตรวจสอบ field length
        if (fieldLength <= 0 || fieldLength > 255) {
          errors.push(`Field ${fieldName} มีความยาวไม่ถูกต้อง: ${fieldLength}`);
        }

        fields.push({
          name: fieldName,
          type: fieldType,
          length: fieldLength,
          decimalPlaces: fieldDecimal
        });
      }

      // ตรวจสอบว่าเป็นไฟล์ประเภทไหน
      let fileType = 'unknown';
      if (filename.toLowerCase().includes('adp')) {
        fileType = 'ADP';
      } else if (filename.toLowerCase().includes('opd')) {
        fileType = 'OPD';
      } else if (filename.toLowerCase().includes('cht')) {
        fileType = 'CHT';
      } else if (filename.toLowerCase().includes('cha')) {
        fileType = 'CHA';
      } else if (filename.toLowerCase().includes('ins')) {
        fileType = 'INS';
      } else if (filename.toLowerCase().includes('dru')) {
        fileType = 'DRU';
      } else if (filename.toLowerCase().includes('odx')) {
        fileType = 'ODX';
      }

      // ตรวจสอบ schema ของไฟล์
      if (fields.length > 0) {
        try {
          // ใช้ parseDBFWithSchema function
          parseDBFWithSchema(buffer);
          
          // ตรวจสอบ required fields ตามประเภทไฟล์
          if (fileType === 'ADP') {
            const requiredFields = ['HN', 'DATE_SERV', 'DIAG'];
            for (const field of requiredFields) {
              if (!fields.find(f => f.name === field)) {
                errors.push(`ไฟล์ ADP ต้องมี field: ${field}`);
              }
            }
          } else if (fileType === 'OPD') {
            const requiredFields = ['HN', 'DATE_SERV', 'DIAG'];
            for (const field of requiredFields) {
              if (!fields.find(f => f.name === field)) {
                errors.push(`ไฟล์ OPD ต้องมี field: ${field}`);
              }
            }
          }
        } catch (parseError) {
          errors.push(`ไม่สามารถ parse schema ของไฟล์ได้: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }

      // บันทึก log
      logFileValidation(filename, errors.length === 0, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileType: 'dbf',
        fileSize: fileSize,
        recordCount: recordCount,
        fields: fields
      };

    } catch (error) {
      const errorMessage = `เกิดข้อผิดพลาดในการตรวจสอบไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      
      logError('DBF Validation Error', new Error(errorMessage));

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
   * ตรวจสอบไฟล์ REP
   */
  async validateREP(filePath: string, filename: string): Promise<REPValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // ตรวจสอบขนาดไฟล์
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      if (fileSize === 0) {
        errors.push('ไฟล์ REP ว่างเปล่า');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'rep',
          fileSize: 0,
          sheetCount: 0,
        };
      }

      // ตรวจสอบว่าเป็นไฟล์ Excel
      const fileExtension = path.extname(filename).toLowerCase();
      if (fileExtension !== '.xls' && fileExtension !== '.xlsx') {
        errors.push('ไฟล์ REP ต้องเป็นไฟล์ Excel (.xls หรือ .xlsx)');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'rep',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }

      // อ่านไฟล์ Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const sheetCount = workbook.worksheets.length;
      
      if (sheetCount === 0) {
        errors.push('ไฟล์ REP ไม่มี worksheet');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'rep',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }

      // ตรวจสอบ worksheet แรก
      const firstSheet = workbook.worksheets[0];
      if (!firstSheet) {
        errors.push('ไม่พบ worksheet แรกในไฟล์ REP');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'rep',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }
      const rowCount = firstSheet.rowCount;
      const columnCount = firstSheet.columnCount;
      
      if (rowCount === 0) {
        errors.push('ไฟล์ REP ไม่มีข้อมูล');
      }

      if (columnCount === 0) {
        errors.push('ไฟล์ REP ไม่มีคอลัมน์');
      }

      // ตรวจสอบ header row
      const headerRow = firstSheet.getRow(1);
      const headerValues = headerRow.values as any[];
      
      if (!headerValues || headerValues.length === 0) {
        errors.push('ไฟล์ REP ไม่มี header row');
      }

      // ตรวจสอบ required columns สำหรับ REP
      const requiredColumns = ['HN', 'DATE_SERV', 'DIAG', 'TOTAL'];
      const headerTexts = headerValues.map(v => String(v).toUpperCase());
      
      for (const requiredCol of requiredColumns) {
        if (!headerTexts.includes(requiredCol)) {
          errors.push(`ไฟล์ REP ต้องมีคอลัมน์: ${requiredCol}`);
        }
      }

      // ตรวจสอบข้อมูลในแต่ละ row
      let validRowCount = 0;
      for (let rowNum = 2; rowNum <= Math.min(rowCount, 100); rowNum++) { // ตรวจสอบแค่ 100 rows แรก
        const row = firstSheet.getRow(rowNum);
        const values = row.values as any[];
        
        if (values && values.length > 0) {
          // ตรวจสอบว่า row ไม่ว่างเปล่า
          const hasData = values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (hasData) {
            validRowCount++;
          }
        }
      }

      if (validRowCount === 0) {
        errors.push('ไฟล์ REP ไม่มีข้อมูลที่ถูกต้อง');
      }

      // บันทึก log
      logFileValidation(filename, errors.length === 0, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileType: 'rep',
        fileSize: fileSize,
        sheetCount: sheetCount
      };

    } catch (error) {
      const errorMessage = `เกิดข้อผิดพลาดในการตรวจสอบไฟล์ REP: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      
      logError('REP Validation Error', new Error(errorMessage));

      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'rep',
        fileSize: 0,
        sheetCount: 0,
      };
    }
  }

  /**
   * ตรวจสอบไฟล์ Statement
   */
  async validateStatement(filePath: string, filename: string): Promise<StatementValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // ตรวจสอบขนาดไฟล์
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      if (fileSize === 0) {
        errors.push('ไฟล์ Statement ว่างเปล่า');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'statement',
          fileSize: 0,
          sheetCount: 0,
        };
      }

      // ตรวจสอบว่าเป็นไฟล์ Excel
      const fileExtension = path.extname(filename).toLowerCase();
      if (fileExtension !== '.xls' && fileExtension !== '.xlsx') {
        errors.push('ไฟล์ Statement ต้องเป็นไฟล์ Excel (.xls หรือ .xlsx)');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'statement',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }

      // อ่านไฟล์ Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const sheetCount = workbook.worksheets.length;
      
      if (sheetCount === 0) {
        errors.push('ไฟล์ Statement ไม่มี worksheet');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'statement',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }

      // ตรวจสอบ worksheet แรก
      const firstSheet = workbook.worksheets[0];
      if (!firstSheet) {
        errors.push('ไม่พบ worksheet แรกในไฟล์ Statement');
        return {
          isValid: false,
          errors,
          warnings,
          fileType: 'statement',
          fileSize: fileSize,
          sheetCount: 0,
        };
      }
      const rowCount = firstSheet.rowCount;
      const columnCount = firstSheet.columnCount;
      
      if (rowCount === 0) {
        errors.push('ไฟล์ Statement ไม่มีข้อมูล');
      }

      if (columnCount === 0) {
        errors.push('ไฟล์ Statement ไม่มีคอลัมน์');
      }

      // ตรวจสอบ header row
      const headerRow = firstSheet.getRow(1);
      const headerValues = headerRow.values as any[];
      
      if (!headerValues || headerValues.length === 0) {
        errors.push('ไฟล์ Statement ไม่มี header row');
      }

      // ตรวจสอบ required columns สำหรับ Statement
      const requiredColumns = ['HN', 'DATE_SERV', 'TOTAL', 'STATUS'];
      const headerTexts = headerValues.map(v => String(v).toUpperCase());
      
      for (const requiredCol of requiredColumns) {
        if (!headerTexts.includes(requiredCol)) {
          errors.push(`ไฟล์ Statement ต้องมีคอลัมน์: ${requiredCol}`);
        }
      }

      // ตรวจสอบข้อมูลในแต่ละ row
      let validRowCount = 0;
      for (let rowNum = 2; rowNum <= Math.min(rowCount, 100); rowNum++) { // ตรวจสอบแค่ 100 rows แรก
        const row = firstSheet.getRow(rowNum);
        const values = row.values as any[];
        
        if (values && values.length > 0) {
          // ตรวจสอบว่า row ไม่ว่างเปล่า
          const hasData = values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (hasData) {
            validRowCount++;
          }
        }
      }

      if (validRowCount === 0) {
        errors.push('ไฟล์ Statement ไม่มีข้อมูลที่ถูกต้อง');
      }

      // บันทึก log
      logFileValidation(filename, errors.length === 0, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileType: 'statement',
        fileSize: fileSize,
        sheetCount: sheetCount
      };

    } catch (error) {
      const errorMessage = `เกิดข้อผิดพลาดในการตรวจสอบไฟล์ Statement: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      
      logError('Statement Validation Error', new Error(errorMessage));

      return {
        isValid: false,
        errors,
        warnings,
        fileType: 'statement',
        fileSize: 0,
        sheetCount: 0,
      };
    }
  }

  /**
   * อัปเดตจำนวนไฟล์ที่สำเร็จใน batch
   */
  async updateBatchSuccessFiles(batchId: string): Promise<void> {
    try {
      // ใช้ method ที่มีอยู่จริงใน DatabaseService
      const records = await this.databaseService.getUploadRecords({
        batchId: batchId,
        status: 'COMPLETED' as any
      });

      const successCount = records.records.length;

      await this.databaseService.updateUploadBatch(batchId, {
        successFiles: successCount
      });

      logInfo('Batch Success Files Updated', {
        batchId,
        successCount
      });
    } catch (error) {
      logError('Failed to update batch success files', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }


}

export default ValidationService; 