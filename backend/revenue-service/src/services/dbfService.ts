// ========================================
// DBF SERVICE (CONSOLIDATED)
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { PrismaClient } from '@prisma/client';
import { FileProcessingStatus, DBFField, DBFHeader, DBFRecord, DBFParseResult } from '@/types';
import { logInfo, logError } from '@/utils/logger';

// ========================================
// INTERFACES
// ========================================

// Interfaces moved to @/types

// ========================================
// DBF READER CLASS
// ========================================

export class DBFReader {
  private buffer: Buffer;
  private fields: DBFField[];
  private headerLength: number;
  private recordLength: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.fields = this.parseFields();
    this.headerLength = 32 + (this.fields.length * 32) + 1;
    this.recordLength = this.fields.reduce((sum, field) => sum + field.length, 1);
  }

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
        decimalPlaces: decimalPlaces
      });

      offset += 32;
    }

    return fields;
  }

  public getFields(): DBFField[] {
    return this.fields;
  }

  /**
   * ประมวลผล records แบบ streaming เพื่อประหยัด memory
   */
  public async processRecordsWithStreaming(
    onRecord: (record: DBFRecord, index: number) => Promise<void>,
    batchSize: number = 1000
  ): Promise<number> {
    let offset = this.headerLength;
    let recordIndex = 0;
    let processedCount = 0;

    while (offset < this.buffer.length) {
      if (this.buffer[offset] === 0x1A) break; // End of file marker

      const record = this.parseSingleRecord(offset);
      if (record) {
        await onRecord(record, recordIndex);
        processedCount++;
      }

      recordIndex++;
      offset += this.recordLength;

      // Force garbage collection ทุก batch
      if (recordIndex % batchSize === 0) {
        if ((global as any).gc) {
          (global as any).gc();
        }
      }
    }

    return processedCount;
  }

  private parseSingleRecord(offset: number): DBFRecord | null {
    if (this.buffer[offset] === 0x1A) return null; // End of file marker
    // dBase/deleted flag: 0x2A ('*') = deleted, 0x20 (' ') = active
    if (this.buffer[offset] === 0x2A) return null; // Deleted record marker

    const record: DBFRecord = {};
    let fieldOffset = offset + 1; // Skip deletion flag

    for (const field of this.fields) {
      const fieldData = this.buffer.slice(fieldOffset, fieldOffset + field.length);
      let value: any = null;

      switch (field.type) {
        case 'C': // Character
          value = iconv.decode(fieldData, 'tis-620').trim();
          break;
        case 'N': // Numeric
          const numStr = fieldData.toString('ascii').trim();
          if (numStr) {
            value = field.decimalPlaces > 0 ? parseFloat(numStr) : parseInt(numStr, 10);
          }
          break;
        case 'D': // Date
          const dateStr = fieldData.toString('ascii').trim();
          value = this.parseDate(dateStr);
          break;
        case 'L': // Logical
          const logicalStr = fieldData.toString('ascii').trim().toUpperCase();
          value = logicalStr === 'T' || logicalStr === 'Y';
          break;
        case 'M': // Memo
          value = fieldData.toString('ascii').trim();
          break;
        default:
          value = fieldData.toString('ascii').trim();
      }

      record[field.name] = value;
      fieldOffset += field.length;
    }

    return record;
  }

  public parseRecords(): DBFRecord[] {
    const records: DBFRecord[] = [];
    let offset = this.headerLength;

    while (offset < this.buffer.length) {
      if (this.buffer[offset] === 0x1A) break; // End of file marker

      const record = this.parseSingleRecord(offset);
      if (record) {
        records.push(record);
      }

      offset += this.recordLength;
    }

    return records;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;

    try {
      // รูปแบบ YYYYMMDD
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-based
      const day = parseInt(dateStr.substring(6, 8));

      if (year < 1900 || year > 2100) return null;
      if (month < 0 || month > 11) return null;
      if (day < 1 || day > 31) return null;

      return new Date(year, month, day);
    } catch (e) {
      return null;
    }
  }

  public getRecordCount(): number {
    // อ่านจำนวน records จาก header
    const recordCountBytes = this.buffer.slice(4, 8);
    return recordCountBytes.readUInt32LE(0);
  }

  public getHeaderInfo(): DBFHeader {
    const recordCount = this.getRecordCount();
    const year = (this.buffer[1] || 0) + 1900;
    const month = this.buffer[2] || 0;
    const day = this.buffer[3] || 0;
    const version = this.buffer[0] || 0;

    return {
      version,
      year,
      month,
      day,
      recordCount,
      headerLength: this.headerLength,
      recordLength: this.recordLength,
      fields: this.fields
    };
  }
}

// ========================================
// DBF SERVICE CLASS
// ========================================

export class DBFService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * อ่านและแปลงข้อมูลจากไฟล์ DBF
   */
  async parseDBFFile(filePath: string): Promise<DBFParseResult> {
    try {
      logInfo(`🔍 เริ่มอ่านไฟล์ DBF: ${path.basename(filePath)}`);

      // อ่านไฟล์เป็น Buffer
      const buffer = await fs.readFile(filePath);

      // ใช้ DBFReader class
      const reader = new DBFReader(buffer);
      const header = reader.getHeaderInfo();
      const records = reader.parseRecords();

      logInfo(`✅ อ่านไฟล์ DBF สำเร็จ: ${header.recordCount} รายการ, ${header.fields.length} ฟิลด์`);

      return {
        header,
        records,
        schema: header.fields
      };
    } catch (error) {
      logError('Error parsing DBF file', error as Error);
      throw new Error(`ไม่สามารถอ่านไฟล์ DBF ได้: ${(error as Error).message}`);
    }
  }

  /**
   * ประมวลผลไฟล์ DBF แบบ streaming
   */
  async processDBFWithStreaming(
    filePath: string,
    onRecord: (record: DBFRecord, index: number) => Promise<void>,
    batchSize: number = 1000
  ): Promise<{ recordCount: number; fieldCount: number }> {
    try {
      logInfo(`🔍 เริ่มประมวลผลไฟล์ DBF แบบ streaming: ${path.basename(filePath)}`);

      const buffer = await fs.readFile(filePath);
      const reader = new DBFReader(buffer);

      const recordCount = await reader.processRecordsWithStreaming(onRecord, batchSize);
      const fieldCount = reader.getFields().length;

      logInfo(`✅ ประมวลผลไฟล์ DBF สำเร็จ: ${recordCount} รายการ, ${fieldCount} ฟิลด์`);

      return { recordCount, fieldCount };
    } catch (error) {
      logError('Error processing DBF file streaming', error as Error);
      throw new Error(`ไม่สามารถประมวลผลไฟล์ DBF ได้: ${(error as Error).message}`);
    }
  }

  /**
   * บันทึกข้อมูล DBF ลงฐานข้อมูล
   */
  async saveDBFRecordsToDatabase(
    _batchId: string,
    records: DBFRecord[],
    fileId: string
  ): Promise<{ savedCount: number; errorCount: number }> {
    try {
      logInfo(`💾 เริ่มบันทึกข้อมูล DBF ลงฐานข้อมูล: ${records.length} รายการ`);

      let savedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await this.prisma.dBF_Record.create({
            data: {
              fileId,
              recordIndex: savedCount,
              data: JSON.stringify(record),
              createdAt: new Date()
            }
          });
          savedCount++;
        } catch (error) {
          logError('Error saving DBF record', error as Error);
          errorCount++;
        }
      }

      logInfo(`✅ บันทึกข้อมูล DBF สำเร็จ: ${savedCount} รายการ, ${errorCount} ข้อผิดพลาด`);

      return { savedCount, errorCount };
    } catch (error) {
      logError('Error saving DBF records to database', error as Error);
      throw new Error(`ไม่สามารถบันทึกข้อมูล DBF ลงฐานข้อมูลได้: ${(error as Error).message}`);
    }
  }

  /**
   * อัปเดตสถานะการประมวลผลไฟล์
   */
  async updateFileProcessingStatus(
    fileId: string,
    status: FileProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.uploadRecord.update({
        where: { id: fileId },
        data: {
          status,
          errorMessage: errorMessage || null,
          updatedAt: new Date()
        }
      });

      logInfo(`📝 อัปเดตสถานะไฟล์: ${fileId} -> ${status}`);
    } catch (error) {
      logError('Error updating file processing status', error as Error);
      throw new Error(`ไม่สามารถอัปเดตสถานะไฟล์ได้: ${(error as Error).message}`);
    }
  }

  /**
   * ดึงข้อมูล DBF records จากฐานข้อมูลสำหรับ OPD
   */
  public async getAllDBFRecordsFromDatabaseForOPD(fileId: string): Promise<any[]> {
    try {
      logInfo('Fetching all DBF records from database for OPD', { fileId });
  
      const prisma = new PrismaClient();
  
      // ดึงข้อมูลจากตาราง dbf_records ตาม fileId
      const dbfRecords = await prisma.dBF_Record.findMany({
        where: {
          fileId: fileId
        },
        orderBy: {
          id: 'asc'
        }
      });
  
      const records: DBFRecord[] = dbfRecords.map(dbfRecord =>
        JSON.parse(dbfRecord.data_ipd || dbfRecord.data)
      );
  
      await prisma.$disconnect();
  
      logInfo('DBF records fetched successfully', {
        fileId,
        recordCount: records.length
      });
  
      return records;
  
    } catch (error) {
      logError('Failed to fetch DBF records from database', error as Error, { fileId });
      throw error;
    }
  }

  /**
   * ดึงข้อมูล DBF records จากฐานข้อมูลสำหรับ IPD
   */
  public async getAllDBFRecordsFromDatabaseForIPD(fileId: string): Promise<any[]> {
    try {
      logInfo('Fetching all DBF records from database for IPD', { fileId });
  
      const prisma = new PrismaClient();
  
      // ดึงข้อมูลจากตาราง dbf_records ตาม fileId
      const dbfRecords = await prisma.dBF_Record.findMany({
        where: {
          fileId: fileId
        },
        orderBy: {
          id: 'asc'
        }
      });
  
      // แปลงข้อมูลกลับเป็น objects
      const records: DBFRecord[] = dbfRecords.map(dbfRecord =>
        JSON.parse(dbfRecord.data_ipd || dbfRecord.data)
      );
  
      await prisma.$disconnect();
  
      logInfo('DBF records fetched successfully', {
        fileId,
        recordCount: records.length
      });
  
      return records;
  
    } catch (error) {
      logError('Failed to fetch DBF records from database', error as Error, { fileId });
      throw error;
    }
  }

  /**
   * สร้างไฟล์ DBF ใหม่จากข้อมูลในฐานข้อมูล (instance method)
   */
  public async createDBFFileFromRecords(
    records: DBFRecord[],
    outputPath: string,
    _originalFileName: string
  ): Promise<void> {
    try {
      logInfo(`📝 เริ่มสร้างไฟล์ DBF: ${path.basename(outputPath)}`);
  
      // สร้าง schema จากข้อมูลแรก (ถ้ามี)
      let schema: DBFField[] = [];
      if (records.length > 0) {
        const firstRecord = records[0];
        if (firstRecord) {
          schema = Object.keys(firstRecord).map(fieldName => {
            const value = firstRecord[fieldName];
            const valueStr = String(value || '');
  
            return {
              name: fieldName,
              type: 'C', // Character type เป็นค่าเริ่มต้น
              length: Math.max(valueStr.length, 10), // ความยาวขั้นต่ำ 10
              decimalPlaces: 0
            };
          });
        }
      }
  
      // สร้าง header
      const header = createDBFHeader(records.length, schema);
  
      // สร้างไฟล์ DBF
      const buffer = createDBFBuffer(header, records, schema);
  
      // เขียนไฟล์
      await fs.writeFile(outputPath, buffer);
  
      logInfo(`✅ สร้างไฟล์ DBF สำเร็จ: ${path.basename(outputPath)} (${records.length} records)`);
  
    } catch (error) {
      logError('Error creating DBF file from records', error as Error);
      throw new Error(`ไม่สามารถสร้างไฟล์ DBF ได้: ${(error as Error).message}`);
    }
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export function parseDBFWithSchema(buffer: Buffer): {
  records: DBFRecord[];
  schema: DBFField[];
} {
  const reader = new DBFReader(buffer);
  const records = reader.parseRecords();
  const schema = reader.getFields();

  return { records, schema };
}

export function isADPFile(filename: string, fields: DBFField[]): boolean {
  const filenameUpper = filename.toUpperCase();
  const hasADPFields = fields.some(field =>
    field.name.toUpperCase() === 'CODE' ||
    field.name.toUpperCase() === 'QTY' ||
    field.name.toUpperCase() === 'RATE' ||
    field.name.toUpperCase() === 'TOTAL'
  );

  return filenameUpper.includes('ADP') || hasADPFields;
}

export function isOPDFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('OPD') || filenameUpper.includes('PAT');
}

export function isCHTFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('CHT');
}

export function isCHAFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('CHA');
}

export function isINSFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('INS');
}

export function isDRUFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('DRU');
}

export function isODXFile(filename: string): boolean {
  const filenameUpper = filename.toUpperCase();
  return filenameUpper.includes('ODX');
}

/**
   * สร้าง DBF header
   */
export function createDBFHeader(recordCount: number, fields: DBFField[]): DBFHeader {
  const now = new Date();
  const headerLength = 32 + (fields.length * 32) + 1; // 32 bytes header + field definitions + terminator
  const recordLength = fields.reduce((sum, field) => sum + field.length, 1); // +1 for deletion flag

  return {
    version: 3, // dBASE III
    year: now.getFullYear() - 1900, // DBF ใช้ปี 1900 เป็นฐาน
    month: now.getMonth() + 1,
    day: now.getDate(),
    recordCount,
    headerLength,
    recordLength,
    fields
  };
}

/**
  * สร้าง DBF buffer
  */
export function createDBFBuffer(header: DBFHeader, records: DBFRecord[], fields: DBFField[]): Buffer {
  // คำนวณขนาด buffer
  const headerSize = header.headerLength;
  const recordSize = header.recordLength;
  const totalSize = headerSize + (records.length * recordSize);

  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // เขียน header
  buffer[offset++] = header.version;
  buffer[offset++] = header.year;
  buffer[offset++] = header.month;
  buffer[offset++] = header.day;
  buffer.writeUInt32LE(header.recordCount, offset);
  offset += 4;
  buffer.writeUInt16LE(header.headerLength, offset);
  offset += 2;
  buffer.writeUInt16LE(header.recordLength, offset);
  offset += 2;

  // เขียน reserved bytes (10 bytes)
  for (let i = 0; i < 10; i++) {
    buffer[offset++] = 0;
  }

  // เขียน field definitions
  for (const field of fields) {
    // Field name (11 bytes)
    const nameBuffer = Buffer.from(field.name.padEnd(11, '\0'));
    nameBuffer.copy(buffer, offset);
    offset += 11;

    // Field type (1 byte)
    buffer[offset++] = field.type.charCodeAt(0);

    // Reserved (4 bytes)
    for (let i = 0; i < 4; i++) {
      buffer[offset++] = 0;
    }

    // Field length (1 byte)
    buffer[offset++] = field.length;

    // Decimal places (1 byte)
    buffer[offset++] = field.decimalPlaces;

    // Reserved (14 bytes)
    for (let i = 0; i < 14; i++) {
      buffer[offset++] = 0;
    }
  }

  // Header terminator
  buffer[offset++] = 0x0D;

  // เขียน records
  for (const record of records) {
    // Deletion flag
    buffer[offset++] = 0x20; // Space = not deleted

    // Record data
    for (const field of fields) {
      const value = record[field.name] || '';
      const valueStr = String(value);
      const paddedValue = valueStr.padEnd(field.length, ' ');
      const valueBuffer = Buffer.from(paddedValue.substring(0, field.length));
      valueBuffer.copy(buffer, offset);
      offset += field.length;
    }
  }

  return buffer;
}

export default DBFService;
