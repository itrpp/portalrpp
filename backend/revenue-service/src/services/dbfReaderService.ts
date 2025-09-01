// ========================================
// DBF READER SERVICE
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { FileProcessingStatus } from '@/types';
import { logInfo, logError } from '@/utils/logger';

export interface DBFField {
  name: string;
  type: string;
  length: number;
  decimalPlaces: number;
}

export interface DBFHeader {
  version: number;
  year: number;
  month: number;
  day: number;
  recordCount: number;
  headerLength: number;
  recordLength: number;
  fields: DBFField[];
}

export interface DBFRecord {
  [key: string]: any;
}

export interface DBFParseResult {
  header: DBFHeader;
  records: DBFRecord[];
  schema: DBFField[];
}

export class DBFReaderService {
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
      
      // แยก header และ records
      const header = this.parseHeader(buffer);
      const records = this.parseRecords(buffer, header);
      
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
   * อ่าน header ของไฟล์ DBF
   */
  private parseHeader(buffer: Buffer): DBFHeader {
    // ตรวจสอบขนาดไฟล์ขั้นต่ำ
    if (buffer.length < 32) {
      throw new Error('ไฟล์ DBF มีขนาดเล็กเกินไป');
    }

    // อ่านข้อมูล header ตามมาตรฐาน DBF
    const version = buffer[0] || 0;
    const year = (buffer[1] || 0) + 1900; // DBF ใช้ปี 1900 เป็นฐาน
    const month = buffer[2] || 0;
    const day = buffer[3] || 0;
    const recordCount = buffer.readUInt32LE(4);
    const headerLength = buffer.readUInt16LE(8);
    const recordLength = buffer.readUInt16LE(10);

    // ตรวจสอบความถูกต้องของ header
    if (headerLength < 32 || recordLength < 1) {
      throw new Error('ข้อมูล header ของไฟล์ DBF ไม่ถูกต้อง');
    }

    // อ่าน field definitions
    const fields: DBFField[] = [];
    let offset = 32; // เริ่มต้นหลังจาก header หลัก

    while (offset < headerLength - 1) {
      // ตรวจสอบ field terminator (0x0D)
      if (buffer[offset] === 0x0D) {
        break;
      }

      // อ่าน field name (11 bytes, null-terminated)
      const fieldName = buffer.toString('ascii', offset, offset + 11).replace(/\0/g, '');
      
      // อ่าน field type (1 byte)
      const fieldType = String.fromCharCode(buffer[offset + 11] || 0);
      
      // อ่าน field length และ decimal places
      const fieldLength = buffer[offset + 16] || 0;
      const decimalPlaces = buffer[offset + 17] || 0;

      // เพิ่ม field ถ้าชื่อไม่ว่าง
      if (fieldName.trim()) {
        fields.push({
          name: fieldName.trim(),
          type: fieldType,
          length: fieldLength,
          decimalPlaces: decimalPlaces
        });
      }

      offset += 32; // แต่ละ field definition มีขนาด 32 bytes
    }

    return {
      version,
      year,
      month,
      day,
      recordCount,
      headerLength,
      recordLength,
      fields
    };
  }

  /**
   * อ่าน records จากไฟล์ DBF
   */
  private parseRecords(buffer: Buffer, header: DBFHeader): DBFRecord[] {
    const records: DBFRecord[] = [];
    let offset = header.headerLength;

    for (let i = 0; i < header.recordCount; i++) {
      // ตรวจสอบ record marker (0x20 = active, 0x2A = deleted)
      const recordMarker = buffer[offset];
      
      if (recordMarker === 0x20) { // Active record
        const record: DBFRecord = {};
        let fieldOffset = offset + 1; // ข้าม record marker

        for (const field of header.fields) {
          // อ่านข้อมูลตาม field length
          const fieldData = buffer.toString('ascii', fieldOffset, fieldOffset + field.length).trim();
          
          // แปลงข้อมูลตาม field type
          let value: any = fieldData;
          
          switch (field.type.toUpperCase()) {
            case 'N': // Numeric
              if (fieldData) {
                value = parseFloat(fieldData);
                if (isNaN(value)) {
                  value = fieldData; // เก็บเป็น string ถ้าแปลงไม่ได้
                }
              }
              break;
              
            case 'D': // Date (YYYYMMDD)
              if (fieldData && fieldData.length === 8) {
                const year = parseInt(fieldData.substring(0, 4));
                const month = parseInt(fieldData.substring(4, 6)) - 1;
                const day = parseInt(fieldData.substring(6, 8));
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                  value = new Date(year, month, day).toISOString();
                }
              }
              break;
              
            case 'L': // Logical (T/F, Y/N, 1/0)
              if (fieldData) {
                const upper = fieldData.toUpperCase();
                value = upper === 'T' || upper === 'Y' || upper === '1';
              }
              break;
              
            default: // Character และอื่นๆ
              value = fieldData;
          }

          record[field.name] = value;
          fieldOffset += field.length;
        }

        records.push(record);
      }

      offset += header.recordLength;
    }

    return records;
  }

  /**
   * บันทึกข้อมูล DBF records ลงในฐานข้อมูล
   */
  async saveDBFRecordsToDatabase(
    fileId: string, 
    records: DBFRecord[], 
    schema: DBFField[]
  ): Promise<{ success: boolean; savedCount: number; error?: string }> {
    try {
      logInfo(`💾 เริ่มบันทึก ${records.length} รายการ DBF ลงในฐานข้อมูลสำหรับไฟล์ ${fileId}`);

      // ตรวจสอบว่าไฟล์มีอยู่ในฐานข้อมูลหรือไม่
      const uploadRecord = await this.prisma.uploadRecord.findUnique({
        where: { id: fileId }
      });

      if (!uploadRecord) {
        throw new Error(`ไม่พบไฟล์ ID: ${fileId} ในฐานข้อมูล`);
      }

      // ลบ records เดิม (ถ้ามี) เพื่อป้องกันข้อมูลซ้ำ
      await this.prisma.dBF_Record.deleteMany({
        where: { fileId }
      });

      // สร้าง records ใหม่
      const dbfRecords = records.map((record, index) => ({
        fileId,
        recordIndex: index,
        data: JSON.stringify(record)
      }));

      // บันทึกแบบ batch
      const savedRecords = await this.prisma.dBF_Record.createMany({
        data: dbfRecords
      });

      // อัปเดตจำนวน records ใน UploadRecord
      await this.prisma.uploadRecord.update({
        where: { id: fileId },
        data: {
          totalRecords: records.length,
          status: FileProcessingStatus.SUCCESS,
          metadata: JSON.stringify({
            ...JSON.parse(uploadRecord.metadata || '{}'),
            dbfSchema: schema,
            recordCount: records.length,
            processedAt: new Date().toISOString()
          })
        }
      });

      logInfo(`✅ บันทึก DBF records สำเร็จ: ${savedRecords.count} รายการ`);

      return {
        success: true,
        savedCount: savedRecords.count
      };

    } catch (error) {
      logError('Error saving DBF records to database', error as Error);
      return {
        success: false,
        savedCount: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * ดึงข้อมูล DBF records จากฐานข้อมูล
   */
  async getDBFRecordsFromDatabase(
    fileId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<{ records: DBFRecord[]; total: number; schema?: DBFField[] | undefined }> {
    try {
      // ดึงข้อมูล upload record เพื่อดู schema
      const uploadRecord = await this.prisma.uploadRecord.findUnique({
        where: { id: fileId }
      });

      if (!uploadRecord) {
        throw new Error(`ไม่พบไฟล์ ID: ${fileId}`);
      }

      // ดึงจำนวน records ทั้งหมด
      const total = await this.prisma.dBF_Record.count({
        where: { fileId }
      });

      // ดึง records ตาม limit และ offset
      const dbfRecords = await this.prisma.dBF_Record.findMany({
        where: { fileId },
        orderBy: { recordIndex: 'asc' },
        take: limit,
        skip: offset
      });

      // แปลงข้อมูลกลับเป็น objects
      const records: DBFRecord[] = dbfRecords.map(dbfRecord => 
        JSON.parse(dbfRecord.data)
      );

      // ดึง schema จาก metadata
      let schema: DBFField[] | undefined;
      if (uploadRecord.metadata) {
        try {
          const metadata = JSON.parse(uploadRecord.metadata);
          schema = metadata.dbfSchema;
        } catch {
          // ไม่สามารถ parse metadata ได้
        }
      }

      return {
        records,
        total,
        schema: schema || undefined
      };

    } catch (error) {
      logError('Error getting DBF records from database', error as Error);
      throw error;
    }
  }

  /**
   * ลบ DBF records ของไฟล์
   */
  async deleteDBFRecords(fileId: string): Promise<boolean> {
    try {
      await this.prisma.dBF_Record.deleteMany({
        where: { fileId }
      });
      
      logInfo(`🗑️ ลบ DBF records ของไฟล์ ${fileId} สำเร็จ`);
      return true;
    } catch (error) {
      logError('Error deleting DBF records', error as Error);
      return false;
    }
  }

  /**
   * ตรวจสอบสถานะการประมวลผลไฟล์ DBF
   */
  async getDBFProcessingStatus(fileId: string): Promise<{
    isProcessed: boolean;
    recordCount: number;
    processedAt?: string | undefined;
    schema?: DBFField[] | undefined;
  }> {
    try {
      const uploadRecord = await this.prisma.uploadRecord.findUnique({
        where: { id: fileId }
      });

      if (!uploadRecord) {
        return { isProcessed: false, recordCount: 0 };
      }

      const recordCount = await this.prisma.dBF_Record.count({
        where: { fileId }
      });

      let processedAt: string | undefined;
      let schema: DBFField[] | undefined;

      if (uploadRecord.metadata) {
        try {
          const metadata = JSON.parse(uploadRecord.metadata);
          processedAt = metadata.processedAt;
          schema = metadata.dbfSchema;
        } catch {
          // ไม่สามารถ parse metadata ได้
        }
      }

      return {
        isProcessed: recordCount > 0,
        recordCount,
        processedAt: processedAt || undefined,
        schema: schema || undefined
      };

    } catch (error) {
      logError('Error getting DBF processing status', error as Error);
      return { isProcessed: false, recordCount: 0 };
    }
  }

  /**
   * ดึงข้อมูล DBF records ทั้งหมดจากฐานข้อมูลสำหรับ OPD
   */
  async getAllDBFRecordsFromDatabaseForOPD(fileId: string): Promise<DBFRecord[]> {
    try {
      const dbfRecords = await this.prisma.dBF_Record.findMany({
        where: { fileId },
        orderBy: { recordIndex: 'asc' }
      });

      // แปลงข้อมูลกลับเป็น objects
      const records: DBFRecord[] = dbfRecords.map(dbfRecord => 
        JSON.parse(dbfRecord.data)
      );

      logInfo(`📊 ดึงข้อมูล DBF records ทั้งหมดสำหรับ OPD: ${records.length} รายการ`);
      return records;

    } catch (error) {
      logError('Error getting all DBF records from database for OPD', error as Error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล DBF records ทั้งหมดจากฐานข้อมูลสำหรับ IPD
   */
  async getAllDBFRecordsFromDatabaseForIPD(fileId: string): Promise<DBFRecord[]> {
    try {
      const dbfRecords = await this.prisma.dBF_Record.findMany({
        where: { fileId },
        orderBy: { recordIndex: 'asc' }
      });

      // แปลงข้อมูลกลับเป็น objects
      const records: DBFRecord[] = dbfRecords.map(dbfRecord => 
        JSON.parse(dbfRecord.data)
      );

      logInfo(`📊 ดึงข้อมูล DBF records ทั้งหมดสำหรับ IPD: ${records.length} รายการ`);
      return records;

    } catch (error) {
      logError('Error getting all DBF records from database for IPD', error as Error);
      throw error;
    }
  }

  /**
   * สร้างไฟล์ DBF ใหม่จากข้อมูลในฐานข้อมูล
   */
  async createDBFFileFromRecords(
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
      const header = this.createDBFHeader(records.length, schema);
      
      // สร้างไฟล์ DBF
      const buffer = this.createDBFBuffer(header, records, schema);
      
      // เขียนไฟล์
      await fs.writeFile(outputPath, buffer);
      
      logInfo(`✅ สร้างไฟล์ DBF สำเร็จ: ${path.basename(outputPath)} (${records.length} records)`);

    } catch (error) {
      logError('Error creating DBF file from records', error as Error);
      throw new Error(`ไม่สามารถสร้างไฟล์ DBF ได้: ${(error as Error).message}`);
    }
  }

  /**
   * สร้าง DBF header
   */
  private createDBFHeader(recordCount: number, fields: DBFField[]): DBFHeader {
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
  private createDBFBuffer(header: DBFHeader, records: DBFRecord[], fields: DBFField[]): Buffer {
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
}
