// ========================================
// DBF PARSER UTILITY
// ========================================

import * as iconv from 'iconv-lite';

export interface DBFField {
  name: string;
  type: string;
  length: number;
  decimalPlaces: number;
}

export interface DBFRecord {
  [key: string]: any;
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
  public async processRecordsStreaming(
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

  /**
   * Parse single record เพื่อประหยัด memory
   */
  private parseSingleRecord(offset: number): DBFRecord | null {
    try {
      const record: DBFRecord = {};
      let fieldOffset = offset + 1; // Skip deletion flag

      for (const field of this.fields) {
        let fieldData: string;
        
        // ใช้ encoding detection แบบ optimized
        if (this.isThaiField(field.name)) {
          fieldData = this.parseThaiField(fieldOffset, field.length);
        } else {
          fieldData = this.buffer.toString('ascii', fieldOffset, fieldOffset + field.length).trim();
        }

        // แปลงข้อมูลตามประเภทฟิลด์
        record[field.name] = this.convertFieldValue(fieldData, field.type);

        fieldOffset += field.length;
      }

      return record;
    } catch (error) {
      return null;
    }
  }

  /**
   * ตรวจสอบว่าเป็นฟิลด์ที่มีภาษาไทยหรือไม่
   */
  private isThaiField(fieldName: string): boolean {
    const thaiFields = ['UNIT', 'DIDNAME', 'DETAIL', 'NAME', 'DESC'];
    return thaiFields.some(thaiField => fieldName.toUpperCase().includes(thaiField));
  }

  /**
   * Parse ฟิลด์ที่มีภาษาไทยแบบ optimized
   */
  private parseThaiField(fieldOffset: number, fieldLength: number): string {
    const fieldBuffer = this.buffer.slice(fieldOffset, fieldOffset + fieldLength);
    
    // ลอง encoding หลักๆ ก่อน
    const encodings = ['utf8', 'win874', 'cp874'];
    
    for (const encoding of encodings) {
      try {
        const text = iconv.decode(fieldBuffer, encoding).trim();
        const thaiCount = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
        
        // ถ้าพบภาษาไทยมากกว่า 1 ตัว ให้ใช้ encoding นี้
        if (thaiCount > 0) {
          return text;
        }
      } catch (e) {
        continue;
      }
    }
    
    // ถ้าไม่พบภาษาไทย ให้ใช้ ASCII
    return this.buffer.toString('ascii', fieldOffset, fieldOffset + fieldLength).trim();
  }

  /**
   * แปลงค่า field ตามประเภท
   */
  private convertFieldValue(fieldData: string, fieldType: string): any {
    switch (fieldType.toUpperCase()) {
      case 'N': // Numeric
        const numValue = parseFloat(fieldData);
        return isNaN(numValue) ? 0 : numValue;
      case 'D': // Date
        return this.parseDate(fieldData);
      case 'L': // Logical
        return fieldData.toUpperCase() === 'T' || fieldData.toUpperCase() === 'Y';
      default: // Character
        return fieldData;
    }
  }

  /**
   * Parse records แบบเดิม (สำหรับไฟล์เล็ก)
   */
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
