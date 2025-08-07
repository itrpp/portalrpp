// ========================================
// REVENUE SERVICE VALIDATION SERVICE
// ========================================

import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as path from 'path';
import { ValidationError, ValidationResult, FileValidationRule, BatchValidationResult, ProcessingError } from '@/types';
import { FileValidationError } from '@/utils/errorHandler';
import { logError, logInfo } from '@/utils/logger';

export interface IValidationService {
  validateFile(file: Express.Multer.File): Promise<ValidationResult>;
  validateBatch(batchId: string, files: Express.Multer.File[]): Promise<BatchValidationResult>;
  validateField(value: any, rule: FileValidationRule): ValidationResult;
  validateRequired(value: any, fieldName: string): ValidationError[];
  validateType(value: any, expectedType: string, fieldName: string): ValidationError[];
  validateLength(value: string, minLength?: number, maxLength?: number, fieldName?: string): ValidationError[];
  validateRange(value: number, minValue?: number, maxValue?: number, fieldName?: string): ValidationError[];
  validatePattern(value: string, pattern: string, fieldName?: string): ValidationError[];
  validateCustom(value: any, validator: (value: any) => boolean, fieldName?: string): ValidationError[];
  validateChecksum(filePath: string, expectedChecksum?: string): Promise<ValidationResult>;
  validateFileIntegrity(filePath: string): Promise<ValidationResult>;
  validateFileSecurity(file: Express.Multer.File): Promise<ValidationResult>;
  generateChecksum(filePath: string, algorithm?: string): Promise<string>;
  validateBatchSecurity(batchId: string, files: Express.Multer.File[]): Promise<ValidationResult>;
}

export interface IChecksumValidation {
  algorithm: string;
  expectedChecksum?: string;
  actualChecksum: string;
  isValid: boolean;
}

export interface ISecurityValidation {
  fileSize: number;
  fileType: string;
  fileName: string;
  hasVirus: boolean;
  isMalicious: boolean;
  securityScore: number;
  warnings: string[];
}

export class ValidationService implements IValidationService {
  private rules: Map<string, FileValidationRule[]>;
  private allowedAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];
  private maxFileSize: number = 52428800; // 50MB
  private allowedFileTypes: string[] = ['.dbf', '.xls', '.xlsx'];
  private maliciousPatterns: RegExp[] = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
  ];

  constructor() {
    this.rules = new Map();
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
        type: 'array',
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
        errors.push({
          field: 'filePath',
          message: 'ไม่พบไฟล์ที่ระบุ',
          code: 'FILE_NOT_FOUND',
        });
        return { isValid: false, errors, warnings, fieldResults: {} };
      }

      const actualChecksum = await this.generateChecksum(filePath, 'sha256');
      
      if (expectedChecksum && actualChecksum !== expectedChecksum) {
        errors.push({
          field: 'checksum',
          message: 'Checksum ไม่ตรงกัน',
          code: 'CHECKSUM_MISMATCH',
          value: { expected: expectedChecksum, actual: actualChecksum },
        });
      } else {
        logInfo('Checksum validation passed', { 
          filePath, 
          checksum: actualChecksum 
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          checksum: {
            isValid: errors.length === 0,
            errors: errors.filter(e => e.field === 'checksum'),
            warnings: [],
            actualChecksum,
            expectedChecksum,
          },
        },
      };
    } catch (error) {
      logError('Checksum validation failed', error as Error, { filePath });
      errors.push({
        field: 'checksum',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ checksum',
        code: 'CHECKSUM_ERROR',
      });
      return { isValid: false, errors, warnings, fieldResults: {} };
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
        errors.push({
          field: 'filePath',
          message: 'ไม่พบไฟล์ที่ระบุ',
          code: 'FILE_NOT_FOUND',
        });
        return { isValid: false, errors, warnings, fieldResults: {} };
      }

      const stats = await fs.stat(filePath);
      
      // ตรวจสอบขนาดไฟล์
      if (stats.size === 0) {
        errors.push({
          field: 'fileSize',
          message: 'ไฟล์ว่างเปล่า',
          code: 'EMPTY_FILE',
        });
      }

      // ตรวจสอบสิทธิ์การเข้าถึง
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch (error) {
        errors.push({
          field: 'filePermissions',
          message: 'ไม่มีสิทธิ์ในการอ่านไฟล์',
          code: 'PERMISSION_DENIED',
        });
      }

      // ตรวจสอบนามสกุลไฟล์
      const extension = path.extname(filePath).toLowerCase();
      if (!this.allowedFileTypes.includes(extension)) {
        errors.push({
          field: 'fileExtension',
          message: 'นามสกุลไฟล์ไม่ได้รับอนุญาต',
          code: 'INVALID_EXTENSION',
          value: extension,
        });
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
            fileSize: stats.size,
            fileExtension: extension,
          },
        },
      };
    } catch (error) {
      logError('File integrity validation failed', error as Error, { filePath });
      errors.push({
        field: 'integrity',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบความสมบูรณ์ของไฟล์',
        code: 'INTEGRITY_ERROR',
      });
      return { isValid: false, errors, warnings, fieldResults: {} };
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
        errors.push({
          field: 'filename',
          message: 'ชื่อไฟล์ไม่ปลอดภัย',
          code: 'MALICIOUS_FILENAME',
          value: file.originalname,
        });
      }

      // ตรวจสอบขนาดไฟล์
      if (file.size > this.maxFileSize) {
        errors.push({
          field: 'fileSize',
          message: 'ขนาดไฟล์เกินขีดจำกัด',
          code: 'FILE_TOO_LARGE',
          value: file.size,
        });
      }

      // ตรวจสอบประเภทไฟล์
      const extension = path.extname(file.originalname).toLowerCase();
      if (!this.allowedFileTypes.includes(extension)) {
        errors.push({
          field: 'fileType',
          message: 'ประเภทไฟล์ไม่ได้รับอนุญาต',
          code: 'INVALID_FILE_TYPE',
          value: extension,
        });
      }

      // ตรวจสอบ MIME type
      if (!this.isValidMimeType(file.mimetype)) {
        errors.push({
          field: 'mimetype',
          message: 'MIME type ไม่ถูกต้อง',
          code: 'INVALID_MIME_TYPE',
          value: file.mimetype,
        });
      }

      // ตรวจสอบเนื้อหาไฟล์ (basic check)
      if (file.buffer && file.buffer.length > 0) {
        const contentCheck = this.checkFileContent(file.buffer);
        if (!contentCheck.isValid) {
          errors.push(...contentCheck.errors);
          warnings.push(...contentCheck.warnings);
        }
      }

      const securityScore = this.calculateSecurityScore(errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {
          security: {
            isValid: errors.length === 0,
            errors,
            warnings,
            securityScore,
            fileSize: file.size,
            fileType: extension,
            fileName: file.originalname,
          },
        },
      };
    } catch (error) {
      logError('File security validation failed', error as Error, { filename: file.originalname });
      errors.push({
        field: 'security',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบความปลอดภัย',
        code: 'SECURITY_ERROR',
      });
      return { isValid: false, errors, warnings, fieldResults: {} };
    }
  }

  /**
   * สร้าง checksum ของไฟล์
   */
  async generateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    if (!this.allowedAlgorithms.includes(algorithm)) {
      throw new Error(`Algorithm ไม่ได้รับอนุญาต: ${algorithm}`);
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
        reject(error);
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
        errors.push({
          field: 'batchSize',
          message: 'จำนวนไฟล์ใน batch เกินขีดจำกัด',
          code: 'BATCH_TOO_LARGE',
          value: files.length,
        });
      }

      // ตรวจสอบขนาดรวมของ batch
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxBatchSize = this.maxFileSize * 10; // 500MB
      
      if (totalSize > maxBatchSize) {
        errors.push({
          field: 'batchSize',
          message: 'ขนาดรวมของ batch เกินขีดจำกัด',
          code: 'BATCH_SIZE_TOO_LARGE',
          value: totalSize,
        });
      }

      // ตรวจสอบไฟล์แต่ละไฟล์
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileSecurity = await this.validateFileSecurity(file);
        
        if (!fileSecurity.isValid) {
          errors.push(...fileSecurity.errors.map(error => ({
            ...error,
            field: `file_${i}_${error.field}`,
          })));
        }
        
        warnings.push(...fileSecurity.warnings.map(warning => `File ${i + 1}: ${warning}`));
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
            totalFiles: files.length,
            totalSize,
            batchId,
          },
        },
      };
    } catch (error) {
      logError('Batch security validation failed', error as Error, { batchId });
      errors.push({
        field: 'batchSecurity',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบความปลอดภัยของ batch',
        code: 'BATCH_SECURITY_ERROR',
      });
      return { isValid: false, errors, warnings, fieldResults: {} };
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

  /**
   * คำนวณ security score
   */
  private calculateSecurityScore(errors: ValidationError[], warnings: string[]): number {
    let score = 100;
    
    // ลดคะแนนตาม errors
    score -= errors.length * 20;
    
    // ลดคะแนนตาม warnings
    score -= warnings.length * 5;
    
    return Math.max(0, score);
  }

  async validateFile(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const fieldResults: Record<string, any> = {};

    try {
      // ตรวจสอบไฟล์มีอยู่หรือไม่
      if (!file) {
        errors.push({
          field: 'file',
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          code: 'FILE_MISSING',
        });
        return { isValid: false, errors, warnings, fieldResults };
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

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults,
      };
    } catch (error) {
      logError('File validation failed', error as Error, { filename: file?.originalname });
      errors.push({
        field: 'validation',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
        code: 'VALIDATION_ERROR',
      });
      return { isValid: false, errors, warnings, fieldResults };
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
          type: 'security' as const,
          message: error.message,
          code: error.code,
          details: error.value,
          timestamp: new Date(),
          retryable: false,
        })));
      }

      // ตรวจสอบไฟล์แต่ละไฟล์
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileValidation = await this.validateFile(file);
        
        fileResults[`file_${i}`] = fileValidation;
        
        if (!fileValidation.isValid) {
          errors.push(...fileValidation.errors.map(error => ({
            type: 'validation' as const,
            message: error.message,
            code: error.code,
            details: { filename: file.originalname, field: error.field },
            timestamp: new Date(),
            retryable: false,
          })));
        }
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
      logError('Batch validation failed', error as Error, { batchId });
      errors.push({
        type: 'system',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ batch',
        code: 'BATCH_VALIDATION_ERROR',
        details: { batchId },
        timestamp: new Date(),
        retryable: true,
      });
      
      return {
        batchId,
        isValid: false,
        totalFiles: files.length,
        validFiles: 0,
        invalidFiles: files.length,
        errors,
        fileResults: {},
      };
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

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldResults: {},
      };
    } catch (error) {
      logError('Field validation failed', error as Error, { field: rule.field, value });
      errors.push({
        field: rule.field,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ field',
        code: 'FIELD_VALIDATION_ERROR',
        value,
      });
      return { isValid: false, errors, warnings, fieldResults: {} };
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
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
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

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }
}

export default ValidationService; 