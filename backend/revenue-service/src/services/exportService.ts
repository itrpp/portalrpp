import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as iconv from 'iconv-lite';
import { DBFRecord, DBFField, ExportResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ExportService {
  /**
     * ส่งออกข้อมูลเป็นไฟล์ CSV
     */
  public static async exportToCSV(
    records: DBFRecord[],
    filename: string,
    outputDir: string = 'exports',
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // สร้างชื่อไฟล์
      const timestamp = Date.now();
      const baseName = filename.replace(/\.dbf$/i, '');
      const csvFilename = `${timestamp}_${baseName}_processed.csv`;
      const filePath = join(outputDir, csvFilename);

      // สร้าง header จากฟิลด์แรก
      const headers = records.length > 0 && records[0] ? Object.keys(records[0]) : [];
      const csvHeader = headers.join(',');

      // สร้างข้อมูล CSV
      const csvLines = [csvHeader];
      for (const record of records) {
        const values = headers.map(header => {
          const value = record[header] || '';
          // Escape ค่าและใส่ใน quotes ถ้าจำเป็น
          const escapedValue = String(value).replace(/"/g, '""');
          return `"${escapedValue}"`;
        });
        csvLines.push(values.join(','));
      }

      const csvContent = csvLines.join('\n');

      // บันทึกไฟล์
      await writeFile(filePath, csvContent, 'utf8');

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      logger.info(`CSV exported: ${filePath} (${records.length} records)`);

      return {
        success: true,
        filename: csvFilename,
        filePath: filePath,
        recordCount: records.length,
        processingTime: processingTime.toFixed(2),
        format: 'CSV',
        message: 'CSV exported successfully',
      };

    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      return {
        success: false,
        filename: '',
        filePath: '',
        recordCount: 0,
        processingTime: '0.00',
        format: 'CSV',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
     * ส่งออกข้อมูลเป็นไฟล์ JSON
     */
  public static async exportToJSON(
    records: DBFRecord[],
    filename: string,
    outputDir: string = 'exports',
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // สร้างชื่อไฟล์
      const timestamp = Date.now();
      const baseName = filename.replace(/\.dbf$/i, '');
      const jsonFilename = `${timestamp}_${baseName}_processed.json`;
      const filePath = join(outputDir, jsonFilename);

      // สร้างข้อมูล JSON
      const jsonData = {
        metadata: {
          filename: filename,
          recordCount: records.length,
          exportTime: new Date().toISOString(),
          format: 'JSON',
        },
        records: records,
      };

      const jsonContent = JSON.stringify(jsonData, null, 2);

      // บันทึกไฟล์
      await writeFile(filePath, jsonContent, 'utf8');

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      logger.info(`JSON exported: ${filePath} (${records.length} records)`);

      return {
        success: true,
        filename: jsonFilename,
        filePath: filePath,
        recordCount: records.length,
        processingTime: processingTime.toFixed(2),
        format: 'JSON',
        message: 'JSON exported successfully',
      };

    } catch (error) {
      logger.error('Error exporting to JSON:', error);
      return {
        success: false,
        filename: '',
        filePath: '',
        recordCount: 0,
        processingTime: '0.00',
        format: 'JSON',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
     * ส่งออกข้อมูลเป็นไฟล์ DBF ใหม่
     */
  public static async exportToDBF(
    records: DBFRecord[],
    fields: DBFField[],
    filename: string,
    outputDir: string = 'exports',
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // สร้างชื่อไฟล์
      const timestamp = Date.now();
      const baseName = filename.replace(/\.dbf$/i, '');
      const dbfFilename = `${timestamp}_${baseName}_processed.dbf`;
      const filePath = join(outputDir, dbfFilename);

      // สร้างไฟล์ DBF
      const dbfBuffer = this.createDBFBuffer(records, fields);

      // บันทึกไฟล์
      await writeFile(filePath, dbfBuffer);

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      logger.info(`DBF exported: ${filePath} (${records.length} records)`);

      return {
        success: true,
        filename: dbfFilename,
        filePath: filePath,
        recordCount: records.length,
        processingTime: processingTime.toFixed(2),
        format: 'DBF',
        message: 'DBF exported successfully',
      };

    } catch (error) {
      logger.error('Error exporting to DBF:', error);
      return {
        success: false,
        filename: '',
        filePath: '',
        recordCount: 0,
        processingTime: '0.00',
        format: 'DBF',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
     * สร้าง buffer สำหรับไฟล์ DBF
     */
  private static createDBFBuffer(records: DBFRecord[], fields: DBFField[]): Buffer {
    // คำนวณขนาดไฟล์
    const headerLength = 32 + (fields.length * 32) + 1;
    const recordLength = fields.reduce((sum, field) => sum + field.length, 1);
    const totalLength = headerLength + (records.length * recordLength) + 1; // +1 สำหรับ end marker

    const buffer = Buffer.alloc(totalLength);

    // สร้าง header
    let offset = 0;

    // File header (32 bytes)
    buffer[0] = 0x03; // Version
    buffer[1] = new Date().getFullYear() - 1900; // Year
    buffer[2] = new Date().getMonth() + 1; // Month
    buffer[3] = new Date().getDate(); // Day
    buffer.writeUInt32LE(records.length, 4); // Record count
    buffer.writeUInt16LE(headerLength, 8); // Header length
    buffer.writeUInt16LE(recordLength, 10); // Record length

    offset = 32;

    // Field descriptors
    for (const field of fields) {
      // Field name (11 bytes)
      const fieldName = field.name.padEnd(11, '\0');
      buffer.write(fieldName, offset, 11, 'ascii');
      offset += 11;

      // Field type (1 byte)
      buffer[offset] = field.type.charCodeAt(0);
      offset += 1;

      // Reserved (4 bytes)
      offset += 4;

      // Field length (1 byte)
      buffer[offset] = field.length;
      offset += 1;

      // Decimal places (1 byte)
      buffer[offset] = field.decimalPlaces;
      offset += 1;

      // Reserved (14 bytes)
      offset += 14;
    }

    // Field terminator
    buffer[offset] = 0x0D;
    offset += 1;

    // Records
    for (const record of records) {
      // Deletion flag
      buffer[offset] = 0x20; // Space (not deleted)
      offset += 1;

      // Record data
      for (const field of fields) {
        const value = record[field.name] || '';
        let fieldData: string;

        if (field.type === 'N' || field.type === 'F') {
          // Numeric fields - right align with spaces
          fieldData = String(value).padStart(field.length, ' ');
        } else if (field.type === 'D') {
          // Date fields - YYYYMMDD format
          fieldData = this.formatDateForDBF(value).padEnd(field.length, ' ');
        } else {
          // Character fields - left align with spaces
          fieldData = String(value).padEnd(field.length, ' ');
        }

        // ใช้ iconv สำหรับแปลง encoding เป็น TIS-620
        const encodedData = iconv.encode(fieldData, 'tis-620');
        encodedData.copy(buffer, offset, 0, Math.min(encodedData.length, field.length));
        offset += field.length;
      }
    }

    // End of file marker
    buffer[offset] = 0x1A;

    return buffer;
  }

  /**
     * จัดรูปแบบวันที่สำหรับไฟล์ DBF
     */
  private static formatDateForDBF(dateValue: any): string {
    if (!dateValue || dateValue === '00000000' || dateValue === '') {
      return '00000000';
    }

    try {
      let date: Date;

      // ถ้าเป็น string ที่มีรูปแบบ YYYY-MM-DD
      if (typeof dateValue === 'string' && dateValue.includes('-')) {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'string' && dateValue.length === 8) {
        // ถ้าเป็น string ที่มีรูปแบบ YYYYMMDD
        const year = parseInt(dateValue.substring(0, 4));
        const month = parseInt(dateValue.substring(4, 6)) - 1;
        const day = parseInt(dateValue.substring(6, 8));
        date = new Date(year, month, day);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return '00000000';
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}${month}${day}`;
    } catch (error) {
      logger.warn(`Error formatting date for DBF: ${dateValue}`, error);
      return '00000000';
    }
  }

  /**
     * ส่งออกข้อมูลหลายรูปแบบพร้อมกัน
     */
  public static async exportMultipleFormats(
    records: DBFRecord[],
    fields: DBFField[],
    filename: string,
    formats: string[] = ['CSV', 'JSON', 'DBF'],
    outputDir: string = 'exports',
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const format of formats) {
      let result: ExportResult;

      switch (format.toUpperCase()) {
        case 'CSV':
          result = await this.exportToCSV(records, filename, outputDir);
          break;
        case 'JSON':
          result = await this.exportToJSON(records, filename, outputDir);
          break;
        case 'DBF':
          result = await this.exportToDBF(records, fields, filename, outputDir);
          break;
        default:
          result = {
            success: false,
            filename: '',
            filePath: '',
            recordCount: 0,
            processingTime: '0.00',
            format: format,
            error: `Unsupported format: ${format}`,
          };
      }

      results.push(result);
    }

    return results;
  }

  /**
     * สร้างรายงานสรุปการส่งออก
     */
  public static createExportSummary(results: ExportResult[]): {
    totalFiles: number;
    successfulExports: number;
    failedExports: number;
    totalRecords: number;
    formats: string[];
    errors: string[];
  } {
    const summary = {
      totalFiles: results.length,
      successfulExports: 0,
      failedExports: 0,
      totalRecords: 0,
      formats: [] as string[],
      errors: [] as string[],
    };

    for (const result of results) {
      if (result.success) {
        summary.successfulExports++;
        summary.totalRecords += result.recordCount;
        summary.formats.push(result.format);
      } else {
        summary.failedExports++;
        if (result.error) {
          summary.errors.push(`${result.format}: ${result.error}`);
        }
      }
    }

    return summary;
  }
} 
