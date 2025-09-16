// ========================================
// DATA UTILITIES
// ========================================

import { logInfo, logError } from './logger';

// ========================================
// INTERFACES
// ========================================

// Interfaces moved to @/types

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * ตรวจสอบว่าเป็น string ที่ไม่ว่าง - Re-export from ValidationManager
 */
export { isValidString, isValidNumber, isValidDate } from './validationManager';

/**
 * ตรวจสอบ email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * ตรวจสอบ phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * ตรวจสอบ HN (Hospital Number) format
 */
export function isValidHN(hn: string): boolean {
  // HN ควรเป็นตัวเลข 8-10 หลัก
  const hnRegex = /^[0-9]{8,10}$/;
  return hnRegex.test(hn);
}

/**
 * ตรวจสอบ AN (Admission Number) format
 */
export function isValidAN(an: string): boolean {
  // AN ควรเป็นตัวเลข 8-10 หลัก
  const anRegex = /^[0-9]{8,10}$/;
  return anRegex.test(an);
}

// ========================================
// DATA TRANSFORMATION UTILITIES
// ========================================

/**
 * แปลง string เป็น number - Re-export from ValidationManager
 */
export { parseNumber, parseDate } from './validationManager';

/**
 * แปลง string เป็น integer
 */
export function parseInteger(value: any): number | null {
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * แปลง date เป็น string format YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

/**
 * แปลง date เป็น string format DD/MM/YYYY
 */
export function formatDateThai(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * แปลง string เป็น boolean
 */
export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}

// ========================================
// DATA CLEANING UTILITIES
// ========================================

/**
 * ล้างข้อมูล string - Re-export from ValidationManager
 */
export { cleanString, cleanNumber, cleanDate, cleanHN, cleanAN } from './validationManager';

// ========================================
// DATA VALIDATION UTILITIES
// ========================================

/**
 * ตรวจสอบข้อมูล DBF record - Re-export from ValidationManager
 */
export { validateDBFRecord } from './validationManager';

/**
 * ตรวจสอบข้อมูล REP record - Re-export from ValidationManager
 */
export { validateREPRecord } from './validationManager';

/**
 * ตรวจสอบข้อมูล Statement record - Re-export from ValidationManager
 */
export { validateStatementRecord } from './validationManager';

// ========================================
// DATA PROCESSING UTILITIES
// ========================================

/**
 * ประมวลผลข้อมูลแบบ batch
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, index) => processor(item, i + index));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    logInfo(`📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
  }
  
  return results;
}

/**
 * แปลงข้อมูลเป็น JSON string ที่ปลอดภัย
 */
export function safeJSONStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    logError('Failed to stringify JSON', error as Error);
    return '{}';
  }
}

/**
 * แปลง JSON string เป็น object ที่ปลอดภัย
 */
export function safeJSONParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError('Failed to parse JSON', error as Error);
    return defaultValue;
  }
}

/**
 * สร้าง unique ID
 */
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * สร้าง batch ID
 */
export function generateBatchId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `BATCH_${timestamp}_${random}`;
}

// Default export removed - use named exports instead
