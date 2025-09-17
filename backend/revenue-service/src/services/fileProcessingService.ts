
import * as fs from 'fs-extra';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { DBFReader, DBFService } from '@/services/dbfService';
import { v4 as uuidv4 } from 'uuid';
import { DateHelper, createTimer } from '@/utils/dateUtils';
import {
  FileValidationResult,
  FileProcessingResult,
  FileProcessingStatus,
  IFileProcessingService,
} from '@/types';
import { logFileProcessing, logInfo, logError } from '@/utils/logger';
import { DatabaseService } from './databaseService';
import config from '@/config';


export class FileProcessingService implements IFileProcessingService {
  private databaseService: DatabaseService;
  private dbfService: DBFService;

  constructor(databaseService?: DatabaseService, dbfService?: DBFService) {
    this.databaseService = databaseService || new DatabaseService();
    this.dbfService = dbfService || new DBFService(this.databaseService.getPrismaClient());
  }

  /**
   * ประมวลผลไฟล์ตามประเภท
   */
  async processFile(
    filePath: string,
    filename: string,
    validationResult: FileValidationResult,
  ): Promise<FileProcessingResult> {
    const timer = createTimer();

    try {

      let result: FileProcessingResult;
      switch (validationResult.fileType) {
        case 'dbf':
          result = await this.processDBF(filePath, filename);
          break;
        case 'rep':
          throw new Error(`การประมวลผลไฟล์ REP ยังไม่รองรับ`);
        case 'statement':
          throw new Error(`การประมวลผลไฟล์ Statement ยังไม่รองรับ`);
        default:
          throw new Error(`ประเภทไฟล์ไม่รองรับ: ${validationResult.fileType}`);
      }

      result.metadata = JSON.stringify({
        integrityValid: validationResult.isValid,
        validatedAt: DateHelper.toDate(DateHelper.now()),
      });

      const processingTime = timer.elapsed();
      result.statistics.processingTime = processingTime;

      logFileProcessing(filename, result.success, processingTime, result.statistics.totalRecords);
      return result;

    } catch (error) {
      const processingTime = timer.elapsed();
      logFileProcessing(filename, false, processingTime, 0);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ประมวลผลไฟล์ DBF
   */
  async processDBF(filePath: string, filename: string): Promise<FileProcessingResult> {
    const fileId = uuidv4();
    const timer = createTimer();

    try {
      const buffer = await fs.readFile(filePath);
      const utf8Buffer = iconv.decode(buffer, config.fileRules.dbf.encoding);

      const reader = new DBFReader(Buffer.from(utf8Buffer, 'utf8'));
      const headerInfo = reader.getHeaderInfo();

      if (headerInfo.recordCount > 100000) {
        return await this.processDBFWithStreaming(reader, filePath, filename, fileId, timer);
      } else {
        return await this.processDBFBatch(reader, filePath, filename, fileId, timer);
      }

    } catch (error) {
      const processingTime = timer.elapsed();

      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedAt: DateHelper.toDate(DateHelper.now()),
        fileId,
        statistics: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          processedRecords: 0,
          skippedRecords: 0,
          processingTime,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * ประมวลผลไฟล์ DBF แบบ streaming สำหรับไฟล์ใหญ่
   */
  private async processDBFWithStreaming(
    reader: DBFReader,
    filePath: string,
    filename: string,
    fileId: string,
    timer: any
  ): Promise<FileProcessingResult> {
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    let processedRecords = 0;
    let skippedRecords = 0;

    await reader.processRecordsWithStreaming(async (record, _index) => {
      totalRecords++;

      try {
        if (this.isValidDBFRecord(record)) {
          validRecords++;
          processedRecords++;

          await this.processDBFRecord(record);

        } else {
          invalidRecords++;
        }
      } catch (error) {
        invalidRecords++;
        skippedRecords++;
      }
    }, 1000); // Process 1000 records per batch

    const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
    await fs.copy(filePath, backupPath);

    const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
    await fs.move(filePath, processedPath);

    const processingTime = timer.elapsed();

    const result: FileProcessingResult = {
      success: true,
      message: 'ประมวลผลไฟล์ DBF สำเร็จ (Streaming Mode)',
      processedAt: DateHelper.toDate(DateHelper.now()),
      fileId,
      statistics: {
        totalRecords,
        validRecords,
        invalidRecords,
        processedRecords,
        skippedRecords,
        processingTime,
      },
    };

    return result;
  }

  /**
   * ประมวลผลไฟล์ DBF แบบ batch สำหรับไฟล์เล็ก
   */
  private async processDBFBatch(
    reader: DBFReader,
    filePath: string,
    filename: string,
    fileId: string,
    timer: any
  ): Promise<FileProcessingResult> {
    const table = {
      header: { fields: reader.getFields() },
      records: reader.parseRecords()
    };

    if (!table || !table.records) {
      throw new Error('ไม่สามารถอ่านข้อมูลจากไฟล์ DBF ได้');
    }

    const records = table.records;
    const totalRecords = records.length;
    let validRecords = 0;
    let invalidRecords = 0;
    let processedRecords = 0;
    let skippedRecords = 0;

    for (const record of records) {
      try {
        if (this.isValidDBFRecord(record)) {
          validRecords++;
          processedRecords++;

          await this.processDBFRecord(record);

        } else {
          invalidRecords++;
        }
      } catch (error) {
        invalidRecords++;
        skippedRecords++;
      }
    }

    const backupPath = path.join(config.upload.backupPath, `${fileId}_${filename}`);
    await fs.copy(filePath, backupPath);

    const processedPath = path.join(config.upload.processedPath, `${fileId}_${filename}`);
    await fs.move(filePath, processedPath);

    const processingTime = timer.elapsed();

    const result: FileProcessingResult = {
      success: true,
      message: 'ประมวลผลไฟล์ DBF สำเร็จ (Batch Mode)',
      processedAt: DateHelper.toDate(DateHelper.now()),
      fileId,
      statistics: {
        totalRecords,
        validRecords,
        invalidRecords,
        processedRecords,
        skippedRecords,
        processingTime,
      },
    };

    return result;
  }

  private isValidDBFRecord(record: any): boolean {
    return record && (
      record.HN || record.AN || record.DATE || record.DIAG
    );
  }

  private async processDBFRecord(_record: any): Promise<void> {
  }

  /**
   * ประมวลผลไฟล์ DBF และบันทึกลงฐานข้อมูล
   */
  async processDBFFileAndSaveToDatabase(
    fileId: string,
    filePath: string,
    filename: string,
    batchId?: string
  ): Promise<{ success: boolean; recordCount: number; error?: string }> {
    try {
      logInfo(`🔍 เริ่มประมวลผลไฟล์ DBF: ${filename} (ID: ${fileId})`);

      const fileExtension = path.extname(filename).toLowerCase();
      if (fileExtension !== '.dbf') {
        return {
          success: false,
          recordCount: 0,
          error: 'ไฟล์ไม่ใช่รูปแบบ DBF'
        };
      }

      const parseResult = await this.dbfService.parseDBFFile(filePath);

      logInfo(`📊 อ่านไฟล์ DBF สำเร็จ: ${parseResult.records.length} รายการ, ${parseResult.schema.length} ฟิลด์`);

      const saveResult = await this.dbfService.saveDBFRecordsToDatabase(
        batchId || fileId,
        parseResult.records,
        fileId
      );

      const savedCount = saveResult.savedCount ?? 0;
      logInfo(`✅ ประมวลผลไฟล์ DBF เสร็จสิ้น: บันทึก ${savedCount} รายการ, ข้อผิดพลาด ${saveResult.errorCount}`);

      await this.databaseService.updateUploadRecord(fileId, {
        status: FileProcessingStatus.SUCCESS,
        totalRecords: savedCount,
        metadata: JSON.stringify({
          dbfSchema: parseResult.schema,
          recordCount: savedCount,
          processedAt: new Date().toISOString(),
          fileType: 'DBF',
          fields: parseResult.schema.map((f: any) => ({ name: f.name, type: f.type, length: f.length }))
        })
      });

      return {
        success: true,
        recordCount: savedCount
      };

    } catch (error) {
      logError('Error processing DBF file and saving to database', error as Error);
      return {
        success: false,
        recordCount: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * ทำการ validation พร้อม three steps
   */
  async validateFileWithThreeSteps(
    filePath: string,
    filename: string,
    metadata: any,
    fileId: string,
    _fileRecord: any,
    _batchId?: string
  ): Promise<any> {
    let validationResult: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      recordCount: number;
    } = { isValid: false, errors: [], warnings: [], recordCount: 0 };
    let integrityValidation: { isValid: boolean; errors: any[] } = { isValid: false, errors: [] };
    let checksumValidation: { isValid: boolean; error: string; checksum: string } = { isValid: false, error: '', checksum: '' };

    try {
      const currentMetadata = metadata || {};

      logInfo(`🔍 ขั้นตอนที่ 1: ตรวจสอบ checksum ไฟล์...`);

      const validationService = new (await import('./validationService')).default();
      const checksumResult = await validationService.validateChecksum(filePath, metadata?.originalChecksum);
      checksumValidation = {
        isValid: checksumResult.isValid,
        error: checksumResult.errors.length > 0 ? checksumResult.errors[0]?.message || '' : '',
        checksum: checksumResult.errors.length > 0 ? '' : await validationService.generateChecksum(filePath)
      };

      currentMetadata.checksumCompleted = true;
      currentMetadata.checksumPassed = checksumValidation.isValid;
      currentMetadata.generatedChecksum = checksumValidation.checksum;

      if (!checksumValidation.isValid) {
        logError('Checksum validation failed', new Error(checksumValidation.error));
        return {
          isValid: false,
          errors: [checksumValidation.error],
          warnings: [],
          recordCount: 0,
          metadata: currentMetadata
        };
      }

      logInfo(`🔍 ขั้นตอนที่ 2: ตรวจสอบ integrity ไฟล์...`);

      const integrityResult = await validationService.validateFileIntegrity(filePath);
      integrityValidation = {
        isValid: integrityResult.isValid,
        errors: integrityResult.errors.map(e => e.message)
      };

      currentMetadata.integrityCompleted = true;
      currentMetadata.integrityPassed = integrityValidation.isValid;

      if (!integrityValidation.isValid) {
        logError('Integrity validation failed', new Error(integrityValidation.errors.join(', ')));
        return {
          isValid: false,
          errors: integrityValidation.errors,
          warnings: [],
          recordCount: 0,
          metadata: currentMetadata
        };
      }

      logInfo(`🔍 ขั้นตอนที่ 3: ตรวจสอบ structure และ content ไฟล์...`);

      const fileValidationResult = await validationService.validateFileByType(filePath, filename);
      validationResult = {
        isValid: fileValidationResult.isValid,
        errors: fileValidationResult.errors,
        warnings: fileValidationResult.warnings,
        recordCount: fileValidationResult.recordCount || 0
      };

      currentMetadata.structureCompleted = true;
      currentMetadata.structurePassed = validationResult.isValid;
      currentMetadata.recordCount = validationResult.recordCount || 0;

      await this.databaseService.updateUploadRecord(fileId, {
        metadata: JSON.stringify(currentMetadata)
      });

      logInfo(`✅ การตรวจสอบไฟล์เสร็จสิ้น: ${validationResult.isValid ? 'ผ่าน' : 'ไม่ผ่าน'}`);

      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        recordCount: validationResult.recordCount || 0,
        metadata: currentMetadata
      };

    } catch (error) {
      logError('Error in three-step validation', error as Error);
      return {
        isValid: false,
        errors: [(error as Error).message],
        warnings: [],
        recordCount: 0,
        metadata: metadata || {}
      };
    }
  }

}

export default FileProcessingService; 
