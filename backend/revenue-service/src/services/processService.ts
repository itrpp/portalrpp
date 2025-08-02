import { DBFRecord, ProcessingResult } from '../types/index';

export class ProcessService {
  /**
     * ประมวลผลไฟล์ CHT
     */
  public static processCHTFile(records: DBFRecord[]): {
    updatedRecords: DBFRecord[];
    deletedSeqValues: Set<string>;
  } {
    const updatedRecords: DBFRecord[] = [];
    const deletedSeqValues = new Set<string>();

    for (const record of records) {
      const seq = record['SEQ'] || '';

      // ตรวจสอบเงื่อนไขการลบ SEQ
      if (seq && this.shouldDeleteSEQ(record)) {
        deletedSeqValues.add(seq);
        continue; // ข้ามเรคอร์ดนี้
      }

      updatedRecords.push(record);
    }

    return {
      updatedRecords,
      deletedSeqValues,
    };
  }

  /**
     * ตรวจสอบว่าควรลบ SEQ หรือไม่
     */
  private static shouldDeleteSEQ(record: DBFRecord): boolean {
    // เงื่อนไขการลบ SEQ (ตัวอย่าง)
    const code = record['CODE'] || '';
    const qty = record['QTY'] || 0;

    // ลบถ้า CODE เป็น 'DELETE' หรือ QTY เป็น 0
    return code === 'DELETE' || Number(qty) === 0;
  }

  /**
     * ประมวลผลไฟล์ CHA
     */
  public static processCHAFile(records: DBFRecord[], deletedSeqValues: Set<string>): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const seq = record['SEQ'] || '';

      // ข้ามเรคอร์ดที่มี SEQ อยู่ใน deletedSeqValues
      if (seq && deletedSeqValues.has(seq)) {
        continue;
      }

      // อัปเดต TOTAL ตาม CHRGITEM=31
      const chrgItem = record['CHRGITEM'] || '';
      if (chrgItem === '31') {
        const updatedRecord = { ...record };
        const qty = Number(record['QTY'] || 0);
        const rate = Number(record['RATE'] || 0);
        updatedRecord['TOTAL'] = (qty * rate).toString();
        updatedRecords.push(updatedRecord);
      } else {
        updatedRecords.push(record);
      }
    }

    return updatedRecords;
  }

  /**
     * ประมวลผลไฟล์ INS
     */
  public static processINSFile(records: DBFRecord[], deletedSeqValues: Set<string>): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const seq = record['SEQ'] || '';

      // ข้ามเรคอร์ดที่มี SEQ อยู่ใน deletedSeqValues
      if (seq && deletedSeqValues.has(seq)) {
        continue;
      }

      updatedRecords.push(record);
    }

    return updatedRecords;
  }

  /**
     * ประมวลผลไฟล์ DRU
     */
  public static processDRUFile(
    records: DBFRecord[],
    deletedSeqValues: Set<string>,
    keptSeqValues: Set<string>,
  ): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const seq = record['SEQ'] || '';

      // อัปเดต SEQ ตาม kept SEQ จาก CHT
      if (seq && keptSeqValues.has(seq)) {
        const updatedRecord = { ...record };
        // อัปเดตฟิลด์ตามความต้องการ
        updatedRecords.push(updatedRecord);
      } else {
        updatedRecords.push(record);
      }
    }

    return updatedRecords;
  }

  /**
     * ประมวลผลไฟล์ OPD
     */
  public static processOPDFile(records: DBFRecord[]): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const updatedRecord = { ...record };

      // อัปเดต OPTYPE
      const optype = record['OPTYPE'] || '';
      if (optype) {
        updatedRecord['OPTYPE'] = this.normalizeOPTYPE(optype);
      }

      // จัดรูปแบบวันที่
      if (record['DATE']) {
        updatedRecord['DATE'] = this.formatDateForExport(record['DATE']);
      }

      updatedRecords.push(updatedRecord);
    }

    return updatedRecords;
  }

  /**
     * สร้างเรคอร์ดใหม่จากกลุ่มเรคอร์ด
     */
  private static createNewRecordFromGroup(groupRecords: DBFRecord[]): DBFRecord | null {
    if (groupRecords.length === 0) return null;

    const baseRecord = { ...groupRecords[0] };

    // รวมข้อมูลจากกลุ่มเรคอร์ด
    let totalQty = 0;
    let totalAmount = 0;

    for (const record of groupRecords) {
      totalQty += Number(record['QTY'] || 0);
      totalAmount += Number(record['TOTAL'] || 0);
    }

    baseRecord['QTY'] = totalQty.toString();
    baseRecord['TOTAL'] = totalAmount.toString();

    return baseRecord;
  }

  /**
     * อัปเดตเรคอร์ดตามเงื่อนไข
     */
  private static applyUpdateConditions(records: DBFRecord[], conditions: any[]): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const updatedRecord = { ...record };

      for (const condition of conditions) {
        if (condition.allowedCodes.includes(record['CODE'] || '')) {
          updatedRecord['CODE'] = condition.newCode;
          updatedRecord['QTY'] = condition.newQty;
          updatedRecord['RATE'] = condition.newRate;
          updatedRecord['TOTAL'] = condition.newTotal;
        }
      }

      updatedRecords.push(updatedRecord);
    }

    return updatedRecords;
  }

  /**
     * อัปเดตฟิลด์วันที่
     */
  public static updateDateFields(records: DBFRecord[]): DBFRecord[] {
    const updatedRecords: DBFRecord[] = [];

    for (const record of records) {
      const updatedRecord = { ...record };

      // อัปเดตฟิลด์วันที่
      if (record['DATE']) {
        updatedRecord['DATE'] = this.formatDateForExport(record['DATE']);
      }

      if (record['SERV_DATE']) {
        updatedRecord['SERV_DATE'] = this.formatDateForExport(record['SERV_DATE']);
      }

      if (record['BILL_DATE']) {
        updatedRecord['BILL_DATE'] = this.formatDateForExport(record['BILL_DATE']);
      }

      updatedRecords.push(updatedRecord);
    }

    return updatedRecords;
  }

  /**
     * จัดรูปแบบวันที่สำหรับการส่งออก
     */
  public static formatDateForExport(dateValue: any): string {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return String(dateValue);
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}${month}${day}`;
    } catch {
      return String(dateValue);
    }
  }

  /**
     * คัดลอกฟิลด์ภาษาไทยจากเรคอร์ดต้นฉบับ
     */
  public static copyThaiFieldsFromOriginal(
    originalRecords: DBFRecord[],
    updatedRecords: DBFRecord[],
  ): DBFRecord[] {
    const result: DBFRecord[] = [];

    for (const updatedRecord of updatedRecords) {
      const originalRecord = this.findOriginalRecord(originalRecords, updatedRecord);

      if (originalRecord) {
        // คัดลอกฟิลด์ภาษาไทยจากเรคอร์ดต้นฉบับ
        const mergedRecord = { ...updatedRecord };

        // คัดลอกฟิลด์ที่อาจเป็นภาษาไทย
        const thaiFields = ['NAME', 'DETAIL', 'DESC', 'REMARK', 'NOTE'];
        for (const field of thaiFields) {
          if (originalRecord[field]) {
            mergedRecord[field] = originalRecord[field];
          }
        }

        result.push(mergedRecord);
      } else {
        result.push(updatedRecord);
      }
    }

    return result;
  }

  /**
     * คัดลอกฟิลด์ DETAIL จากเรคอร์ดต้นฉบับ
     */
  public static copyDETAILFromOriginal(
    originalRecords: DBFRecord[],
    updatedRecords: DBFRecord[],
  ): DBFRecord[] {
    const result: DBFRecord[] = [];

    for (const updatedRecord of updatedRecords) {
      const originalRecord = this.findOriginalRecord(originalRecords, updatedRecord);

      if (originalRecord && originalRecord['DETAIL']) {
        const mergedRecord = { ...updatedRecord };
        mergedRecord['DETAIL'] = originalRecord['DETAIL'];
        result.push(mergedRecord);
      } else {
        result.push(updatedRecord);
      }
    }

    return result;
  }

  /**
     * หาเรคอร์ดต้นฉบับที่ตรงกัน
     */
  private static findOriginalRecord(originalRecords: DBFRecord[], updatedRecord: DBFRecord): DBFRecord | null {
    // หาเรคอร์ดที่ตรงกันตามฟิลด์หลัก
    const keyFields = ['SEQ', 'CODE', 'DATE'];

    for (const originalRecord of originalRecords) {
      let isMatch = true;

      for (const field of keyFields) {
        if (originalRecord[field] !== updatedRecord[field]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return originalRecord;
      }
    }

    return null;
  }

  /**
     * ประมวลผลไฟล์ DBF หลัก
     */
  public static processDBFFile(
    records: DBFRecord[],
    filename: string,
    options: {
      validateSchema?: boolean;
      processConditions?: boolean;
      updateFields?: boolean;
      encoding?: string;
    } = {},
  ): ProcessingResult {
    const startTime = Date.now();
    let processedRecords = [...records];

    try {
      // อัปเดตฟิลด์วันที่
      if (options.updateFields !== false) {
        processedRecords = this.updateDateFields(processedRecords);
      }

      const endTime = Date.now();
      const processingTime = `${endTime - startTime}ms`;

      return {
        success: true,
        records: processedRecords,
        originalCount: records.length,
        processedCount: processedRecords.length,
        processingTime,
        filename,
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = `${endTime - startTime}ms`;

      return {
        success: false,
        records: [],
        originalCount: records.length,
        processedCount: 0,
        processingTime,
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
     * จัดรูปแบบ OPTYPE
     */
  private static normalizeOPTYPE(optype: string): string {
    // จัดรูปแบบ OPTYPE ตามความต้องการ
    return optype.toUpperCase().trim();
  }
} 
