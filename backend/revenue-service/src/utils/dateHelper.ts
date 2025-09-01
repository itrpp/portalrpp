// ========================================
// DATE HELPER UTILITIES
// ========================================

import { DateTime } from 'luxon';

/**
 * รูปแบบ date formats ที่ใช้ในระบบ
 */
export const DATE_FORMATS = {
  FOLDER_DATE: 'yyyyMMdd',          // สำหรับชื่อโฟลเดอร์: 20240115
  ISO_DATE: 'yyyy-MM-dd',           // สำหรับ database: 2024-01-15
  ISO_DATETIME: 'yyyy-MM-dd HH:mm:ss', // สำหรับ database datetime: 2024-01-15 10:30:00
  DISPLAY_DATE: 'dd/MM/yyyy',       // สำหรับแสดงผล: 15/01/2024
  DISPLAY_DATETIME: 'dd/MM/yyyy HH:mm:ss', // สำหรับแสดงผล datetime: 15/01/2024 10:30:00
  LOG_TIMESTAMP: 'yyyy-MM-dd HH:mm:ss.SSS', // สำหรับ logs: 2024-01-15 10:30:00.123
} as const;

/**
 * สร้าง DateTime object จาก input ต่างๆ
 */
export class DateHelper {
  /**
   * สร้าง DateTime ปัจจุบัน
   */
  static now(): DateTime {
    return DateTime.now();
  }

  /**
   * สร้าง DateTime ปัจจุบันในเขตเวลาไทย
   */
  static nowInThailand(): DateTime {
    return DateTime.now().setZone('Asia/Bangkok');
  }

  /**
   * แปลง Date object เป็น DateTime
   */
  static fromDate(date: Date): DateTime {
    return DateTime.fromJSDate(date);
  }

  /**
   * แปลง ISO string เป็น DateTime
   */
  static fromISO(isoString: string): DateTime {
    return DateTime.fromISO(isoString);
  }

  /**
   * แปลง timestamp เป็น DateTime
   */
  static fromTimestamp(timestamp: number): DateTime {
    return DateTime.fromMillis(timestamp);
  }

  /**
   * สร้าง DateTime จาก object
   */
  static fromObject(obj: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }): DateTime {
    return DateTime.fromObject(obj);
  }

  /**
   * ตรวจสอบว่า DateTime valid หรือไม่
   */
  static isValid(dateTime: DateTime): boolean {
    return dateTime.isValid;
  }

  /**
   * แปลง DateTime เป็น Date object
   */
  static toDate(dateTime: DateTime): Date {
    return dateTime.toJSDate();
  }

  /**
   * แปลง DateTime เป็น ISO string
   */
  static toISO(dateTime: DateTime): string {
    return dateTime.toISO() || '';
  }

  /**
   * แปลง DateTime เป็น timestamp
   */
  static toTimestamp(dateTime: DateTime): number {
    return dateTime.toMillis();
  }
}

/**
 * Formatter functions สำหรับการแปลง DateTime เป็น string
 */
export class DateFormatter {
  /**
   * แปลงเป็นรูปแบบสำหรับชื่อโฟลเดอร์ (yyyyMMdd)
   */
  static toFolderFormat(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.FOLDER_DATE);
  }

  /**
   * แปลงเป็นรูปแบบ ISO date (yyyy-MM-dd)
   */
  static toISODate(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.ISO_DATE);
  }

  /**
   * แปลงเป็นรูปแบบ ISO datetime (yyyy-MM-dd HH:mm:ss)
   */
  static toISODateTime(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.ISO_DATETIME);
  }

  /**
   * แปลงเป็นรูปแบบสำหรับแสดงผล (dd/MM/yyyy)
   */
  static toDisplayDate(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.DISPLAY_DATE);
  }

  /**
   * แปลงเป็นรูปแบบสำหรับแสดงผล datetime (dd/MM/yyyy HH:mm:ss)
   */
  static toDisplayDateTime(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.DISPLAY_DATETIME);
  }

  /**
   * แปลงเป็นรูปแบบสำหรับ logs (yyyy-MM-dd HH:mm:ss.SSS)
   */
  static toLogTimestamp(dateTime: DateTime): string {
    return dateTime.toFormat(DATE_FORMATS.LOG_TIMESTAMP);
  }

  /**
   * แปลงเป็นรูปแบบ custom
   */
  static toCustomFormat(dateTime: DateTime, format: string): string {
    return dateTime.toFormat(format);
  }
}

/**
 * Parser functions สำหรับแปลง string เป็น DateTime
 */
export class DateParser {
  /**
   * แปลงจากรูปแบบโฟลเดอร์ (yyyyMMdd) เป็น DateTime
   */
  static fromFolderFormat(dateString: string): DateTime {
    return DateTime.fromFormat(dateString, DATE_FORMATS.FOLDER_DATE);
  }

  /**
   * แปลงจากรูปแบบ ISO date (yyyy-MM-dd) เป็น DateTime
   */
  static fromISODate(dateString: string): DateTime {
    return DateTime.fromFormat(dateString, DATE_FORMATS.ISO_DATE);
  }

  /**
   * แปลงจากรูปแบบ ISO datetime (yyyy-MM-dd HH:mm:ss) เป็น DateTime
   */
  static fromISODateTime(dateString: string): DateTime {
    return DateTime.fromFormat(dateString, DATE_FORMATS.ISO_DATETIME);
  }

  /**
   * แปลงจากรูปแบบแสดงผล (dd/MM/yyyy) เป็น DateTime
   */
  static fromDisplayDate(dateString: string): DateTime {
    return DateTime.fromFormat(dateString, DATE_FORMATS.DISPLAY_DATE);
  }

  /**
   * แปลงจากรูปแบบ custom เป็น DateTime
   */
  static fromCustomFormat(dateString: string, format: string): DateTime {
    return DateTime.fromFormat(dateString, format);
  }
}

/**
 * Utility functions สำหรับการคำนวณและเปรียบเทียบ
 */
export class DateUtils {
  /**
   * เพิ่มวัน
   */
  static addDays(dateTime: DateTime, days: number): DateTime {
    return dateTime.plus({ days });
  }

  /**
   * ลบวัน
   */
  static subtractDays(dateTime: DateTime, days: number): DateTime {
    return dateTime.minus({ days });
  }

  /**
   * เพิ่มชั่วโมง
   */
  static addHours(dateTime: DateTime, hours: number): DateTime {
    return dateTime.plus({ hours });
  }

  /**
   * เพิ่มนาที
   */
  static addMinutes(dateTime: DateTime, minutes: number): DateTime {
    return dateTime.plus({ minutes });
  }

  /**
   * เพิ่มวินาที
   */
  static addSeconds(dateTime: DateTime, seconds: number): DateTime {
    return dateTime.plus({ seconds });
  }

  /**
   * เพิ่มมิลลิวินาที
   */
  static addMilliseconds(dateTime: DateTime, milliseconds: number): DateTime {
    return dateTime.plus({ milliseconds });
  }

  /**
   * คำนวณความแตกต่างระหว่างวันที่ (เป็นวัน)
   */
  static diffInDays(dateTime1: DateTime, dateTime2: DateTime): number {
    return dateTime1.diff(dateTime2, 'days').days;
  }

  /**
   * คำนวณความแตกต่างระหว่างวันที่ (เป็นชั่วโมง)
   */
  static diffInHours(dateTime1: DateTime, dateTime2: DateTime): number {
    return dateTime1.diff(dateTime2, 'hours').hours;
  }

  /**
   * คำนวณความแตกต่างระหว่างวันที่ (เป็นมิลลิวินาที)
   */
  static diffInMilliseconds(dateTime1: DateTime, dateTime2: DateTime): number {
    return dateTime1.diff(dateTime2, 'milliseconds').milliseconds;
  }

  /**
   * ตรวจสอบว่าวันที่เป็นวันเดียวกันหรือไม่
   */
  static isSameDay(dateTime1: DateTime, dateTime2: DateTime): boolean {
    return dateTime1.hasSame(dateTime2, 'day');
  }

  /**
   * ตรวจสอบว่าวันที่อยู่ในช่วงหรือไม่
   */
  static isInRange(dateTime: DateTime, start: DateTime, end: DateTime): boolean {
    return dateTime >= start && dateTime <= end;
  }

  /**
   * ตรวจสอบว่าวันที่เป็นอดีตหรือไม่
   */
  static isPast(dateTime: DateTime): boolean {
    return dateTime < DateTime.now();
  }

  /**
   * ตรวจสอบว่าวันที่เป็นอนาคตหรือไม่
   */
  static isFuture(dateTime: DateTime): boolean {
    return dateTime > DateTime.now();
  }

  /**
   * ได้วันแรกของเดือน
   */
  static startOfMonth(dateTime: DateTime): DateTime {
    return dateTime.startOf('month');
  }

  /**
   * ได้วันสุดท้ายของเดือน
   */
  static endOfMonth(dateTime: DateTime): DateTime {
    return dateTime.endOf('month');
  }

  /**
   * ได้วันแรกของปี
   */
  static startOfYear(dateTime: DateTime): DateTime {
    return dateTime.startOf('year');
  }

  /**
   * ได้วันสุดท้ายของปี
   */
  static endOfYear(dateTime: DateTime): DateTime {
    return dateTime.endOf('year');
  }

  /**
   * ได้จุดเริ่มต้นของวัน (00:00:00)
   */
  static startOfDay(dateTime: DateTime): DateTime {
    return dateTime.startOf('day');
  }

  /**
   * ได้จุดสิ้นสุดของวัน (23:59:59.999)
   */
  static endOfDay(dateTime: DateTime): DateTime {
    return dateTime.endOf('day');
  }
}

/**
 * Constants สำหรับการใช้งานทั่วไป
 */
export const DATE_CONSTANTS = {
  TIMEZONE: {
    THAILAND: 'Asia/Bangkok',
    UTC: 'UTC',
  },
  LOCALE: {
    THAI: 'th-TH',
    ENGLISH: 'en-US',
  },
} as const;

/**
 * Helper functions สำหรับการใช้งานเฉพาะ
 */

/**
 * สร้างชื่อโฟลเดอร์จากวันที่ปัจจุบัน
 */
export function getCurrentDateFolder(): string {
  return DateFormatter.toFolderFormat(DateHelper.now());
}

/**
 * สร้าง timestamp สำหรับ logs
 */
export function getLogTimestamp(): string {
  return DateFormatter.toLogTimestamp(DateHelper.now());
}

/**
 * แปลง Date เป็น DateTime อย่างปลอดภัย
 */
export function safeFromDate(date: Date | null | undefined): DateTime | null {
  if (!date) return null;
  const dateTime = DateHelper.fromDate(date);
  return DateHelper.isValid(dateTime) ? dateTime : null;
}

/**
 * แปลง DateTime เป็น Date อย่างปลอดภัย
 */
export function safeToDate(dateTime: DateTime | null | undefined): Date | null {
  if (!dateTime || !DateHelper.isValid(dateTime)) return null;
  return DateHelper.toDate(dateTime);
}

/**
 * สร้าง performance timer
 */
export function createTimer(): {
  start: DateTime;
  elapsed: () => number;
  elapsedMs: () => number;
} {
  const start = DateHelper.now();
  return {
    start,
    elapsed: () => DateUtils.diffInMilliseconds(DateHelper.now(), start),
    elapsedMs: () => DateUtils.diffInMilliseconds(DateHelper.now(), start),
  };
}

// Export ทั้งหมดเป็น default object สำหรับความสะดวก
export default {
  DateHelper,
  DateFormatter,
  DateParser,
  DateUtils,
  DATE_FORMATS,
  DATE_CONSTANTS,
  getCurrentDateFolder,
  getLogTimestamp,
  safeFromDate,
  safeToDate,
  createTimer,
};
