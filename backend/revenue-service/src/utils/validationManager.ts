// ========================================
// VALIDATION MANAGER - รวม validation functions ที่ซ้ำซ้อน
// ========================================

import { ValidationResult, FileValidationResult } from '@/types';

// ========================================
// VALIDATION MANAGER CLASS
// ========================================

export class ValidationManager {
  /**
   * ตรวจสอบขนาดไฟล์
   */
  static validateFileSize(fileSize: number, maxSize: number): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (fileSize <= 0) {
      errors.push('ไฟล์มีขนาดเป็น 0 หรือไม่ถูกต้อง');
    } else if (fileSize > maxSize) {
      errors.push(`ไฟล์มีขนาดใหญ่เกินไป (${this.formatFileSize(fileSize)} > ${this.formatFileSize(maxSize)})`);
    } else if (fileSize > maxSize * 0.8) {
      warnings.push(`ไฟล์มีขนาดใหญ่ (${this.formatFileSize(fileSize)}) อาจใช้เวลาประมวลผลนาน`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileSize,
      fileType: 'dbf' // Default file type
    };
  }

  /**
   * ตรวจสอบ DBF Record
   */
  static validateDBFRecord(record: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบ HN
    if (record.HN) {
      const cleanedHN = this.cleanHN(record.HN);
      if (!this.isValidHN(cleanedHN)) {
        errors.push(`HN ไม่ถูกต้อง: ${record.HN}`);
      }
    } else {
      warnings.push('ไม่มี HN');
    }

    // ตรวจสอบ AN (ถ้ามี)
    if (record.AN) {
      const cleanedAN = this.cleanAN(record.AN);
      if (!this.isValidAN(cleanedAN)) {
        errors.push(`AN ไม่ถูกต้อง: ${record.AN}`);
      }
    }

    // ตรวจสอบ DATE_SERV
    if (record.DATE_SERV) {
      const date = this.cleanDate(record.DATE_SERV);
      if (!date || !this.isValidDate(date)) {
        errors.push(`DATE_SERV ไม่ถูกต้อง: ${record.DATE_SERV}`);
      }
    } else {
      warnings.push('ไม่มี DATE_SERV');
    }

    // ตรวจสอบ DIAG
    if (!record.DIAG || !this.isValidString(record.DIAG)) {
      warnings.push('ไม่มี DIAG หรือ DIAG ว่างเปล่า');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(error => ({ field: '', message: error, code: 'VALIDATION_ERROR' })),
      warnings
    };
  }

  /**
   * ตรวจสอบ REP Record
   */
  static validateREPRecord(record: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบ HN
    if (record.HN) {
      const cleanedHN = this.cleanHN(record.HN);
      if (!this.isValidHN(cleanedHN)) {
        errors.push(`HN ไม่ถูกต้อง: ${record.HN}`);
      }
    } else {
      warnings.push('ไม่มี HN');
    }

    // ตรวจสอบ DATE_SERV
    if (record.DATE_SERV) {
      const date = this.cleanDate(record.DATE_SERV);
      if (!date || !this.isValidDate(date)) {
        errors.push(`DATE_SERV ไม่ถูกต้อง: ${record.DATE_SERV}`);
      }
    } else {
      warnings.push('ไม่มี DATE_SERV');
    }

    // ตรวจสอบ TOTAL
    if (record.TOTAL) {
      const total = this.cleanNumber(record.TOTAL);
      if (!total || !this.isValidNumber(total)) {
        errors.push(`TOTAL ไม่ถูกต้อง: ${record.TOTAL}`);
      }
    } else {
      warnings.push('ไม่มี TOTAL');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(error => ({ field: '', message: error, code: 'VALIDATION_ERROR' })),
      warnings
    };
  }

  /**
   * ตรวจสอบ Statement Record
   */
  static validateStatementRecord(record: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบ HN
    if (record.HN) {
      const cleanedHN = this.cleanHN(record.HN);
      if (!this.isValidHN(cleanedHN)) {
        errors.push(`HN ไม่ถูกต้อง: ${record.HN}`);
      }
    } else {
      warnings.push('ไม่มี HN');
    }

    // ตรวจสอบ DATE_SERV
    if (record.DATE_SERV) {
      const date = this.cleanDate(record.DATE_SERV);
      if (!date || !this.isValidDate(date)) {
        errors.push(`DATE_SERV ไม่ถูกต้อง: ${record.DATE_SERV}`);
      }
    } else {
      warnings.push('ไม่มี DATE_SERV');
    }

    // ตรวจสอบ TOTAL
    if (record.TOTAL) {
      const total = this.cleanNumber(record.TOTAL);
      if (!total || !this.isValidNumber(total)) {
        errors.push(`TOTAL ไม่ถูกต้อง: ${record.TOTAL}`);
      }
    } else {
      warnings.push('ไม่มี TOTAL');
    }

    // ตรวจสอบ STATUS
    if (!record.STATUS || !this.isValidString(record.STATUS)) {
      warnings.push('ไม่มี STATUS หรือ STATUS ว่างเปล่า');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(error => ({ field: '', message: error, code: 'VALIDATION_ERROR' })),
      warnings
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * ตรวจสอบว่าเป็น string ที่ไม่ว่าง
   */
  static isValidString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * ตรวจสอบว่าเป็น number ที่ถูกต้อง
   */
  static isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * ตรวจสอบว่าเป็น date ที่ถูกต้อง
   */
  static isValidDate(value: any): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  }

  /**
   * ตรวจสอบ HN (Hospital Number) format
   */
  private static isValidHN(hn: string): boolean {
    const cleanedHN = this.cleanHN(hn);
    const hnRegex = /^[0-9]{8,10}$/;
    return hnRegex.test(cleanedHN);
  }

  /**
   * ตรวจสอบ AN (Admission Number) format
   */
  private static isValidAN(an: string): boolean {
    const cleanedAN = this.cleanAN(an);
    const anRegex = /^[0-9]{8,10}$/;
    return anRegex.test(cleanedAN);
  }

  /**
   * ทำความสะอาด HN
   */
  static cleanHN(value: any): string {
    const cleaned = this.cleanString(value);
    return cleaned.replace(/[^0-9]/g, '');
  }

  /**
   * ทำความสะอาด AN
   */
  static cleanAN(value: any): string {
    const cleaned = this.cleanString(value);
    return cleaned.replace(/[^0-9]/g, '');
  }

  /**
   * ทำความสะอาด string
   */
  static cleanString(value: any): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return '';
  }

  /**
   * ทำความสะอาด date
   */
  static cleanDate(value: any): Date | null {
    const cleaned = this.cleanString(value);
    if (cleaned === '') {
      return null;
    }
    return this.parseDate(cleaned);
  }

  /**
   * แปลง string เป็น date
   */
  static parseDate(value: any): Date | null {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  /**
   * ทำความสะอาด number
   */
  static cleanNumber(value: any): number | null {
    const cleaned = this.cleanString(value);
    if (cleaned === '') {
      return null;
    }
    return this.parseNumber(cleaned);
  }

  /**
   * แปลง string เป็น number
   */
  static parseNumber(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * แปลงขนาดไฟล์เป็น string ที่อ่านง่าย
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ========================================
// EXPORT FUNCTIONS FOR BACKWARD COMPATIBILITY
// ========================================

export const validateFileSize = ValidationManager.validateFileSize;
export const validateDBFRecord = ValidationManager.validateDBFRecord;
export const validateREPRecord = ValidationManager.validateREPRecord;
export const validateStatementRecord = ValidationManager.validateStatementRecord;

// Export helper functions
export const isValidString = ValidationManager.isValidString;
export const isValidNumber = ValidationManager.isValidNumber;
export const isValidDate = ValidationManager.isValidDate;
export const parseNumber = ValidationManager.parseNumber;
export const parseDate = ValidationManager.parseDate;
export const cleanString = ValidationManager.cleanString;
export const cleanNumber = ValidationManager.cleanNumber;
export const cleanDate = ValidationManager.cleanDate;
export const cleanHN = ValidationManager.cleanHN;
export const cleanAN = ValidationManager.cleanAN;

export default ValidationManager;
