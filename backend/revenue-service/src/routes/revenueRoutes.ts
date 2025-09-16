// ========================================
// REVENUE ROUTES
// ========================================

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs-extra';
import archiver from 'archiver';
import { DateHelper, createTimer, createFolderFormat, createMonthYearFormat } from '@/utils/dateUtils';
import {
  FileUploadResult,
  SuccessResponse,
  BatchStatus,
  FileProcessingStatus,
} from '@/types';
import { asyncHandler } from '@/utils/errorHandler';
import { logFileUpload, logApiRequest } from '@/utils/logger';
import { apiRateLimiter, uploadRateLimiter, validationRateLimiter } from '@/middleware/rateLimitMiddleware';
import { validateUploadedFile, validateQueryParams, validateRequestBody, validateFileId, validateBatchId } from '@/middleware/validationMiddleware';
import { authenticateSession, requireUser } from '@/middleware/authMiddleware';
import { AuthenticatedRequest } from '@/types';

import config from '@/config';
import { logInfo, logError } from '@/utils/logger';

const router = Router();

// ========================================
// HELPER FUNCTIONS
// ========================================

// Helper: สร้างชื่อ batch ตามประเภทไฟล์ที่นำเข้า
const generateBatchNameByFileType = (files: Express.Multer.File[]): string => {
  // if (!files || files.length === 0) {
  //   return `Batch ${DateHelper.toISO(DateHelper.now())}`;
  // }

  console.log('files', files);

  // ตรวจสอบประเภทไฟล์หลักใน batch
  const fileTypes = new Set<string>();
  // const currentDate = DateHelper.now();
  const monthYear = createMonthYearFormat(); // YYYY-MM

  for (const file of files) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    let fileType = 'TEMP';
    
    if (fileExtension === '.dbf') {
      fileType = 'DBF';
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      if (file.originalname.toLowerCase().includes('rep')) {
        fileType = 'REP';
      } else if (file.originalname.toLowerCase().includes('statement') || file.originalname.toLowerCase().includes('stm')) {
        fileType = 'STM';
      }
    }
    
    fileTypes.add(fileType);
  }

  // สร้างชื่อ batch ตามประเภทไฟล์
  if (fileTypes.size === 1) {
    const fileType = Array.from(fileTypes)[0];
    // ถ้าเป็น DBF ให้ใช้รูปแบบ DBF_Batch_yyMMdd_hhmm (เวลาไทย)
    if (fileType === 'DBF') {
      const thNow = DateHelper.nowInThailand();
      const thaiYear = thNow.year + 543;
      const yyThai = String(thaiYear % 100).padStart(2, '0');
      const MM = thNow.toFormat('LL');
      const dd = thNow.toFormat('dd');
      const HH = thNow.toFormat('HH');
      const mm = thNow.toFormat('mm');
      const timestamp = `${yyThai}${MM}${dd}_${HH}${mm}`;
      return `DBF_Batch_${timestamp}`;
    }
    return `${fileType} Files Upload - ${monthYear}`;
  } else if (fileTypes.size > 1) {
    const fileTypesList = Array.from(fileTypes).sort().join('/');
    return `Mixed ${fileTypesList} Files Upload - ${monthYear}`;
  } else {
    return `Files Upload - ${monthYear}`;
  }
};

// Helper: ดึง IP ผู้ใช้ให้ถูกต้อง โดยพิจารณา proxy header
const getClientIp = (req: Request): string => {
  const xffRaw = (req.headers['x-forwarded-for'] ?? req.headers['X-Forwarded-For']) as unknown;
  if (typeof xffRaw === 'string') {
    const first = xffRaw.split(',')[0];
    if (first && first.length > 0) {
      return first.trim();
    }
  }
  if (Array.isArray(xffRaw)) {
    if (xffRaw.length > 0) {
      return String(xffRaw[0]);
    }
  }
  const realIpRaw = (req.headers['x-real-ip'] ?? req.headers['X-Real-IP']) as unknown;
  const realIp = typeof realIpRaw === 'string' && realIpRaw.length > 0 ? realIpRaw : undefined;
  const raw = realIp ?? req.socket?.remoteAddress ?? req.ip ?? 'unknown';
  const normalized = raw === '::1' ? '127.0.0.1' : raw;
  return normalized;
};

// Helper: คำนวณ progress percentage จาก validation steps
const calculateValidationProgress = (validationSteps: any): number => {
  if (!validationSteps) return 0;
  
  let progress = 0;
  const stepWeight = 100 / 3; // แต่ละขั้นตอนคิด 33.33%
  
  // Step 1: Checksum
  if (validationSteps.checksum?.success) {
    progress += stepWeight;
  } else if (validationSteps.checksum?.running) {
    progress += stepWeight * 0.5; // กำลังทำงานได้ครึ่งหนึ่ง
  }
  
  // Step 2: Integrity
  if (validationSteps.integrity?.success) {
    progress += stepWeight;
  } else if (validationSteps.integrity?.running) {
    progress += stepWeight * 0.5;
  }
  
  // Step 3: Structure
  if (validationSteps.structure?.success) {
    progress += stepWeight;
  } else if (validationSteps.structure?.running) {
    progress += stepWeight * 0.5;
  }
  
  return Math.round(progress);
};

// Helper: ดึงข้อมูล metadata และ original checksum
const extractMetadata = (metadataString: string | null): { originalChecksum?: string; [key: string]: any } => {
  if (!metadataString) return {};
  try {
    return JSON.parse(metadataString);
  } catch {
    return {};
  }
};

// ลบ function ที่ไม่ได้ใช้ออก

// Helper: แสดงข้อมูลไฟล์และ checksum info
const logFileInfo = async (filePath: string, filename: string, metadata: any): Promise<void> => {
  try {
    const fileStats = await fs.stat(filePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    
    let checksumInfo = '';
    if (metadata.originalChecksum) {
      checksumInfo = ` | SHA256: ${metadata.originalChecksum.substring(0, 16)}...`;
    }
    
    logInfo(`📊 ไฟล์: ${filename} (${fileSizeMB} MB${checksumInfo}) - เริ่มตรวจสอบความถูกต้อง...`);
    
    // แสดงข้อมูลเพิ่มเติมถ้าไฟล์ใหญ่
    if (fileStats.size > 50 * 1024 * 1024) { // > 50MB
      logInfo(`⚠️ ไฟล์ขนาดใหญ่ (${fileSizeMB} MB) - การตรวจสอบอาจใช้เวลานานกว่าปกติ`);
    }
  } catch (statError) {
    logInfo(`📁 ตรวจสอบไฟล์: ${filename} - เริ่มตรวจสอบความถูกต้อง...`);
  }
};

// Helper: สร้าง metadata object ที่รวมข้อมูลเดิมและใหม่
const createUpdatedMetadata = (
  originalMetadata: string | null,
  checksum?: string,
  checksumIsValid?: boolean
): string => {
  let metadata = extractMetadata(originalMetadata);
  
  // เพิ่มข้อมูล checksum ใหม่
  if (checksum) {
    metadata.verifiedChecksum = checksum;
    metadata.verificationAlgorithm = 'sha256';
    metadata.verificationTime = new Date().toISOString();
    metadata.checksumMatch = checksumIsValid;
  }
  
  return JSON.stringify(metadata);
};

// Helper: ประมวลผลไฟล์ DBF และบันทึกลงฐานข้อมูล
const processDBFFileAndSaveToDatabase = async (
  req: Request,
  fileId: string,
  filePath: string,
  filename: string
): Promise<{ success: boolean; recordCount: number; error?: string }> => {
  try {
    logInfo(`🔍 เริ่มประมวลผลไฟล์ DBF: ${filename} (ID: ${fileId})`);
    
    // ตรวจสอบว่าเป็นไฟล์ DBF หรือไม่
    const fileExtension = path.extname(filename).toLowerCase();
    if (fileExtension !== '.dbf') {
      return {
        success: false,
        recordCount: 0,
        error: 'ไฟล์ไม่ใช่รูปแบบ DBF'
      };
    }

    // อ่านและแปลงข้อมูลจากไฟล์ DBF
    const dbfService = getServices(req).dbfService;
    const parseResult = await dbfService.parseDBFFile(filePath);
    
    logInfo(`📊 อ่านไฟล์ DBF สำเร็จ: ${parseResult.records.length} รายการ, ${parseResult.schema.length} ฟิลด์`);

    // บันทึกข้อมูลลงในฐานข้อมูล
    const saveResult = await dbfService.saveDBFRecordsToDatabase(
      fileId,
      parseResult.records,
      fileId
    );

    const savedCount = saveResult.savedCount ?? 0;

    logInfo(`✅ ประมวลผลไฟล์ DBF เสร็จสิ้น: บันทึก ${savedCount} รายการ, ข้อผิดพลาด ${saveResult.errorCount}`);

    // อัปเดตสถานะไฟล์เป็น 'success' (นำเข้าเรียบร้อย) แม้มี 0 รายการ เพื่อไม่ให้ validation fail โดยไม่จำเป็น
    await getServices(req).databaseService.updateUploadRecord(fileId, {
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
};

// Helper: ทำการ validation พร้อม three steps สำหรับ validateFileWithThreeSteps
const validateFileWithThreeSteps = async (
  req: Request,
  filePath: string,
  _filename: string,
  metadata: any,
  fileId: string,
  _fileRecord: any,
  batchId?: string
): Promise<any> => {
  let validationResult: { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[]; 
    recordCount: number; 
  } = { isValid: false, errors: [], warnings: [], recordCount: 0 };
  let integrityValidation = { isValid: false, errors: [] };
  let checksumValidation = { isValid: false, error: '', checksum: '' };

  try {
    const currentMetadata = metadata || {};

    // ขั้นตอนที่ 1: ตรวจสอบ checksum
    logInfo(`🔍 ขั้นตอนที่ 1: ตรวจสอบ checksum ไฟล์...`);

    checksumValidation = await getServices(req).validationService.validateChecksum(filePath, metadata?.originalChecksum, metadata?.algorithm);
    
    // อัปเดต metadata สำหรับขั้นตอนที่ 1
    currentMetadata.checksumCompleted = true;
    currentMetadata.checksumPassed = checksumValidation.isValid;
    currentMetadata.generatedChecksum = checksumValidation.checksum;
    
    await getServices(req).databaseService.updateUploadRecord(fileId, {
      status: FileProcessingStatus.PROCESSING,
      metadata: JSON.stringify(currentMetadata),
    });

    logInfo(`✅ ขั้นตอนที่ 1 เสร็จสิ้น - Checksum: ${checksumValidation.isValid ? 'ถูกต้อง' : 'ไม่ถูกต้อง'}`);

    // ขั้นตอนที่ 2: ตรวจสอบความสมบูรณ์ของไฟล์
    logInfo(`🔍 ขั้นตอนที่ 2: ตรวจสอบความสมบูรณ์ไฟล์...`);
    
    integrityValidation = await getServices(req).validationService.validateFileIntegrity(filePath);
    
    // อัปเดต metadata สำหรับขั้นตอนที่ 2
    currentMetadata.integrityCompleted = true;
    currentMetadata.integrityPassed = integrityValidation.isValid;
    
    await getServices(req).databaseService.updateUploadRecord(fileId, {
      status: FileProcessingStatus.PROCESSING,
      metadata: JSON.stringify(currentMetadata),
    });

    logInfo(`✅ ขั้นตอนที่ 2 เสร็จสิ้น - ความสมบูรณ์: ${integrityValidation.isValid ? 'ถูกต้อง' : 'ไม่ถูกต้อง'}`);

    if (!integrityValidation.isValid) {
      logInfo(`❌ ไฟล์เสียหาย - หยุดการตรวจสอบ`);
      // อัปเดตสถานะเป็น error พร้อมข้อมูล integrity
      await getServices(req).databaseService.updateUploadRecord(fileId, {
        status: FileProcessingStatus.FAILED,
        isValid: false,
        errors: JSON.stringify(integrityValidation.errors.map((e: { message: string }) => e.message)),
      });
      return {
        validationResult,
        integrityValidation,
        checksumValidation,
        combinedErrors: integrityValidation.errors.map((e: { message: string }) => e.message),
        combinedWarnings: [],
        isValid: false
      };
    }

    // ขั้นตอนที่ 3: ตรวจสอบโครงสร้างไฟล์และประมวลผล DBF (ถ้าเป็นไฟล์ DBF)
    logInfo(`🔍 ขั้นตอนที่ 3: ตรวจสอบโครงสร้างไฟล์และประมวลผล DBF...`);
    
    const fileExtension = path.extname(_filename).toLowerCase();
    let structureValidation = { isValid: true, errors: [] as string[], warnings: [] as string[], recordCount: 0 };
    
    if (fileExtension === '.dbf') {
      try {
        logInfo(`📊 ไฟล์เป็น DBF - เริ่มประมวลผลและบันทึกลงฐานข้อมูล...`);
        
        // ประมวลผลไฟล์ DBF และบันทึกลงฐานข้อมูล
        const dbfResult = await processDBFFileAndSaveToDatabase(req, fileId, filePath, _filename);
        
        if (dbfResult.success) {
          structureValidation = {
            isValid: true,
            errors: [],
            warnings: [`ประมวลผล DBF สำเร็จ: บันทึก ${dbfResult.recordCount} รายการลงในฐานข้อมูล`],
            recordCount: dbfResult.recordCount
          };
          
          currentMetadata.structureCompleted = true;
          currentMetadata.structurePassed = true;
          currentMetadata.structureSkipped = false;
          currentMetadata.structureRecordCount = dbfResult.recordCount;
          currentMetadata.dbfProcessed = true;
          currentMetadata.dbfRecordCount = dbfResult.recordCount;
          
          logInfo(`✅ ประมวลผล DBF สำเร็จ: บันทึก ${dbfResult.recordCount} รายการลงในฐานข้อมูล`);
          
          // อัปเดต UploadRecord status เป็น "success" เมื่อประมวลผล DBF สำเร็จ
          await getServices(req).databaseService.updateUploadRecord(fileId, {
            status: FileProcessingStatus.SUCCESS, // เปลี่ยนจาก processing เป็น success เพื่อให้นับเป็น successFiles
            processedAt: new Date(),
            totalRecords: dbfResult.recordCount,
            validRecords: dbfResult.recordCount,
            processedRecords: dbfResult.recordCount,
            metadata: JSON.stringify(currentMetadata)
          });
          
          logInfo(`✅ อัปเดต UploadRecord status เป็น success สำหรับไฟล์ ${_filename}`);
          
          // อัปเดต batch statistics หลังจากประมวลผล DBF สำเร็จ (ถ้ามี batchId)
          if (batchId) {
            try {
              await getServices(req).batchService.updateBatchSuccessFiles(batchId);
              logInfo(`📊 อัปเดต batch statistics หลังประมวลผล DBF: batch ${batchId}`);
            } catch (batchUpdateError) {
              logError('Failed to update batch statistics after DBF processing in 3-step validation', batchUpdateError as Error, { 
                batchId,
                fileId 
              });
              // ไม่ throw error เพราะการอัปเดต batch stats ไม่ใช่ critical
            }
          }
        } else {
          structureValidation = {
            isValid: false,
            errors: [dbfResult.error || 'ไม่สามารถประมวลผลไฟล์ DBF ได้'],
            warnings: [],
            recordCount: 0
          };
          
          currentMetadata.structureCompleted = true;
          currentMetadata.structurePassed = false;
          currentMetadata.structureSkipped = false;
          currentMetadata.structureRecordCount = 0;
          currentMetadata.dbfProcessed = false;
          currentMetadata.dbfError = dbfResult.error;
          
          // อัปเดต UploadRecord status เป็น "failed" เมื่อประมวลผล DBF ไม่สำเร็จ
          await getServices(req).databaseService.updateUploadRecord(fileId, {
            status: FileProcessingStatus.FAILED, // เปลี่ยนจาก processing เป็น failed เพื่อให้นับเป็น errorFiles
            processedAt: new Date(),
            errorMessage: dbfResult.error || 'ไม่สามารถประมวลผลไฟล์ DBF ได้',
            errors: JSON.stringify([dbfResult.error || 'ไม่สามารถประมวลผลไฟล์ DBF ได้']),
            metadata: JSON.stringify(currentMetadata)
          });
          
          logError(`❌ ประมวลผล DBF ล้มเหลว: ${dbfResult.error}`);
          
          // อัปเดต batch statistics หลังจากประมวลผล DBF ล้มเหลว (ถ้ามี batchId)
          if (batchId) {
            try {
              await getServices(req).batchService.updateBatchSuccessFiles(batchId);
              logInfo(`📊 อัปเดต batch statistics หลังประมวลผล DBF ล้มเหลว: batch ${batchId}`);
            } catch (batchUpdateError) {
              logError('Failed to update batch statistics after DBF processing failure in 3-step validation', batchUpdateError as Error, { 
                batchId,
                fileId 
              });
            }
          }
        }
      } catch (dbfError) {
        logError('Error during DBF processing', dbfError as Error);
        
        structureValidation = {
          isValid: false,
          errors: [`เกิดข้อผิดพลาดในการประมวลผล DBF: ${(dbfError as Error).message}`],
          warnings: [],
          recordCount: 0
        };
        
        currentMetadata.structureCompleted = true;
        currentMetadata.structurePassed = false;
        currentMetadata.structureSkipped = false;
        currentMetadata.structureRecordCount = 0;
        currentMetadata.dbfProcessed = false;
        currentMetadata.dbfError = (dbfError as Error).message;
        
        // อัปเดต UploadRecord status เป็น "failed" เมื่อเกิด exception ในการประมวลผล DBF
        await getServices(req).databaseService.updateUploadRecord(fileId, {
          status: FileProcessingStatus.FAILED, // เปลี่ยนจาก processing เป็น failed เพื่อให้นับเป็น errorFiles
          processedAt: new Date(),
          errorMessage: `เกิดข้อผิดพลาดในการประมวลผล DBF: ${(dbfError as Error).message}`,
          errors: JSON.stringify([`เกิดข้อผิดพลาดในการประมวลผล DBF: ${(dbfError as Error).message}`]),
          metadata: JSON.stringify(currentMetadata)
        });
        
        // อัปเดต batch statistics หลังจากเกิด exception ในการประมวลผล DBF (ถ้ามี batchId)
        if (batchId) {
          try {
            await getServices(req).fileValidationService.updateBatchSuccessFiles(batchId);
            logInfo(`📊 อัปเดต batch statistics หลังเกิด exception ในการประมวลผล DBF: batch ${batchId}`);
          } catch (batchUpdateError) {
            logError('Failed to update batch statistics after DBF processing exception in 3-step validation', batchUpdateError as Error, { 
              batchId,
              fileId 
            });
          }
        }
      }
    } else {
      // ไม่ใช่ไฟล์ DBF - ข้ามการตรวจสอบโครงสร้าง
      logInfo(`⏭️ ไฟล์ไม่ใช่ DBF - ข้ามการตรวจสอบโครงสร้างไฟล์ไว้ก่อน`);
      
      structureValidation = { 
        isValid: true, 
        errors: [] as string[], 
        warnings: ['ข้ามการตรวจสอบโครงสร้างไฟล์ไว้ก่อน (ไม่ใช่ไฟล์ DBF)'] as string[], 
        recordCount: 0 
      };
      
      currentMetadata.structureCompleted = true;
      currentMetadata.structurePassed = true;
      currentMetadata.structureSkipped = true;
      currentMetadata.structureRecordCount = 0;
      
      // อัปเดต UploadRecord status เป็น "validation_completed" สำหรับไฟล์ที่ไม่ใช่ DBF
      await getServices(req).databaseService.updateUploadRecord(fileId, {
        status: FileProcessingStatus.VALIDATION_COMPLETED, // เปลี่ยนจาก processing เป็น validation_completed เพื่อให้นับเป็น successFiles
        processedAt: new Date(),
        metadata: JSON.stringify(currentMetadata)
      });
      
      logInfo(`✅ อัปเดต UploadRecord status เป็น validation_completed สำหรับไฟล์ ${_filename} (ไม่ใช่ DBF)`);
      
      // อัปเดต batch statistics สำหรับไฟล์ที่ไม่ใช่ DBF (ถ้ามี batchId)
      if (batchId) {
        try {
          await getServices(req).fileValidationService.updateBatchSuccessFiles(batchId);
          logInfo(`📊 อัปเดต batch statistics สำหรับไฟล์ที่ไม่ใช่ DBF: batch ${batchId}`);
        } catch (batchUpdateError) {
          logError('Failed to update batch statistics for non-DBF file in 3-step validation', batchUpdateError as Error, { 
            batchId,
            fileId 
          });
        }
      }
    }
    
    // Status และ metadata ได้อัปเดตไปแล้วในแต่ละกรณี (DBF สำเร็จ/ล้มเหลว หรือ non-DBF)
    // ไม่จำเป็นต้องอัปเดตซ้ำ
    
    logInfo(`✅ ขั้นตอนที่ 3 เสร็จสิ้น`);
    
    // อัปเดต validationResult ด้วยผลลัพธ์จากโครงสร้าง
    validationResult = structureValidation;

    // Force garbage collection หลังจาก validation
    if (global.gc) {
      global.gc();
      logInfo(`🧹 ทำความสะอาด memory หลัง validation`);
    }

  } catch (error) {
    logError('Error during validation process', error as Error);
    // อัปเดตสถานะเป็น error ในกรณีเกิด exception
    await getServices(req).databaseService.updateUploadRecord(fileId, {
      status: FileProcessingStatus.FAILED,
      isValid: false,
      errors: JSON.stringify(['เกิดข้อผิดพลาดในกระบวนการตรวจสอบ']),
      errorMessage: 'เกิดข้อผิดพลาดในกระบวนการตรวจสอบ',
      processedAt: new Date()
    });
    
    // อัปเดต batch statistics หลังจากเกิด exception (ถ้ามี batchId)
    if (batchId) {
      try {
        await getServices(req).fileValidationService.updateBatchSuccessFiles(batchId);
        logInfo(`📊 อัปเดต batch statistics หลังเกิด exception: batch ${batchId}`);
      } catch (batchUpdateError) {
        logError('Failed to update batch statistics after validation exception', batchUpdateError as Error, { 
          batchId,
          fileId 
        });
      }
    }
    return {
      validationResult: { isValid: false, errors: ['Validation process failed'], warnings: [], recordCount: 0 },
      integrityValidation: { isValid: false, errors: [{ message: 'Process error' }] },
      checksumValidation: { isValid: false, error: 'Process error' },
      combinedErrors: ['เกิดข้อผิดพลาดในกระบวนการตรวจสอบ'],
      combinedWarnings: [],
      isValid: false
    };
  }

  // รวม errors/warnings จากสามแหล่ง
  const combinedErrors = [
    ...validationResult.errors,
    ...(integrityValidation.isValid ? [] : integrityValidation.errors.map((e: { message: string }) => e.message)),
    ...(checksumValidation.isValid ? [] : [checksumValidation.error]),
  ].filter(error => error && error.trim() !== '');
  
  const combinedWarnings = [
    ...validationResult.warnings,
    ...(checksumValidation.error && checksumValidation.isValid ? [checksumValidation.error] : []),
  ].filter(warning => warning && warning.trim() !== '');

  // ตรวจสอบความถูกต้องของข้อมูล
  const isValid = validationResult.isValid && integrityValidation.isValid && checksumValidation.isValid;

  // Log ผลลัพธ์การตรวจสอบแต่ละขั้นตอน
  logInfo(`📋 สรุปผลการตรวจสอบ:`);
  logInfo(`  - Checksum: ${checksumValidation.isValid ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}`);
  logInfo(`  - ความสมบูรณ์: ${integrityValidation.isValid ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}`);
  logInfo(`  - โครงสร้างไฟล์: ${validationResult.isValid ? '✅ ผ่าน' : '❌ ไม่ผ่าน'} (ข้าม)`);
  logInfo(`  - ผลลัพธ์รวม: ${isValid ? '✅ ไฟล์ถูกต้อง' : '❌ ไฟล์มีปัญหา'}`);

  return {
    validationResult,
    integrityValidation,
    checksumValidation,
    combinedErrors,
    combinedWarnings,
    isValid
  };
};

// ลบโค้ดที่เหลือจาก function เดิม ที่หายไป:
const performFullValidation = validateFileWithThreeSteps;

// Helper: สร้าง validation response
const createValidationResponse = (
  validation: any,
  checksum: string | undefined,
  filePath: string,
  fileRecord: any,
  isValidFile: boolean
): SuccessResponse => {
  const { validationResult, integrityValidation, checksumValidation, combinedErrors, combinedWarnings } = validation;
  const metadata = extractMetadata(fileRecord.metadata);

  return {
    success: true,
    data: {
      isValid: isValidFile,
      validation: {
        ...validationResult,
        steps: {
          structure: {
            passed: validationResult.isValid,
            errors: validationResult.errors || [],
            warnings: validationResult.warnings || [],
            skipped: false,
            completed: true,
            recordCount: validationResult.recordCount || 0
          },
          integrity: {
            passed: integrityValidation.isValid,
            errors: integrityValidation.isValid ? [] : integrityValidation.errors.map((e: any) => e.message),
            completed: true
          },
          checksum: {
            passed: checksumValidation.isValid,
            error: checksumValidation.error || null,
            generated: checksum,
            original: metadata.originalChecksum || null,
            completed: true
          }
        }
      },
      errors: combinedErrors,
      warnings: combinedWarnings,
      checksum,
      fileSize: (() => {
        try {
          return fs.statSync(filePath).size;
        } catch {
          return 0;
        }
      })(),
    },
    message: isValidFile ? 'ไฟล์ผ่านการตรวจสอบทุกขั้นตอน' : 'ไฟล์ไม่ผ่านการตรวจสอบ',
    timestamp: DateHelper.toDate(DateHelper.now()),
  };
};


// ใช้ services ที่แชร์จาก index.ts
const getServices = (req: Request) => {
  return req.app.locals.services;
};

// สร้าง multer storage สำหรับโครงสร้างใหม่
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // กำหนด destination ตามประเภทไฟล์
    // const date = DateHelper.now();
    const dateStr = createFolderFormat(); // yyyyMMdd
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // รับ batchId จาก request body หรือ query
    const batchId = req.body.batchId || req.query.batchId;
    
    let basePath: string;
    if (fileExtension === '.dbf') {
      basePath = config.upload.dbfPath!;
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      if (file.originalname.toLowerCase().includes('rep')) {
        basePath = config.upload.repPath!;
      } else if (file.originalname.toLowerCase().includes('statement') || file.originalname.toLowerCase().includes('stm')) {
        basePath = config.upload.stmPath!;
      } else {
        basePath = config.upload.tempPath!;
      }
    } else {
      basePath = config.upload.tempPath!;
    }
    
    // สร้าง path ตามโครงสร้าง: basePath/dateStr/batchId/
    let uploadPath: string;
    if (batchId) {
      uploadPath = path.join(basePath, dateStr as string, batchId as string);
    } else {
      uploadPath = path.join(basePath, dateStr as string);
    }
    
    // สร้าง directory อัตโนมัติ
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    // ใช้ชื่อไฟล์เดิม แต่เพิ่ม timestamp เพื่อป้องกันการซ้ำ
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const newFilename = `${baseName}_${timestamp}${fileExtension}`;
    cb(null, newFilename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(config.upload.maxFileSize.replace('mb', '')) * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024, // 10MB สำหรับ field size
    files: 1, // อนุญาตให้อัปโหลดไฟล์เดียว
    fields: 10, // อนุญาตให้มี fields ได้ 10 ตัว
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = config.upload.allowedFileTypes;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`ประเภทไฟล์ไม่ถูกต้อง (${allowedTypes.join(', ')})`));
    }
  },
});

// ========================================
// BATCH MANAGEMENT ENDPOINTS
// ========================================

// GET /api/revenue/batches - ดึงรายการ batches
router.get('/batches',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { page = '1', limit = '20', status, userId, startDate, endDate } = req.query;

    try {
      const params: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (status) params.status = status as BatchStatus;
      if (userId) params.userId = userId as string;
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));

      const result = await getServices(req).batchService.getBatches(params);

      const response: SuccessResponse = {
        success: true,
        data: result,
        message: 'ดึงรายการ batches สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/batches', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/batches', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการ batches',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// POST /api/revenue/batches - สร้าง batch ใหม่
router.post('/batches',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateRequestBody,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { batchName, userId, ipAddress, userAgent } = req.body;

    try {
      const batch = await getServices(req).batchService.createBatch({
        batchName: batchName || (() => {
          const thNow = DateHelper.nowInThailand();
          const thaiYear = thNow.year + 543;
          const yyThai = String(thaiYear % 100).padStart(2, '0');
          const MM = thNow.toFormat('LL');
          const dd = thNow.toFormat('dd');
          const HH = thNow.toFormat('HH');
          const mm = thNow.toFormat('mm');
          const timestamp = `${yyThai}${MM}${dd}_${HH}${mm}`;
          return `DBF_Batch_${timestamp}`;
        })(),
        userId: userId || (req.ip || 'unknown'),
        ipAddress: ipAddress || (req.ip || 'unknown'),
        userAgent: userAgent || (req.get('User-Agent') || 'unknown'),
      });

      const response: SuccessResponse = {
        success: true,
        data: batch,
        message: 'สร้าง batch สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', '/batches', 200, responseTime);

      return res.status(201).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', '/batches', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้าง batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/batches/:id - ดึงข้อมูล batch
router.get('/batches/:id',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const response: SuccessResponse = {
        success: true,
        data: batch,
        message: 'ดึงข้อมูล batch สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/batches/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/batches/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// DELETE /api/revenue/batches/:id - ลบ batch
router.delete('/batches/:id',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ลบ batch และไฟล์ที่เกี่ยวข้อง
      await getServices(req).batchService.deleteBatch(id!);

      const response: SuccessResponse = {
        success: true,
        data: { id },
        message: 'ลบ batch สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('DELETE', `/batches/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('DELETE', `/batches/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบ batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/batches/:id/files - ดึงไฟล์ใน batch
router.get('/batches/:id/files',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateBatchId,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;
    const { page = '1', limit = '20', status, fileType } = req.query;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const params: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (fileType) params.fileType = fileType;
      if (status) params.status = status;

      const result = await getServices(req).batchService.getBatchFiles(id!, params);

      const response: SuccessResponse = {
        success: true,
        data: result,
        message: 'ดึงไฟล์ใน batch สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/batches/${id!}/files`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/batches/${id!}/files`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงไฟล์ใน batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// POST /api/revenue/batches/:id/process - ประมวลผล batch
router.post('/batches/:id/process',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ประมวลผล batch
      const processingResult = await getServices(req).batchService.processBatch(id!);

      const response: SuccessResponse = {
        success: true,
        data: processingResult,
        message: `ประมวลผล batch สำเร็จ (${processingResult.processedFiles}/${processingResult.totalFiles} ไฟล์)`,
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', `/batches/${id!}/process`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', `/batches/${id!}/process`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผล batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// HEALTH CHECK
// ========================================

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const timer = createTimer();

  try {
    logInfo('🏥 กำลังตรวจสอบสถานะ health check...');

    // ตรวจสอบ file system directories
    const fileSystemChecks = await Promise.allSettled([
      fs.pathExists(config.upload.uploadPath),
      fs.pathExists(config.upload.processedPath),
      fs.pathExists(config.upload.backupPath),
      fs.pathExists(config.upload.tempPath),
      fs.pathExists(config.upload.exportPath),
      fs.pathExists(config.upload.dbfPath),
      fs.pathExists(config.upload.repPath),
      fs.pathExists(config.upload.stmPath),
    ]);

    const [uploadDir, processedDir, backupDir, tempDir, exportDir, dbfDir, repDir, stmDir] = fileSystemChecks.map(
      result => result.status === 'fulfilled' ? result.value : false
    );

    // ตรวจสอบ services availability
    let servicesStatus = {};
    try {
      const services = getServices(req);
      servicesStatus = {
        databaseService: !!services.databaseService,
        validationService: !!services.validationService,
        fileProcessingService: !!services.fileProcessingService,
        fileStorageService: !!services.fileStorageService,
        batchService: !!services.batchService,
        statisticsService: !!services.statisticsService,
        dbfService: !!services.dbfService,
      };
    } catch (error) {
      logError('Error checking services status', error as Error);
      servicesStatus = { error: 'Services not available' };
    }

    // ตรวจสอบ database connectivity (ถ้าเป็น service ที่มี database)
    let databaseStatus = {
      status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
      message: 'Database status unknown',
      error: null as string | null,
      lastCheck: new Date(),
    };
    try {
      // อ่านสถิติเบื้องต้นเพื่อทดสอบการเชื่อมต่อ database
      await getServices(req).statisticsService.getOverviewStatistics({ 
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 ชั่วโมงที่แล้ว
        endDate: new Date()
      });
      databaseStatus.status = 'healthy';
      databaseStatus.message = 'Database connection successful';
    } catch (error) {
      databaseStatus.status = 'unhealthy';
      databaseStatus.message = (error as Error).message;
      databaseStatus.error = (error as Error).message;
      logError('Database health check failed', error as Error);
    }

    // ตรวจสอบ memory usage และ performance
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // คำนวณ CPU load (approximate)
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // ตรวจสอบ disk space สำหรับ directories หลัก
    let diskSpace = {};
    try {
      if (uploadDir) {
        // ลบ variable ที่ไม่ได้ใช้ออก
        diskSpace = { uploadPath: 'accessible' };
      }
    } catch (error) {
      diskSpace = { error: 'Cannot access disk' };
    }

    // กำหนดสถานะรวม
    const allDirectoriesExist = uploadDir && processedDir && backupDir && tempDir && exportDir && dbfDir && repDir && stmDir;
    const allServicesAvailable = Object.values(servicesStatus).every(status => status === true);
    const memoryHealthy = memoryUsageMB.heapUsed < 500; // น้อยกว่า 500MB
    
    const isHealthy = allDirectoriesExist && allServicesAvailable && databaseStatus.status === 'healthy' && memoryHealthy;
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

    const response: SuccessResponse = {
      success: true,
      data: {
        status: overallStatus,
        service: 'Revenue Service',
        version: '1.0.0',
        timestamp: DateHelper.toDate(DateHelper.now()),
        uptime: Math.round(uptime),
        environment: process.env.NODE_ENV || 'development',
        
        // System metrics
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuUsage: {
            user: Math.round(cpuUsage.user / 1000), // microseconds to milliseconds
            system: Math.round(cpuUsage.system / 1000),
          },
          memoryUsage: memoryUsageMB,
          memoryHealthy,
        },

        // File system status
        fileSystem: {
          uploadDirectory: uploadDir,
          processedDirectory: processedDir,
          backupDirectory: backupDir,
          tempDirectory: tempDir,
          exportDirectory: exportDir,
          dbfDirectory: dbfDir,
          repDirectory: repDir,
          stmDirectory: stmDir,
          allDirectoriesHealthy: allDirectoriesExist,
          diskSpace,
        },

        // Services status
        services: {
          ...servicesStatus,
          allServicesHealthy: allServicesAvailable,
        },

        // Database status
        database: databaseStatus,

        // Configuration check
        configuration: {
          uploadPath: config.upload.uploadPath,
          maxFileSize: config.upload.maxFileSize,
          allowedFileTypes: config.upload.allowedFileTypes,
          port: config.server.port,
        },

        // Health checks summary
        healthChecks: {
          fileSystem: allDirectoriesExist ? 'PASS' : 'FAIL',
          services: allServicesAvailable ? 'PASS' : 'FAIL',
          database: databaseStatus.status === 'healthy' ? 'PASS' : 'FAIL',
          memory: memoryHealthy ? 'PASS' : 'WARN',
          overall: isHealthy ? 'PASS' : 'FAIL',
        },
      },
      message: `Service is ${overallStatus}`,
      timestamp: DateHelper.toDate(DateHelper.now()),
    };

    const responseTime = timer.elapsed();
    logApiRequest('GET', '/health', 200, responseTime);
    logInfo(`🏥 Health check เสร็จสิ้น: ${overallStatus} (${responseTime.toFixed(2)}ms)`);

    return res.status(200).json(response);

  } catch (error) {
    const responseTime = timer.elapsed();
    logApiRequest('GET', '/health', 500, responseTime);
    logError('Health check failed', error as Error);

    return res.status(500).json({
      success: false,
      data: {
        status: 'error',
        service: 'Revenue Service',
        error: (error as Error).message,
        timestamp: DateHelper.toDate(DateHelper.now()),
      },
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
      timestamp: DateHelper.toDate(DateHelper.now()),
    });
  }
}));

// ========================================
// FILE UPLOAD ENDPOINTS
// ========================================

// POST /api/revenue/upload - อัปโหลดไฟล์พร้อม batch support
router.post('/upload',
  uploadRateLimiter,
  authenticateSession,
  requireUser,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // จัดการ multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'ขนาดไฟล์ใหญ่เกินไป',
            timestamp: DateHelper.toDate(DateHelper.now()),
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'จำนวนไฟล์เกินขีดจำกัด',
            timestamp: DateHelper.toDate(DateHelper.now()),
          });
        } else if (err.code === 'LIMIT_FIELD_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'จำนวน fields เกินขีดจำกัด',
            timestamp: DateHelper.toDate(DateHelper.now()),
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `ข้อผิดพลาดในการอัปโหลด: ${err.message}`,
            timestamp: DateHelper.toDate(DateHelper.now()),
          });
        }
      } else if (err) {
        // จัดการ errors อื่นๆ
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }
      return next();
    });
  },
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const { originalname, size, path: savedPath, filename } = req.file; // ไฟล์ถูกบันทึกโดย multer แล้ว
      const batchIdFromReq = (req.body?.batchId as string) || (req.query?.batchId as string) || undefined;
      const checksumFromReq = (req.body?.checksum as string) || undefined;

      // ระบุประเภทไฟล์สำหรับจัดเก็บในฐานข้อมูล
      const ext = path.extname(originalname).toLowerCase();
      let fileTypeForDb = 'TEMP';
      if (ext === '.dbf') fileTypeForDb = 'DBF';
      else if (ext === '.xls' || ext === '.xlsx') {
        if (originalname.toLowerCase().includes('rep')) fileTypeForDb = 'REP';
        else if (originalname.toLowerCase().includes('statement') || originalname.toLowerCase().includes('stm')) fileTypeForDb = 'STM';
      }

      // สร้าง UploadRecord ในฐานข้อมูล (สถานะยังเป็น pending)
      const authReq = req as AuthenticatedRequest;
      const clientIp = getClientIp(req);

      const record = await getServices(req).databaseService.createUploadRecord({
        filename: filename || originalname,
        originalName: originalname,
        fileType: fileTypeForDb,
        fileSize: size,
        filePath: savedPath,
        status: FileProcessingStatus.PENDING,
        batchId: batchIdFromReq,
        userId: authReq.userId || undefined,
        ipAddress: clientIp,
        userAgent: (req.get('User-Agent') || 'unknown'),
        isValid: null,
        errors: null,
        warnings: null,
        totalRecords: 0,
        metadata: checksumFromReq ? JSON.stringify({ 
          originalChecksum: checksumFromReq,
          algorithm: 'sha256',
          source: 'frontend'
        }) : null,
        validRecords: null,
        invalidRecords: null,
        processedRecords: null,
        skippedRecords: null,
        processingTime: null,
        errorMessage: null,
      });

      // อัปเดตตัวนับของ Batch แบบเพิ่มขึ้น (ถ้ามี batchId)
      if (batchIdFromReq) {
        try {
          const existingBatch = await getServices(req).batchService.getBatch(batchIdFromReq);
          if (existingBatch) {
            await getServices(req).batchService.updateBatch(batchIdFromReq, {
              totalFiles: (existingBatch.totalFiles || 0) + 1,
              totalSize: (existingBatch.totalSize || 0) + size,
              status: BatchStatus.PROCESSING,
              // บันทึก user/ip ที่อัปเดต batch ครั้งล่าสุดให้เห็นในรายงาน
              // หมายเหตุ: ฟิลด์เหล่านี้มีใน schema และ optional
              ...(authReq.userId ? { userId: authReq.userId } : {}),
              ...(clientIp ? { ipAddress: clientIp } : {}),
            });
          }
        } catch (err) {
          // ไม่ต้อง fail การอัปโหลดถ้าอัปเดต batch ไม่สำเร็จ แค่ log ไว้
          logError('Failed to update batch counters after single upload', err as Error, { batchId: batchIdFromReq });
        }
      }

      const fileId = record.id;

      const response: SuccessResponse<FileUploadResult> = {
        success: true,
        data: {
          success: true,
          message: 'อัปโหลดไฟล์สำเร็จ (สร้างรายการบันทึกแล้ว)',
          filename: originalname,
          fileId,
          fileSize: size,
          uploadDate: DateHelper.toDate(DateHelper.now()),
          errors: [],
        },
        message: 'อัปโหลดไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
        requestId: fileId,
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', '/upload', 200, responseTime);
      logFileUpload(originalname, size, path.extname(originalname).replace('.', '') || 'file');

      return res.status(200).json({
        ...response,
        data: {
          ...response.data!,
          batchId: batchIdFromReq,
          savedPath,
        },
      });

    } catch (error) {
      console.error('Upload error:', error);
      const responseTime = timer.elapsed();
      logApiRequest('POST', '/upload', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// POST /api/revenue/upload/batch - อัปโหลดหลายไฟล์เป็น batch
router.post('/upload/batch',
  uploadRateLimiter,
  authenticateSession,
  requireUser,
  upload.array('files', 20), // สูงสุด 20 ไฟล์
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();

    try {
      const files = req.files as Express.Multer.File[];
      const { batchName } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // สร้าง batch ใหม่ด้วยชื่อตามประเภทไฟล์
      const batch = await getServices(req).batchService.createBatch({
        batchName: batchName || generateBatchNameByFileType(files),
        userId: (req.ip || 'unknown'),
        ipAddress: (req.ip || 'unknown'),
        userAgent: (req.get('User-Agent') || 'unknown'),
      });

      // ตรวจสอบ batch security
      const batchSecurityValidation = await getServices(req).validationService.validateBatchSecurity(batch.id, files);
      if (!batchSecurityValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Batch ไม่ปลอดภัย',
          errors: batchSecurityValidation.errors.map((e: any) => e.message),
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const results = [];
      let successCount = 0; // จำนวนไฟล์ที่อัปโหลดสำเร็จและผ่านการตรวจสอบเบื้องต้น
      let errorCount = 0;   // จำนวนไฟล์ที่อัปโหลดไม่สำเร็จ/ไม่ปลอดภัย/ไม่สมบูรณ์/ไม่ผ่านตรวจสอบ
      let totalSize = 0;
      let totalRecords = 0;

      // ประมวลผลไฟล์แต่ละไฟล์
      for (const file of files) {
        try {
          const { originalname, size, buffer } = file;

          // ตรวจสอบประเภทไฟล์
          const fileExtension = path.extname(originalname).toLowerCase();
          let fileType = 'temp';
          
          if (fileExtension === '.dbf') {
            fileType = 'dbf';
          } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
            if (originalname.toLowerCase().includes('rep')) {
              fileType = 'rep';
            } else if (originalname.toLowerCase().includes('statement') || originalname.toLowerCase().includes('stm')) {
              fileType = 'stm';
            }
          }

          // บันทึกไฟล์ด้วย FileStorageService
          const storageResult = await getServices(req).fileStorageService.saveFileInBatch(
            fileType as any,
            originalname,
            buffer,
            batch.id,
            DateHelper.toDate(DateHelper.now())
          );

          if (!storageResult.success) {
            errorCount++;
            results.push({
              filename: originalname,
              success: false,
              message: 'เกิดข้อผิดพลาดในการบันทึกไฟล์',
              errors: [storageResult.error || 'Unknown error'],
            });
            continue;
          }

          // ตรวจสอบไฟล์
          const validationResult = await getServices(req).validationService.validateFileByType(storageResult.filePath, originalname);

          // เพิ่มการตรวจสอบด้วย ValidationService
          const securityValidation = await getServices(req).validationService.validateFileSecurity(file);
          if (!securityValidation.isValid) {
            // ลบไฟล์ที่ไม่ปลอดภัย
            await fs.remove(storageResult.filePath);
            errorCount++;

            results.push({
              filename: originalname,
              success: false,
              message: 'ไฟล์ไม่ปลอดภัย',
              errors: securityValidation.errors.map((e: any) => e.message),
            });
            continue;
          }

          // ตรวจสอบ file integrity
          const integrityValidation = await getServices(req).validationService.validateFileIntegrity(storageResult.filePath);
          if (!integrityValidation.isValid) {
            // ลบไฟล์ที่ไม่สมบูรณ์
            await fs.remove(storageResult.filePath);
            errorCount++;

            results.push({
              filename: originalname,
              success: false,
              message: 'ไฟล์ไม่สมบูรณ์',
              errors: integrityValidation.errors.map((e: any) => e.message),
            });
            continue;
          }



          if (!validationResult.isValid) {
            // ลบไฟล์ที่ไม่ผ่านการตรวจสอบ
            await fs.remove(storageResult.filePath);
            errorCount++;

            results.push({
              filename: originalname,
              success: false,
              message: 'ไฟล์ไม่ผ่านการตรวจสอบ',
              errors: validationResult.errors,
            });
            continue;
          }

          // สร้าง upload record
          const record = await getServices(req).databaseService.createUploadRecord({
            filename: originalname,
            originalName: originalname,
            fileType: validationResult.fileType.toUpperCase(),
            fileSize: size,
            filePath: storageResult.filePath,
            status: FileProcessingStatus.PENDING,
            batchId: batch.id,
            userId: (req.ip || 'unknown'),
            ipAddress: (req.ip || 'unknown'),
            userAgent: (req.get('User-Agent') || 'unknown'),
            isValid: validationResult.isValid,
            errors: validationResult.errors.length > 0 ? JSON.stringify(validationResult.errors) : null,
            warnings: validationResult.warnings.length > 0 ? JSON.stringify(validationResult.warnings) : null,
            totalRecords: validationResult.recordCount || 0,
          });

          // พักการประมวลผลไว้ก่อน ให้สถานะไฟล์เป็น PENDING และรอตรวจสอบความครบถ้วนของชุดไฟล์
          successCount++;
          totalSize += size;
          totalRecords += validationResult.recordCount || 0;

          results.push({
            filename: originalname,
            success: true,
            message: 'อัปโหลดสำเร็จ (รอการตรวจสอบ/ประมวลผล)',
            fileId: record.id,
            fileSize: size,
            errors: [],
          });

        } catch (error) {
          errorCount++;
          results.push({
            filename: file.originalname,
            success: false,
            message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์',
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          });
        }
      }

      // อัปเดตสถานะ batch เป็นกำลังดำเนินการ และบันทึกยอดรวมจากการอัปโหลด (ยังไม่ประมวลผล)
      await getServices(req).batchService.updateBatch(batch.id, {
        totalFiles: successCount + errorCount,
        successFiles: 0, // ยังไม่ประมวลผล
        errorFiles: errorCount, // นับเฉพาะไฟล์ที่อัปโหลดไม่ผ่าน/ไม่ปลอดภัย/ไม่สมบูรณ์
        processingFiles: successCount, // ไฟล์ที่รอการ validation
        totalRecords,
        totalSize,
        status: successCount > 0 && errorCount === 0
          ? BatchStatus.PROCESSING
          : successCount > 0 && errorCount > 0
            ? BatchStatus.PARTIAL
            : BatchStatus.ERROR,
      });

      const response: SuccessResponse = {
        success: true,
        data: {
          batchId: batch.id,
          batchName: batch.batchName,
          totalFiles: files.length,
          successFiles: successCount,
          errorFiles: errorCount,
          results,
          totalSize,
          totalRecords,
          processingTime: timer.elapsed(),
          status: errorCount === 0 ? BatchStatus.PROCESSING : successCount === 0 ? BatchStatus.ERROR : BatchStatus.PARTIAL,
        },
        message: `อัปโหลด batch สำเร็จ (รอการตรวจสอบ/ประมวลผล) — อัปโหลดสำเร็จ ${successCount}/${files.length} ไฟล์`,
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', '/upload/batch', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', '/upload/batch', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลด batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// FILE VALIDATION
// ========================================

router.post('/validate',
  validationRateLimiter,
  upload.single('file'),
  validateUploadedFile,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const { originalname, path: filePath } = req.file;

      // ตรวจสอบไฟล์
      const validationResult = await getServices(req).validationService.validateFileByType(filePath, originalname);

      // ลบไฟล์หลังจากตรวจสอบ
      await fs.remove(filePath);

      const response: SuccessResponse = {
        success: true,
        data: validationResult,
        message: validationResult.isValid ? 'ไฟล์ผ่านการตรวจสอบ' : 'ไฟล์ไม่ผ่านการตรวจสอบ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', '/validate', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', '/validate', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// FILE PROCESSING
// ========================================

// POST /api/revenue/files/:id/validate - ตรวจสอบไฟล์ที่อัปโหลดไว้ตาม ID (validate only - สำหรับ fallback)
router.post('/files/:id/validate',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      logInfo(`🔍 เริ่มต้นการตรวจสอบไฟล์ ID: ${id} (POST method - fallback)`);
      
      // ดึงข้อมูลไฟล์
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        logError(`❌ ไม่พบไฟล์ ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const filePath = fileRecord.filePath;
      const filename = fileRecord.filename;

      if (!filePath || !filename) {
        logError(`❌ ข้อมูลไฟล์ไม่ครบถ้วน ID: ${id}`);
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไฟล์ไม่ครบถ้วนสำหรับการตรวจสอบ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // แสดงข้อมูลไฟล์และ checksum info
      const metadata = extractMetadata(fileRecord.metadata);
      await logFileInfo(filePath, filename, metadata);

      // อัปเดตสถานะเป็น processing ก่อนเริ่มตรวจสอบ
      await getServices(req).databaseService.updateUploadRecord(id!, {
        status: FileProcessingStatus.PROCESSING,
      });

      // Monitor memory usage ก่อน validation
      const memoryBefore = process.memoryUsage();
      logInfo(`💾 Memory ก่อน validation: ${Math.round(memoryBefore.heapUsed / 1024 / 1024)} MB`);
      
      // ทำการ validation ครบชุด พร้อม memory management และ status updates
      const validation = await performFullValidation(req, filePath, filename, metadata, id!, fileRecord, fileRecord.batchId);
      const {
        validationResult,
        checksumValidation,
        combinedErrors,
        combinedWarnings,
        isValid: isValidFile
      } = validation;
      const checksum = checksumValidation.checksum;

      // Force garbage collection หลัง validation
      if (global.gc) {
        global.gc();
        const memoryAfter = process.memoryUsage();
        logInfo(`💾 Memory หลัง validation: ${Math.round(memoryAfter.heapUsed / 1024 / 1024)} MB`);
        const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
        if (memoryDiff > 50 * 1024 * 1024) { // เกิน 50MB
          logInfo(`⚠️ Memory usage เพิ่มขึ้น ${Math.round(memoryDiff / 1024 / 1024)} MB`);
        }
      }

      const fileStatus = isValidFile ? FileProcessingStatus.SUCCESS : FileProcessingStatus.FAILED;

      // อัปเดตข้อมูลการตรวจสอบและสถานะสุดท้ายลงฐานข้อมูล
      await getServices(req).databaseService.updateUploadRecord(id!, {
        status: fileStatus,
        isValid: isValidFile,
        totalRecords: validationResult.recordCount || fileRecord.totalRecords || 0,
        errors: combinedErrors.length > 0 ? JSON.stringify(combinedErrors) : null,
        warnings: combinedWarnings.length > 0 ? JSON.stringify(combinedWarnings) : null,
        metadata: createUpdatedMetadata(fileRecord.metadata, checksum, checksumValidation.isValid),
      });

      // อัปเดต batch statistics หลังจากการ validation เสร็จ
      try {
        const recordCount = validationResult.recordCount || 0;
        const processingTime = timer.elapsed();
        await getServices(req).statisticsService.updateBatchStatistics(
          fileRecord.batchId, 
          isValidFile, 
          1, // fileCount
          recordCount, 
          processingTime
        );
        logInfo(`📊 อัปเดต batch statistics: ${isValidFile ? 'success' : 'error'} count +1, records: ${recordCount}`);

        // อัปเดต successFiles ใน UploadBatch หลังจาก validation เสร็จสิ้น
        if (fileRecord.batchId) {
          try {
            await getServices(req).batchService.updateBatchSuccessFiles(fileRecord.batchId);
            logInfo(`✅ อัปเดต successFiles ใน batch ${fileRecord.batchId} เรียบร้อย`);
          } catch (updateError) {
            logError('Failed to update batch success files', updateError as Error, { batchId: fileRecord.batchId });
            // ไม่ throw error เพราะการอัปเดต successFiles ไม่ใช่ critical
          }
        }
      } catch (statsError) {
        logError('Failed to update batch statistics', statsError as Error);
        // ไม่ throw error เพราะการอัปเดต stats ไม่ใช่ critical
      }

      const response = createValidationResponse(validation, checksum, filePath, fileRecord, isValidFile);

      const responseTime = timer.elapsed();
      const validationStatus = isValidFile ? 'ผ่าน' : 'ไม่ผ่าน';
      logInfo(`🎯 การตรวจสอบเสร็จสิ้น: ${validationStatus} (ใช้เวลา ${responseTime.toFixed(2)}ms)`);
      logApiRequest('POST', `/files/${id!}/validate`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', `/files/${id!}/validate`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// FILE PROCESSING
// ========================================

// POST /api/revenue/process/:fileId - ประมวลผลไฟล์
router.post('/process/:fileId',
  apiRateLimiter,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { fileId } = req.params;

    try {
      // หาไฟล์จาก processed directory
      const processedDir = path.resolve(config.upload.processedPath);
      const files = await fs.readdir(processedDir);
      const targetFile = files.find(file => file.startsWith(fileId!));

      if (!targetFile) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const filePath = path.join(processedDir, targetFile);
      const filename = targetFile.replace(`${fileId}_`, '');

      // ตรวจสอบไฟล์อีกครั้ง
      const validationResult = await getServices(req).validationService.validateFileByType(filePath, filename);

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ผ่านการตรวจสอบ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ประมวลผลไฟล์
      const processingResult = await getServices(req).fileProcessingService.processFile(
        filePath,
        filename,
        validationResult,
      );

      // บันทึกผลการประมวลผล
      await getServices(req).statisticsService.saveProcessingResult(processingResult);

      const response: SuccessResponse = {
        success: true,
        data: processingResult,
        message: 'ประมวลผลไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('POST', `/process/${fileId}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', `/process/${fileId}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// STATISTICS
// ========================================

router.get('/statistics',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (_req: Request, res: Response) => {
    const timer = createTimer();

    try {
      const uploadStats = await getServices(_req).statisticsService.getUploadStatistics();
      const processingStats = await getServices(_req).statisticsService.getProcessingStatistics();

      const response: SuccessResponse = {
        success: true,
        data: {
          upload: uploadStats,
          processing: processingStats,
        },
        message: 'ดึงสถิติสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// HISTORY
// ========================================

// DELETE /api/revenue/history - ลบประวัติการอัปโหลดหลายรายการ
router.delete('/history',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { batchId, userId, status, fileType, startDate, endDate } = req.query;

    try {
      // สร้างเงื่อนไขการลบ
      const deleteParams: any = {};
      if (batchId) deleteParams.batchId = batchId as string;
      if (userId) deleteParams.userId = userId as string;
      if (status) deleteParams.status = status as string;
      if (fileType) deleteParams.fileType = fileType as string;
      if (startDate) deleteParams.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) deleteParams.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));

      // ดึงรายการไฟล์ที่จะลบ
      const records = await getServices(req).databaseService.getUploadRecords({
        limit: 1000,
        ...deleteParams,
      });

      let deletedFiles = 0;
      let deletedRecords = 0;

      // ลบไฟล์จาก file system
      for (const record of records.records) {
        if (record.filePath) {
          try {
            await getServices(req).fileStorageService.deleteFile(record.filePath);
            deletedFiles++;
            logInfo('File deleted from file system', { 
              fileId: record.id, 
              filePath: record.filePath 
            });
          } catch (error) {
            logError('Failed to delete file from file system', error as Error, { 
              fileId: record.id, 
              filePath: record.filePath 
            });
            // ดำเนินการต่อแม้จะลบไฟล์ไม่สำเร็จ
          }
        }
      }

      // ลบ records จาก database
      deletedRecords = await getServices(req).databaseService.deleteUploadRecords(deleteParams);

      const response: SuccessResponse = {
        success: true,
        data: {
          deletedFiles,
          deletedRecords,
          totalRecords: records.total,
          conditions: deleteParams,
        },
        message: `ลบประวัติการอัปโหลดสำเร็จ (${deletedRecords} รายการ)`,
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('DELETE', '/history', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('DELETE', '/history', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบประวัติการอัปโหลด',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/files/:id/status - ตรวจสอบสถานะไฟล์ (สำหรับ polling)
router.get('/files/:id/status',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      // ดึงข้อมูลไฟล์
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ดึงข้อมูล metadata สำหรับสถานะ validation steps
      const metadata = extractMetadata(fileRecord.metadata);
      let validationSteps = null;

      // ส่ง progress information แม้ในระหว่างการ processing
      if (fileRecord.status === FileProcessingStatus.PROCESSING || fileRecord.status === FileProcessingStatus.SUCCESS || fileRecord.status === FileProcessingStatus.FAILED) {
        // กำหนดสถานะแต่ละขั้นตอนตามข้อมูลใน metadata
        let checksumRunning = false;
        let checksumCompleted = !!metadata.verifiedChecksum;
        let integrityRunning = false;
        let integrityCompleted = !!metadata.integrityCompleted;
        let structureRunning = false;
        let structureCompleted = !!metadata.structureCompleted;

        // ถ้ากำลัง processing ให้กำหนดสถานะว่าขั้นตอนไหนกำลังทำงาน
        if (fileRecord.status === FileProcessingStatus.PROCESSING) {
          if (!checksumCompleted) {
            checksumRunning = true;
          } else if (!integrityCompleted) {
            integrityRunning = true;
          } else if (!structureCompleted) {
            structureRunning = true;
          }
        }

        validationSteps = {
          checksum: {
            running: checksumRunning,
            completed: checksumCompleted,
            passed: metadata.checksumMatch !== false,
            generated: metadata.verifiedChecksum ? metadata.verifiedChecksum.substring(0, 16) + '...' : null,
            original: metadata.originalChecksum ? metadata.originalChecksum.substring(0, 16) + '...' : null,
          },
          integrity: {
            running: integrityRunning,
            completed: integrityCompleted,
            passed: metadata.integrityPassed !== false,
          },
          structure: {
            running: structureRunning,
            completed: structureCompleted,
            passed: metadata.structurePassed !== false,
            skipped: !!metadata.structureSkipped
          }
        };
      }

      const response: SuccessResponse = {
        success: true,
        data: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          status: fileRecord.status,
          isValid: fileRecord.isValid,
          errors: fileRecord.errors ? JSON.parse(fileRecord.errors) : [],
          warnings: fileRecord.warnings ? JSON.parse(fileRecord.warnings) : [],
          fileSize: fileRecord.fileSize,
          uploadDate: fileRecord.uploadDate,
          validationSteps,
          processingTime: fileRecord.processingTime,
          // เพิ่มข้อมูลการคำนวณ progress
          progressPercentage: calculateValidationProgress(validationSteps),
        },
        message: 'ดึงสถานะไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/status`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/status`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถานะไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/history - ดึงประวัติการอัปโหลด
router.get('/history',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { page = '1', limit = '20', type, status } = req.query;

    try {
      const history = await getServices(req).statisticsService.getProcessingHistory();

      // กรองตาม type และ status
      let filteredHistory = history;

      if (type) {
        filteredHistory = filteredHistory.filter((item: any) => item.type === type);
      }

      if (status) {
        filteredHistory = filteredHistory.filter((item: any) => item.status === status);
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

      const response: SuccessResponse = {
        success: true,
        data: {
          history: paginatedHistory,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: filteredHistory.length,
            totalPages: Math.ceil(filteredHistory.length / limitNum),
          },
        },
        message: 'ดึงประวัติสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/history', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/history', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// DBF RECORDS ENDPOINTS
// ========================================

// GET /api/revenue/files/:id/dbf-records - ดึงข้อมูล DBF records จากฐานข้อมูล
router.get('/files/:id/dbf-records',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;
    const { page = '1', limit = '100' } = req.query;

    try {
      // ตรวจสอบว่าไฟล์มีอยู่ในฐานข้อมูลหรือไม่
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตรวจสอบว่าเป็นไฟล์ DBF หรือไม่
      const fileExtension = path.extname(fileRecord.originalName).toLowerCase();
      if (fileExtension !== '.dbf') {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ใช่รูปแบบ DBF',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ดึงข้อมูล DBF records จากฐานข้อมูล
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const dbfResult = await getServices(req).dbfService.getDBFRecordsFromDatabase(
        id!,
        limitNum,
        offset
      );

      const response: SuccessResponse = {
        success: true,
        data: {
          fileInfo: {
            id: fileRecord.id,
            filename: fileRecord.originalName,
            fileType: fileRecord.fileType,
            fileSize: fileRecord.fileSize,
            uploadDate: fileRecord.uploadDate,
            totalRecords: dbfResult.total,
          },
          schema: dbfResult.schema,
          records: dbfResult.records,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: dbfResult.total,
            totalPages: Math.ceil(dbfResult.total / limitNum),
          },
        },
        message: 'ดึงข้อมูล DBF records สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/dbf-records`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/dbf-records`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล DBF records',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/files/:id/dbf-status - ตรวจสอบสถานะการประมวลผล DBF
router.get('/files/:id/dbf-status',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      // ตรวจสอบว่าไฟล์มีอยู่ในฐานข้อมูลหรือไม่
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตรวจสอบว่าเป็นไฟล์ DBF หรือไม่
      const fileExtension = path.extname(fileRecord.originalName).toLowerCase();
      if (fileExtension !== '.dbf') {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ใช่รูปแบบ DBF',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ดึงสถานะการประมวลผล DBF
      const dbfStatus = await getServices(req).dbfService.getDBFProcessingStatus(id!);

      const response: SuccessResponse = {
        success: true,
        data: {
          fileId: id,
          filename: fileRecord.originalName,
          isProcessed: dbfStatus.isProcessed,
          recordCount: dbfStatus.recordCount,
          processedAt: dbfStatus.processedAt,
          schema: dbfStatus.schema,
          fileStatus: fileRecord.status,
          uploadDate: fileRecord.uploadDate,
        },
        message: 'ดึงสถานะการประมวลผล DBF สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/dbf-status`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/dbf-status`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถานะการประมวลผล DBF',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// POST /api/revenue/files/:id/process-dbf - ประมวลผลไฟล์ DBF ใหม่ (force reprocess)
router.post('/files/:id/process-dbf',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      // ตรวจสอบว่าไฟล์มีอยู่ในฐานข้อมูลหรือไม่
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตรวจสอบว่าเป็นไฟล์ DBF หรือไม่
      const fileExtension = path.extname(fileRecord.originalName).toLowerCase();
      if (fileExtension !== '.dbf') {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ใช่รูปแบบ DBF',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตรวจสอบว่าไฟล์มีอยู่ในระบบหรือไม่
      if (!await fs.pathExists(fileRecord.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'ไฟล์ไม่มีอยู่ในระบบ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // อัปเดตสถานะเป็น processing
      await getServices(req).databaseService.updateUploadRecord(id!, {
        status: FileProcessingStatus.PROCESSING,
      });

      // ประมวลผลไฟล์ DBF และบันทึกลงฐานข้อมูล
      const dbfResult = await processDBFFileAndSaveToDatabase(
        req,
        id!,
        fileRecord.filePath,
        fileRecord.originalName
      );

      if (dbfResult.success) {
        // อัปเดต batch statistics หลังจากการประมวลผล DBF เสร็จ
        if (fileRecord.batchId) {
          try {
            await getServices(req).batchService.updateBatchSuccessFiles(fileRecord.batchId);
            logInfo(`✅ อัปเดต batch statistics หลังประมวลผล DBF: batch ${fileRecord.batchId}`);
          } catch (updateError) {
            logError('Failed to update batch statistics after DBF processing', updateError as Error, { 
              batchId: fileRecord.batchId,
              fileId: id 
            });
            // ไม่ throw error เพราะการอัปเดต batch stats ไม่ใช่ critical
          }
        }

        const response: SuccessResponse = {
          success: true,
          data: {
            fileId: id,
            filename: fileRecord.originalName,
            recordCount: dbfResult.recordCount,
            status: FileProcessingStatus.SUCCESS,
            message: `ประมวลผล DBF สำเร็จ: บันทึก ${dbfResult.recordCount} รายการลงในฐานข้อมูล`,
          },
          message: 'ประมวลผลไฟล์ DBF สำเร็จ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        };

        const responseTime = timer.elapsed();
        logApiRequest('POST', `/files/${id!}/process-dbf`, 200, responseTime);

        return res.status(200).json(response);
      } else {
        // อัปเดตสถานะเป็น error
        await getServices(req).databaseService.updateUploadRecord(id!, {
          status: FileProcessingStatus.FAILED,
          errorMessage: dbfResult.error,
        });

        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF',
          error: dbfResult.error,
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', `/files/${id!}/process-dbf`, 500, responseTime);

      // อัปเดตสถานะเป็น error
      await getServices(req).databaseService.updateUploadRecord(id!, {
        status: FileProcessingStatus.FAILED,
        errorMessage: (error as Error).message,
      });

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ DBF',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// SYSTEM REPORT
// ========================================

router.get('/report',
  apiRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const timer = createTimer();

    try {
      const report = await getServices(_req).statisticsService.generateSystemReport();

      const response: SuccessResponse = {
        success: true,
        data: report,
        message: 'สร้างรายงานสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/report', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/report', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรายงาน',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// FILE MANAGEMENT ENDPOINTS
// ========================================

// GET /api/revenue/files - ดึงรายการไฟล์ทั้งหมด
router.get('/files',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { 
      page = '1', 
      limit = '20', 
      status, 
      fileType, 
      batchId, 
      userId, 
      startDate, 
      endDate,
      sortBy = 'uploadDate',
      sortOrder = 'desc'
    } = req.query;

    try {
      const params: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      };

      if (status) params.status = status as string;
      if (fileType) params.fileType = fileType as string;
      if (batchId) params.batchId = batchId as string;
      if (userId) params.userId = userId as string;
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));

      const result = await getServices(req).databaseService.getUploadRecords(params);

      const response: SuccessResponse = {
        success: true,
        data: result,
        message: 'ดึงรายการไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/files', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/files', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/files/:id - ดึงข้อมูลไฟล์เดี่ยว
router.get('/files/:id',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const response: SuccessResponse = {
        success: true,
        data: fileRecord,
        message: 'ดึงข้อมูลไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/files/:id/download - ดาวน์โหลดไฟล์
router.get('/files/:id/download',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const filePath = fileRecord.filePath;
      if (!filePath || !await fs.pathExists(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'ไฟล์ไม่มีอยู่ในระบบ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตั้งค่า headers สำหรับการดาวน์โหลด
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // ส่งไฟล์
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('end', () => {
        const responseTime = timer.elapsed();
        logApiRequest('GET', `/files/${id!}/download`, 200, responseTime);
        logInfo(`📥 ดาวน์โหลดไฟล์สำเร็จ: ${fileRecord.originalName}`);
      });

      stream.on('error', (error) => {
        const responseTime = timer.elapsed();
        logApiRequest('GET', `/files/${id!}/download`, 500, responseTime);
        logError('Error streaming file', error);
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์',
            timestamp: DateHelper.toDate(DateHelper.now()),
          });
        }
      });

      // ไม่ต้อง return เพราะใช้ stream
      // แต่ต้องเพิ่ม return statement เพื่อแก้ไข TypeScript error
      return res.json({
        success: true,
        message: 'File download started'
      });

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/download`, 500, responseTime);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }
      
      // เพิ่ม return statement เพื่อแก้ไข TypeScript error
      return res.json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์'
      });
    }
  }),
);

// GET /api/revenue/files/:id/preview - ดูตัวอย่างข้อมูลในไฟล์
router.get('/files/:id/preview',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;
    const { limit = '100' } = req.query;

    try {
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const filePath = fileRecord.filePath;
      if (!filePath || !await fs.pathExists(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'ไฟล์ไม่มีอยู่ในระบบ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // อ่านตัวอย่างข้อมูลจากไฟล์
      const previewData = await getServices(req).fileProcessingService.previewFile(
        filePath, 
        fileRecord.originalName,
        parseInt(limit as string)
      );

      const response: SuccessResponse = {
        success: true,
        data: {
          fileInfo: {
            id: fileRecord.id,
            filename: fileRecord.originalName,
            fileType: fileRecord.fileType,
            fileSize: fileRecord.fileSize,
            uploadDate: fileRecord.uploadDate,
          },
          preview: previewData,
        },
        message: 'ดูตัวอย่างไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/preview`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', `/files/${id!}/preview`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดูตัวอย่างไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// PUT /api/revenue/files/:id - อัปเดตข้อมูลไฟล์
router.put('/files/:id',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  validateRequestBody,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;
    const { status, metadata, notes } = req.body;

    try {
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
      if (notes !== undefined) updateData.notes = notes;

      const updatedRecord = await getServices(req).databaseService.updateUploadRecord(id!, updateData);

      const response: SuccessResponse = {
        success: true,
        data: updatedRecord,
        message: 'อัปเดตข้อมูลไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('PUT', `/files/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('PUT', `/files/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// DELETE /api/revenue/files/:id - ลบไฟล์เดี่ยว
router.delete('/files/:id',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;

    try {
      // ดึงข้อมูลไฟล์
      const fileRecord = await getServices(req).databaseService.getUploadRecord(id!);
      
      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบไฟล์ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ลบไฟล์จาก file system ถ้ามี
      if (fileRecord.filePath) {
        try {
          await getServices(req).fileStorageService.deleteFile(fileRecord.filePath);
          logInfo('File deleted from file system', { 
            fileId: id, 
            filePath: fileRecord.filePath 
          });
        } catch (error) {
          logError('Failed to delete file from file system', error as Error, { 
            fileId: id, 
            filePath: fileRecord.filePath 
          });
          // ดำเนินการต่อแม้จะลบไฟล์ไม่สำเร็จ
        }
      }

      // ลบ DBF records ถ้าเป็นไฟล์ DBF
      if (fileRecord.fileType === 'DBF') {
        try {
          await getServices(req).dbfService.deleteDBFRecords(id!);
          logInfo('DBF records deleted', { fileId: id });
        } catch (error) {
          logError('Failed to delete DBF records', error as Error, { fileId: id });
          // ดำเนินการต่อแม้จะลบ DBF records ไม่สำเร็จ
        }
      }

      // ลบ record จาก database
      await getServices(req).databaseService.deleteUploadRecord(id!);

      // อัปเดตสถิติ batch ถ้ามี batchId
      if (fileRecord.batchId) {
        try {
          await getServices(req).fileValidationService.updateBatchSuccessFiles(fileRecord.batchId);
          logInfo('Batch statistics updated after file deletion', { 
            fileId: id, 
            batchId: fileRecord.batchId 
          });
        } catch (error) {
          logError('Failed to update batch statistics after file deletion', error as Error, { 
            fileId: id, 
            batchId: fileRecord.batchId 
          });
          // ไม่ throw error เพราะไฟล์ถูกลบแล้ว
        }
      }

      const response: SuccessResponse = {
        success: true,
        data: { 
          id,
          fileName: fileRecord.filename,
          batchId: fileRecord.batchId 
        },
        message: 'ลบไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('DELETE', `/files/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('DELETE', `/files/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// ========================================
// STATISTICS ENDPOINTS
// ========================================

// GET /api/revenue/statistics/overview - สถิติภาพรวม
router.get('/statistics/overview',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate, fileType, batchId } = req.query;

    try {
      const params: any = {};
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));
      if (fileType) params.fileType = fileType as string;
      if (batchId) params.batchId = batchId as string;

      const overview = await getServices(req).statisticsService.getOverviewStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: overview,
        message: 'ดึงสถิติภาพรวมสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/overview', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/overview', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติภาพรวม',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/statistics/daily - สถิติรายวัน
router.get('/statistics/daily',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate, limit = '30' } = req.query;

    try {
      const params: any = {
        limit: parseInt(limit as string),
      };
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));

      const dailyStats = await getServices(req).statisticsService.getDailyStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: dailyStats,
        message: 'ดึงสถิติรายวันสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/daily', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/daily', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติรายวัน',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/statistics/file-types - สถิติตามประเภทไฟล์
router.get('/statistics/file-types',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate } = req.query;

    try {
      const params: any = {};
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));

      const fileTypeStats = await getServices(req).statisticsService.getFileTypeStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: fileTypeStats,
        message: 'ดึงสถิติตามประเภทไฟล์สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/file-types', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/file-types', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติตามประเภทไฟล์',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/statistics/processing-performance - สถิติประสิทธิภาพการประมวลผล
router.get('/statistics/processing-performance',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate, fileType } = req.query;

    try {
      const params: any = {};
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));
      if (fileType) params.fileType = fileType as string;

      const performanceStats = await getServices(req).statisticsService.getProcessingPerformanceStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: performanceStats,
        message: 'ดึงสถิติประสิทธิภาพการประมวลผลสำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/processing-performance', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/processing-performance', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติประสิทธิภาพการประมวลผล',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/statistics/batches - สถิติ batch
router.get('/statistics/batches',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate, status, limit = '20' } = req.query;

    try {
      const params: any = {
        limit: parseInt(limit as string),
      };
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));
      if (status) params.status = status as string;

      const batchStats = await getServices(req).statisticsService.getBatchStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: batchStats,
        message: 'ดึงสถิติ batch สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/batches', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/batches', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// GET /api/revenue/statistics/errors - สถิติ errors และ warnings
router.get('/statistics/errors',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { startDate, endDate, fileType, errorType = 'both' } = req.query;

    try {
      const params: any = {
        errorType: errorType as string, // 'errors', 'warnings', 'both'
      };
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate as string));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate as string));
      if (fileType) params.fileType = fileType as string;

      const errorStats = await getServices(req).statisticsService.getErrorStatistics(params);

      const response: SuccessResponse = {
        success: true,
        data: errorStats,
        message: 'ดึงสถิติ errors และ warnings สำเร็จ',
        timestamp: DateHelper.toDate(DateHelper.now()),
      };

      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/errors', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('GET', '/statistics/errors', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ errors และ warnings',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

// POST /api/revenue/statistics/export - ส่งออกสถิติ
router.post('/statistics/export',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateRequestBody,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { 
      statisticsType, 
      format = 'xlsx', 
      startDate, 
      endDate, 
      fileType, 
      includeDetails = false 
    } = req.body;

    try {
      if (!statisticsType || !['overview', 'daily', 'file-types', 'performance', 'batches', 'errors'].includes(statisticsType)) {
        return res.status(400).json({
          success: false,
          message: 'ประเภทสถิติไม่ถูกต้อง',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      const params: any = {
        statisticsType,
        format,
        includeDetails,
      };
      if (startDate) params.startDate = DateHelper.toDate(DateHelper.fromISO(startDate));
      if (endDate) params.endDate = DateHelper.toDate(DateHelper.fromISO(endDate));
      if (fileType) params.fileType = fileType;

      const exportResult = await getServices(req).statisticsService.exportStatistics(params);

      if (exportResult.filePath) {
        // ส่งไฟล์ให้ดาวน์โหลด
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.setHeader('Content-Type', exportResult.mimeType);

        const stream = fs.createReadStream(exportResult.filePath);
        stream.pipe(res);

        stream.on('end', () => {
          const responseTime = timer.elapsed();
          logApiRequest('POST', '/statistics/export', 200, responseTime);
          
          // ลบไฟล์ชั่วคราวหลังส่งเสร็จ
          fs.remove(exportResult.filePath).catch(err => {
            logError('Failed to cleanup export file', err);
          });
        });

        stream.on('error', (error) => {
          const responseTime = timer.elapsed();
          logApiRequest('POST', '/statistics/export', 500, responseTime);
          logError('Error streaming export file', error);
          
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'เกิดข้อผิดพลาดในการส่งออกไฟล์สถิติ',
              timestamp: DateHelper.toDate(DateHelper.now()),
            });
          }
        });

        // ไม่ต้อง return เพราะใช้ stream
        // แต่ต้องเพิ่ม return statement เพื่อแก้ไข TypeScript error
        return res.json({
          success: true,
          message: 'Statistics exported successfully'
        });

      } else {
        // ส่งข้อมูลเป็น JSON
        const response: SuccessResponse = {
          success: true,
          data: exportResult.data,
          message: 'ส่งออกสถิติสำเร็จ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        };

        const responseTime = timer.elapsed();
        logApiRequest('POST', '/statistics/export', 200, responseTime);

        return res.status(200).json(response);
      }

      // ไม่ต้องมี return statement ตรงนี้แล้ว เพราะมีใน else block แล้ว
    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', '/statistics/export', 500, responseTime);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการส่งออกสถิติ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }
      
      // เพิ่ม return statement เพื่อแก้ไข TypeScript error
      return res.json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งออกสถิติ'
      });
    }
  })
);

// ========================================
// BATCH EXPORT ENDPOINTS
// ========================================

// POST /api/revenue/batches/:id/export - ส่งออกไฟล์จาก batch
router.post('/batches/:id/export',
  apiRateLimiter,
  authenticateSession,
  requireUser,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const timer = createTimer();
    const { id } = req.params;
    const { exportType = 'opd' } = req.body; // รองรับ opd และ ipd

    try {
      logInfo(`📦 เริ่มต้นการส่งออก batch ID: ${id} (ประเภท: ${exportType.toUpperCase()})`);

      // ตรวจสอบ batch
      const batch = await getServices(req).batchService.getBatch(id!);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // ตรวจสอบสถานะ batch
      // if (batch.processingStatus !== 'completed') {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'batch ยังไม่ได้ประมวลผลเสร็จสิ้น กรุณารอให้ประมวลผลเสร็จก่อนส่งออก',
      //     timestamp: DateHelper.toDate(DateHelper.now()),
      //   });
      // }

      // อัปเดตสถานะเป็น exporting
      // await getServices(req).batchService.updateBatch(id!, {
      //   exportStatus: 'exporting',
      // });

      // ดึงไฟล์ทั้งหมดใน batch
      const batchFiles = await getServices(req).batchService.getBatchFiles(id!, {
        limit: 1000, // ดึงไฟล์ทั้งหมด
      });


      if (!batchFiles.files || batchFiles.files.length === 0) {
        // อัปเดตสถานะเป็น export_failed
        await getServices(req).batchService.updateBatch(id!, {
          exportStatus: 'export_failed',
        });
        console.log('ไม่พบไฟล์ใน batch นี้');

        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ใน batch นี้',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // สร้างโฟลเดอร์สำหรับ export
      const exportDir = path.join(config.upload.exportPath, 'temp', id!);
      await fs.ensureDir(exportDir);

      const exportedFiles: string[] = [];
      const errors: string[] = [];

      // ประมวลผลไฟล์แต่ละไฟล์ (คัดลอกไฟล์ต้นฉบับสำหรับการส่งออก)
      for (const fileRecord of batchFiles.files) {
        try {
          const fileExtension = path.extname(fileRecord.originalName).toLowerCase();
          if (fileExtension !== '.dbf') {
            logInfo(`⏭️ ข้ามไฟล์ที่ไม่ใช่ DBF: ${fileRecord.originalName}`);
            continue;
          }

          const originalFilePath = fileRecord.filePath;
          const exportFilePath = path.join(exportDir, fileRecord.originalName);

          if (await fs.pathExists(originalFilePath)) {
            await fs.copy(originalFilePath, exportFilePath);

            if (await fs.pathExists(exportFilePath)) {
              const fileStats = await fs.stat(exportFilePath);
              if (fileStats.size > 0) {
                exportedFiles.push(fileRecord.originalName);
                logInfo(`📋 ใช้ไฟล์ต้นฉบับ: ${fileRecord.originalName} (${fileStats.size} bytes)`);
              } else {
                logError('Copied file is empty', new Error(`File is empty: ${exportFilePath}`), {
                  fileId: fileRecord.id,
                  fileName: fileRecord.originalName,
                  originalPath: originalFilePath,
                  exportPath: exportFilePath
                });
                errors.push(`ไฟล์ต้นฉบับว่างเปล่า: ${fileRecord.originalName}`);
              }
            } else {
              logError('Failed to copy file', new Error(`Copy failed: ${originalFilePath} -> ${exportFilePath}`), {
                fileId: fileRecord.id,
                fileName: fileRecord.originalName,
                originalPath: originalFilePath,
                exportPath: exportFilePath
              });
              errors.push(`ไม่สามารถคัดลอกไฟล์: ${fileRecord.originalName}`);
            }
          } else {
            logError('Original file not found', new Error(`File not found: ${originalFilePath}`), {
              fileId: fileRecord.id,
              fileName: fileRecord.originalName,
              originalPath: originalFilePath
            });
            errors.push(`ไม่พบไฟล์ต้นฉบับ: ${fileRecord.originalName}`);
          }
        } catch (error) {
          const errorMsg = `เกิดข้อผิดพลาดในการประมวลผลไฟล์ ${fileRecord.originalName}: ${(error as Error).message}`;
          errors.push(errorMsg);
          logError('Error processing file for export', error as Error, { 
            fileId: fileRecord.id, 
            fileName: fileRecord.originalName 
          });
        }
      }

      if (exportedFiles.length === 0) {
        // อัปเดตสถานะเป็น export_failed
        await getServices(req).batchService.updateBatch(id!, {
          exportStatus: 'export_failed',
        });

        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถส่งออกไฟล์ได้',
          errors,
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

      // สร้างไฟล์ ZIP
      // const zipFileName = `exports_batch_${id}_${exportType.toUpperCase()}.zip`;
      const zipFileName = `${batch.batchName}_${exportType.toUpperCase()}.zip`;
      const zipFilePath = path.join(config.upload.exportPath, zipFileName);

      try {
        // ใช้ archiver สำหรับสร้าง ZIP
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // ระดับการบีบอัดสูงสุด
        });

        // รอให้ ZIP สร้างเสร็จก่อนส่ง response
        await new Promise<void>((resolve, reject) => {
          output.on('close', async () => {
            logInfo(`📦 สร้างไฟล์ ZIP สำเร็จ: ${zipFileName} (${archive.pointer()} bytes) - ประเภท: ${exportType.toUpperCase()}`);
            resolve();
          });

          archive.on('error', (err: any) => {
            logError('Error creating ZIP archive', err);
            reject(err);
          });

          archive.pipe(output);

          // เพิ่มไฟล์ทั้งหมดในโฟลเดอร์ export ลงใน ZIP
          (async () => {
            for (const fileName of exportedFiles) {
              const filePath = path.join(exportDir, fileName);
              // ตรวจสอบว่าไฟล์มีอยู่จริงก่อนเพิ่ม
              if (await fs.pathExists(filePath)) {
                archive.file(filePath, { name: fileName });
                logInfo(`📁 เพิ่มไฟล์ใน ZIP: ${fileName}`);
              } else {
                logError('File not found for ZIP', new Error(`File not found: ${filePath}`));
              }
            }
            archive.finalize();
          })();
        });

        // อัปเดตสถานะเป็น exported
        await getServices(req).batchService.updateBatch(id!, {
          exportStatus: 'exported',
        });

        // ตรวจสอบว่าไฟล์ ZIP สร้างสำเร็จและมีขนาด > 0
        const zipStats = await fs.stat(zipFilePath);
        if (zipStats.size === 0) {
          throw new Error('ZIP file is empty');
        }

        logInfo(`📦 ZIP file created successfully: ${zipFilePath} (${zipStats.size} bytes)`);

        // ส่งไฟล์ ZIP ให้ดาวน์โหลด
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Length', zipStats.size);

        const stream = fs.createReadStream(zipFilePath);
        stream.pipe(res);

        // ลบไฟล์ชั่วคราวหลังส่งเสร็จ
        stream.on('end', async () => {
          const responseTime = timer.elapsed();
          logApiRequest('POST', `/batches/${id!}/export`, 200, responseTime);
          logInfo(`📤 ส่งออก batch สำเร็จ: ${exportedFiles.length} ไฟล์ (ประเภท: ${exportType.toUpperCase()}, ใช้เวลา ${responseTime.toFixed(2)}ms)`);
          
          // ลบโฟลเดอร์ชั่วคราว
          try {
            await fs.remove(exportDir);
            logInfo(`🧹 ลบโฟลเดอร์ชั่วคราวเรียบร้อย: ${exportDir}`);
          } catch (cleanupError) {
            logError('Failed to cleanup temporary directory', cleanupError as Error);
          }
        });

        stream.on('error', async (error) => {
          const responseTime = timer.elapsed();
          logApiRequest('POST', `/batches/${id!}/export`, 500, responseTime);
          logError('Error streaming export file', error);

          // อัปเดตสถานะเป็น export_failed
          await getServices(req).batchService.updateBatch(id!, {
            exportStatus: 'export_failed',
          });

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'เกิดข้อผิดพลาดในการส่งออกไฟล์',
              timestamp: DateHelper.toDate(DateHelper.now()),
            });
          }
        });

        // Return undefined for streaming response
        return;

      } catch (zipError) {
        logError('Error creating ZIP file', zipError as Error);

        // อัปเดตสถานะเป็น export_failed
        await getServices(req).batchService.updateBatch(id!, {
          exportStatus: 'export_failed',
        });

        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP',
          timestamp: DateHelper.toDate(DateHelper.now()),
        });
      }

    } catch (error) {
      const responseTime = timer.elapsed();
      logApiRequest('POST', `/batches/${id!}/export`, 500, responseTime);
      logError('Error during batch export', error as Error);

      // อัปเดตสถานะเป็น export_failed
      try {
        await getServices(req).batchService.updateBatch(id!, {
          exportStatus: 'export_failed',
        });
      } catch (updateError) {
        logError('Failed to update batch export status', updateError as Error);
      }

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งออก batch',
        timestamp: DateHelper.toDate(DateHelper.now()),
      });
    }
  }),
);

export default router;