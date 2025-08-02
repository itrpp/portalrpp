import { Buffer } from 'buffer';
import * as iconv from 'iconv-lite';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { DBFField, DBFHeader, DBFRecord, AuthUser } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ImportService {
  private buffer: Buffer;
  private fields: DBFField[];

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.fields = this.parseFields();
  }

  /**
     * แยกโครงสร้างฟิลด์จากไฟล์ DBF
     */
  private parseFields(): DBFField[] {
    const fields: DBFField[] = [];
    let offset = 32; // Skip file header

    while (this.buffer[offset] !== 0x0D) {
      const fieldName = this.buffer.toString('ascii', offset, offset + 11).replace(/\0/g, '');
      const fieldType = String.fromCharCode(this.buffer[offset + 11] || 0);
      const fieldLength = this.buffer[offset + 16] || 0;
      const decimalPlaces = this.buffer[offset + 17] || 0;

      fields.push({
        name: fieldName,
        type: fieldType,
        length: fieldLength,
        decimalPlaces: decimalPlaces,
      });

      offset += 32;
    }

    return fields;
  }

  /**
     * ดึงข้อมูลฟิลด์
     */
  public getFields(): DBFField[] {
    return this.fields;
  }

  /**
     * แยกข้อมูลเรคอร์ดจากไฟล์ DBF
     */
  public parseRecords(): DBFRecord[] {
    const records: DBFRecord[] = [];
    const headerLength = 32 + (this.fields.length * 32) + 1;
    const recordLength = this.fields.reduce((sum, field) => sum + field.length, 1);
    let offset = headerLength;

    while (offset < this.buffer.length) {
      if (this.buffer[offset] === 0x1A) break; // End of file marker

      const record: DBFRecord = {};
      let fieldOffset = offset + 1; // Skip deletion flag

      for (const field of this.fields) {
        let fieldData: string;

        if (field.type === 'N' || field.type === 'F') {
          // Numeric fields
          fieldData = this.buffer.toString('ascii', fieldOffset, fieldOffset + field.length).trim();
        } else if (field.type === 'D') {
          // Date fields
          fieldData = this.buffer.toString('ascii', fieldOffset, fieldOffset + field.length);
        } else {
          // Character fields - ใช้ iconv สำหรับแปลง encoding
          const rawData = this.buffer.slice(fieldOffset, fieldOffset + field.length);
          fieldData = iconv.decode(rawData, 'tis-620').trim();
        }

        record[field.name] = fieldData;
        fieldOffset += field.length;
      }

      records.push(record);
      offset += recordLength;
    }

    return records;
  }

  /**
     * แปลงวันที่จากรูปแบบ DBF
     */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '' || dateStr === '00000000') {
      return null;
    }

    try {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      return new Date(year, month, day);
    } catch {
      logger.warn(`Invalid date format: ${dateStr}`);
      return null;
    }
  }

  /**
     * ดึงจำนวนเรคอร์ด
     */
  public getRecordCount(): number {
    const records = this.parseRecords();
    return records.length;
  }

  /**
     * ดึงข้อมูล header ของไฟล์ DBF
     */
  public getHeader(): DBFHeader {
    const version = this.buffer[0] || 0;
    const year = (this.buffer[1] || 0) + 1900;
    const month = this.buffer[2] || 0;
    const day = this.buffer[3] || 0;
    const recordCount = this.buffer.readUInt32LE(4);
    const headerLength = this.buffer.readUInt16LE(8);
    const recordLength = this.buffer.readUInt16LE(10);

    return {
      version,
      year,
      month,
      day,
      recordCount,
      headerLength,
      recordLength,
      fields: this.fields,
    };
  }

  /**
     * ตรวจสอบประเภทไฟล์ตามชื่อและฟิลด์
     */
  public static isADPFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('adp') ||
      fields.some(field => field.name.toLowerCase().includes('adp'));
  }

  public static isOPDFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('opd') ||
      fields.some(field => field.name.toLowerCase().includes('opd'));
  }

  public static isCHTFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('cht') ||
      fields.some(field => field.name.toLowerCase().includes('cht'));
  }

  public static isCHAFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('cha') ||
      fields.some(field => field.name.toLowerCase().includes('cha'));
  }

  public static isINSFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('ins') ||
      fields.some(field => field.name.toLowerCase().includes('ins'));
  }

  public static isDRUFile(filename: string, fields: DBFField[]): boolean {
    return filename.toLowerCase().includes('dru') ||
      fields.some(field => field.name.toLowerCase().includes('dru'));
  }

  /**
     * ตรวจสอบประเภทไฟล์และส่งคืนประเภท
     */
  public static getFileType(filename: string, fields: DBFField[]): string {
    if (this.isADPFile(filename, fields)) return 'ADP';
    if (this.isOPDFile(filename, fields)) return 'OPD';
    if (this.isCHTFile(filename, fields)) return 'CHT';
    if (this.isCHAFile(filename, fields)) return 'CHA';
    if (this.isINSFile(filename, fields)) return 'INS';
    if (this.isDRUFile(filename, fields)) return 'DRU';
    return 'UNKNOWN';
  }

  /**
     * แก้ไขข้อมูล ADP field (เปลี่ยนจาก 15 เป็น 16)
     */
  public static modifyADPFieldType(records: DBFRecord[]): DBFRecord[] {
    return records.map(record => {
      const modifiedRecord = { ...record };

      // ตรวจสอบและแก้ไขฟิลด์ที่เกี่ยวข้องกับ ADP
      if (modifiedRecord['ADP'] === '15') {
        modifiedRecord['ADP'] = '16';
      }

      // แก้ไขฟิลด์อื่นๆ ที่เกี่ยวข้อง
      if (modifiedRecord['TYPE'] === '15') {
        modifiedRecord['TYPE'] = '16';
      }

      return modifiedRecord;
    });
  }

  /**
     * แยกข้อมูล DBF พร้อม schema
     */
  public static parseDBFWithSchema(buffer: Buffer): {
    records: DBFRecord[];
    schema: DBFField[];
  } {
    const importService = new ImportService(buffer);
    const schema = importService.getFields();
    const records = importService.parseRecords();

    return { records, schema };
  }

  /**
     * อัปโหลดไฟล์ DBF
     */
  public static async uploadDBFFiles(
    files: any[],
    user: AuthUser,
    clientIP: string,
  ): Promise<{
    success: boolean;
    message: string;
    uploadedFiles: string[];
    error?: string;
  }> {
    try {
      // สร้างโฟลเดอร์สำหรับผู้ใช้
      const uploadDir = join(process.cwd(), 'uploads');
      const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
      const ipFolderName = clientIP.replace(/\./g, '_');
      const ipUserDir = join(userDir, ipFolderName);

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      await mkdir(ipUserDir, { recursive: true });

      const uploadedFiles: string[] = [];

      for (const file of files) {
        const filename = `${Date.now()}_${file.originalname}`;
        const filePath = join(ipUserDir, filename);

        // บันทึกไฟล์
        await writeFile(filePath, file.buffer);

        uploadedFiles.push(filename);
        logger.info(`อัปโหลดไฟล์: ${filename} (${file.size} bytes)`);
      }

      return {
        success: true,
        message: `อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`,
        uploadedFiles,
      };

    } catch (error) {
      logger.error('Upload error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลด',
        uploadedFiles: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
     * ดึงรายการไฟล์ของผู้ใช้
     */
  public static async getUserFiles(
    user: AuthUser,
    clientIP: string,
  ): Promise<{
    success: boolean;
    files: string[];
    error?: string;
  }> {
    try {
      const uploadDir = join(process.cwd(), 'uploads');
      const userDir = join(uploadDir, user.userName.replace(/[^a-zA-Z0-9]/g, '_'));
      const ipFolderName = clientIP.replace(/\./g, '_');
      const ipUserDir = join(userDir, ipFolderName);

      if (!existsSync(ipUserDir)) {
        return {
          success: true,
          files: [],
        };
      }

      const files = await readdir(ipUserDir);
      const dbfFiles = files.filter(file => file.toLowerCase().endsWith('.dbf'));

      return {
        success: true,
        files: dbfFiles,
      };

    } catch (error) {
      logger.error('Get files error:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
} 
