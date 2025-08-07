// ========================================
// REVENUE ROUTES
// ========================================

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import {
  FileUploadResult,
  SuccessResponse,
  ApiResponse,
  BatchStatus,
  ProcessingStatus,
} from '@/types';
import { asyncHandler } from '@/utils/errorHandler';
import { logFileUpload, logApiRequest } from '@/utils/logger';
import { apiRateLimiter, uploadRateLimiter, validationRateLimiter } from '@/middleware/rateLimitMiddleware';
import { validateUploadedFile, validateQueryParams, validateRequestBody, validateFileId, validateBatchId } from '@/middleware/validationMiddleware';

import config from '@/config';

const router = Router();

// ใช้ services ที่แชร์จาก index.ts
const getServices = (req: Request) => {
  return req.app.locals.services;
};

// สร้าง multer storage สำหรับโครงสร้างใหม่
const storage = multer.diskStorage({
  destination: async (_req, file, cb) => {
    try {
      // กำหนดประเภทไฟล์ตามนามสกุล
      let fileType = 'temp';
      const fileExtension = path.extname(file.originalname).toLowerCase();

      if (fileExtension === '.dbf') {
        fileType = 'dbf';
      } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        // ตรวจสอบว่าเป็น REP หรือ Statement ตามชื่อไฟล์
        if (file.originalname.toLowerCase().includes('rep')) {
          fileType = 'rep';
        } else if (file.originalname.toLowerCase().includes('statement') || file.originalname.toLowerCase().includes('stm')) {
          fileType = 'stm';
        } else {
          fileType = 'temp'; // ถ้าไม่แน่ใจให้เก็บใน temp
        }
      }

      // สร้างโครงสร้างโฟลเดอร์ตามรูปแบบใหม่
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const uuid = uuidv4();

      let uploadDir: string;
      switch (fileType) {
        case 'dbf':
          uploadDir = path.resolve((config.upload.dbfPath || './uploads/dbf')!, dateStr as string, uuid);
          break;
        case 'rep':
          uploadDir = path.resolve((config.upload.repPath || './uploads/rep')!, dateStr as string, uuid);
          break;
        case 'stm':
          uploadDir = path.resolve((config.upload.stmPath || './uploads/stm')!, dateStr as string, uuid);
          break;
        default:
          uploadDir = path.resolve((config.upload.tempPath || './uploads/temp')!, dateStr as string, uuid);
      }

      await fs.ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    // ใช้ชื่อไฟล์ต้นฉบับ
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(config.upload.maxFileSize.replace('mb', '')) * 1024 * 1024,
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
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { page = '1', limit = '20', status, userId, startDate, endDate } = req.query;

    try {
      const params: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      if (status) params.status = status as BatchStatus;
      if (userId) params.userId = userId as string;
      if (startDate) params.startDate = new Date(startDate as string);
      if (endDate) params.endDate = new Date(endDate as string);

      const result = await getServices(req).batchService.getBatches(params);

      const response: SuccessResponse = {
        success: true,
        data: result,
        message: 'ดึงรายการ batches สำเร็จ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/batches', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/batches', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการ batches',
        timestamp: new Date(),
      });
    }
  }),
);

// POST /api/revenue/batches - สร้าง batch ใหม่
router.post('/batches',
  apiRateLimiter,
  validateRequestBody,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { batchName, userId, ipAddress, userAgent } = req.body;

    try {
      const batch = await getServices(req).batchService.createBatch({
        batchName: batchName || `Batch ${new Date().toISOString()}`,
        userId: userId || (req.ip || 'unknown'),
        ipAddress: ipAddress || (req.ip || 'unknown'),
        userAgent: userAgent || (req.get('User-Agent') || 'unknown'),
      });

      const response: SuccessResponse = {
        success: true,
        data: batch,
        message: 'สร้าง batch สำเร็จ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/batches', 200, responseTime);

      return res.status(201).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/batches', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้าง batch',
        timestamp: new Date(),
      });
    }
  }),
);

// GET /api/revenue/batches/:id - ดึงข้อมูล batch
router.get('/batches/:id',
  apiRateLimiter,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: new Date(),
        });
      }

      const response: SuccessResponse = {
        success: true,
        data: batch,
        message: 'ดึงข้อมูล batch สำเร็จ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', `/batches/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', `/batches/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล batch',
        timestamp: new Date(),
      });
    }
  }),
);

// DELETE /api/revenue/batches/:id - ลบ batch
router.delete('/batches/:id',
  apiRateLimiter,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: new Date(),
        });
      }

      // ลบ batch และไฟล์ที่เกี่ยวข้อง
      await getServices(req).batchService.deleteBatch(id!);

      const response: SuccessResponse = {
        success: true,
        data: { id },
        message: 'ลบ batch สำเร็จ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('DELETE', `/batches/${id!}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('DELETE', `/batches/${id!}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบ batch',
        timestamp: new Date(),
      });
    }
  }),
);

// GET /api/revenue/batches/:id/files - ดึงไฟล์ใน batch
router.get('/batches/:id/files',
  apiRateLimiter,
  validateBatchId,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { page = '1', limit = '20', status, fileType } = req.query;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: new Date(),
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
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', `/batches/${id!}/files`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', `/batches/${id!}/files`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงไฟล์ใน batch',
        timestamp: new Date(),
      });
    }
  }),
);

// POST /api/revenue/batches/:id/process - ประมวลผล batch
router.post('/batches/:id/process',
  apiRateLimiter,
  validateBatchId,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;

    try {
      const batch = await getServices(req).batchService.getBatch(id!);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ batch ที่ระบุ',
          timestamp: new Date(),
        });
      }

      // ประมวลผล batch
      const processingResult = await getServices(req).batchService.processBatch(id!);

      const response: SuccessResponse = {
        success: true,
        data: processingResult,
        message: `ประมวลผล batch สำเร็จ (${processingResult.processedFiles}/${processingResult.totalFiles} ไฟล์)`,
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/batches/${id!}/process`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/batches/${id!}/process`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผล batch',
        timestamp: new Date(),
      });
    }
  }),
);

// ========================================
// HEALTH CHECK
// ========================================

router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ตรวจสอบ file system
    const uploadDirExists = await fs.pathExists(config.upload.uploadPath);
    const processedDirExists = await fs.pathExists(config.upload.processedPath);
    const backupDirExists = await fs.pathExists(config.upload.backupPath);
    const tempDirExists = await fs.pathExists(config.upload.tempPath);

    const response: SuccessResponse = {
      success: true,
      data: {
        status: 'healthy',
        service: 'Revenue Service',
        timestamp: new Date(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        fileSystem: {
          uploadDirectory: uploadDirExists,
          processedDirectory: processedDirExists,
          backupDirectory: backupDirExists,
          tempDirectory: tempDirExists,
        },
      },
      timestamp: new Date(),
    };

    const responseTime = Date.now() - startTime;
    logApiRequest('GET', '/health', 200, responseTime);

    return res.status(200).json(response);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiRequest('GET', '/health', 500, responseTime);

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
      timestamp: new Date(),
    });
  }
}));

// ========================================
// FILE UPLOAD ENDPOINTS
// ========================================

// POST /api/revenue/upload - อัปโหลดไฟล์พร้อม batch support
router.post('/upload',
  uploadRateLimiter,
  upload.single('file'),
  validateUploadedFile,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: new Date(),
        });
      }

      const { originalname, size, path: filePath } = req.file;
      const { batchId } = req.body; // รองรับ batch ID
      const fileId = uuidv4();

      // ตรวจสอบไฟล์
      const validationResult = await getServices(req).fileValidationService.validateFile(filePath, originalname);

      // เพิ่มการตรวจสอบด้วย ValidationService
      const securityValidation = await getServices(req).validationService.validateFileSecurity(req.file!);
      if (!securityValidation.isValid) {
        // ลบไฟล์ที่ไม่ปลอดภัย
        await fs.remove(filePath);
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ปลอดภัย',
          errors: securityValidation.errors.map((e: any) => e.message),
          timestamp: new Date(),
        });
      }

      // ตรวจสอบ file integrity
      const integrityValidation = await getServices(req).validationService.validateFileIntegrity(filePath);
      if (!integrityValidation.isValid) {
        // ลบไฟล์ที่ไม่สมบูรณ์
        await fs.remove(filePath);
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่สมบูรณ์',
          errors: integrityValidation.errors.map((e: any) => e.message),
          timestamp: new Date(),
        });
      }



      if (!validationResult.isValid) {
        // ลบไฟล์ที่ไม่ผ่านการตรวจสอบ
        await fs.remove(filePath);

        // อัปเดตสถิติ
        await getServices(req).statisticsService.updateUploadStatistics(
          validationResult.fileType,
          size,
          false,
        );

        const response: ApiResponse = {
          success: false,
          message: 'ไฟล์ไม่ผ่านการตรวจสอบ',
          timestamp: new Date(),
          requestId: fileId,
        };

        const responseTime = Date.now() - startTime;
        logApiRequest('POST', '/upload', 400, responseTime);

        return res.status(400).json(response);
      }

      // สร้าง upload record
      const record = await getServices(req).databaseService.createUploadRecord({
        filename: originalname,
        originalName: originalname,
        fileType: validationResult.fileType.toUpperCase(),
        fileSize: size,
        filePath: filePath,
        status: ProcessingStatus.PENDING,
        batchId: batchId || null,
        userId: (req.ip || 'unknown'),
        ipAddress: (req.ip || 'unknown'),
        userAgent: (req.get('User-Agent') || 'unknown'),
        isValid: validationResult.isValid,
        errors: validationResult.errors.length > 0 ? JSON.stringify(validationResult.errors) : null,
        warnings: validationResult.warnings.length > 0 ? JSON.stringify(validationResult.warnings) : null,
        totalRecords: validationResult.recordCount || 0,
      });

      // อัปเดต batch statistics ถ้ามี batch
      if (batchId) {
        const batch = await getServices(req).batchService.getBatch(batchId);
        if (batch) {
          await getServices(req).batchService.updateBatch(batchId, {
            totalFiles: batch.totalFiles + 1,
            processingFiles: batch.processingFiles + 1,
            totalSize: batch.totalSize + size,
            totalRecords: batch.totalRecords + (validationResult.recordCount || 0),
          });
        }
      }

      // ประมวลผลไฟล์
      const processingResult = await getServices(req).fileProcessingService.processFile(
        filePath,
        originalname,
        validationResult,
      );

      // บันทึกผลการประมวลผล
      await getServices(req).statisticsService.saveProcessingResult(processingResult);

      // อัปเดตสถิติ
      await getServices(req).statisticsService.updateUploadStatistics(
        validationResult.fileType,
        size,
        processingResult.success,
      );

      const response: SuccessResponse<FileUploadResult> = {
        success: true,
        data: {
          success: processingResult.success,
          message: processingResult.message,
          filename: originalname,
          fileId: record.id,
          fileSize: size,
          uploadDate: new Date(),
          errors: processingResult.errors,
        },
        message: 'อัปโหลดไฟล์สำเร็จ',
        timestamp: new Date(),
        requestId: fileId,
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/upload', 200, responseTime);
      logFileUpload(originalname, size, validationResult.fileType);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/upload', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        timestamp: new Date(),
      });
    }
  }),
);

// POST /api/revenue/upload/batch - อัปโหลดหลายไฟล์เป็น batch
router.post('/upload/batch',
  uploadRateLimiter,
  upload.array('files', 10), // สูงสุด 10 ไฟล์
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const files = req.files as Express.Multer.File[];
      const { batchName } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: new Date(),
        });
      }

      // สร้าง batch ใหม่
      const batch = await getServices(req).batchService.createBatch({
        batchName: batchName || `Batch ${new Date().toISOString()}`,
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
          timestamp: new Date(),
        });
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;
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
            new Date()
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
          const validationResult = await getServices(req).fileValidationService.validateFile(storageResult.filePath, originalname);

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
            status: ProcessingStatus.PENDING,
            batchId: batch.id,
            userId: (req.ip || 'unknown'),
            ipAddress: (req.ip || 'unknown'),
            userAgent: (req.get('User-Agent') || 'unknown'),
            isValid: validationResult.isValid,
            errors: validationResult.errors.length > 0 ? JSON.stringify(validationResult.errors) : null,
            warnings: validationResult.warnings.length > 0 ? JSON.stringify(validationResult.warnings) : null,
            totalRecords: validationResult.recordCount || 0,
          });

          // ประมวลผลไฟล์
          const processingResult = await getServices(req).fileProcessingService.processFile(
            storageResult.filePath,
            originalname,
            validationResult,
          );

          if (processingResult.success) {
            successCount++;
            totalSize += size;
            totalRecords += validationResult.recordCount || 0;
          } else {
            errorCount++;
          }

          results.push({
            filename: originalname,
            success: processingResult.success,
            message: processingResult.message,
            fileId: record.id,
            fileSize: size,
            errors: processingResult.errors || [],
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

      // อัปเดต batch statistics
      await getServices(req).batchService.updateBatch(batch.id, {
        totalFiles: files.length,
        successFiles: successCount,
        errorFiles: errorCount,
        totalRecords,
        totalSize,
        status: errorCount === 0 ? BatchStatus.SUCCESS : successCount === 0 ? BatchStatus.ERROR : BatchStatus.PARTIAL,
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
          processingTime: Date.now() - startTime,
          status: errorCount === 0 ? BatchStatus.SUCCESS : successCount === 0 ? BatchStatus.ERROR : BatchStatus.PARTIAL,
        },
        message: `อัปโหลด batch สำเร็จ (${successCount}/${files.length} ไฟล์)`,
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/upload/batch', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/upload/batch', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลด batch',
        timestamp: new Date(),
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
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          timestamp: new Date(),
        });
      }

      const { originalname, path: filePath } = req.file;

      // ตรวจสอบไฟล์
      const validationResult = await getServices(req).fileValidationService.validateFile(filePath, originalname);

      // ลบไฟล์หลังจากตรวจสอบ
      await fs.remove(filePath);

      const response: SuccessResponse = {
        success: true,
        data: validationResult,
        message: validationResult.isValid ? 'ไฟล์ผ่านการตรวจสอบ' : 'ไฟล์ไม่ผ่านการตรวจสอบ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/validate', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/validate', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์',
        timestamp: new Date(),
      });
    }
  }),
);

// ========================================
// FILE PROCESSING
// ========================================

router.post('/process/:fileId',
  apiRateLimiter,
  validateFileId,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
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
          timestamp: new Date(),
        });
      }

      const filePath = path.join(processedDir, targetFile);
      const filename = targetFile.replace(`${fileId}_`, '');

      // ตรวจสอบไฟล์อีกครั้ง
      const validationResult = await getServices(req).fileValidationService.validateFile(filePath, filename);

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ผ่านการตรวจสอบ',
          timestamp: new Date(),
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
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/process/${fileId}`, 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/process/${fileId}`, 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์',
        timestamp: new Date(),
      });
    }
  }),
);

// ========================================
// STATISTICS
// ========================================

router.get('/statistics',
  apiRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const startTime = Date.now();

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
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/statistics', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/statistics', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
        timestamp: new Date(),
      });
    }
  }),
);

// ========================================
// HISTORY
// ========================================

router.get('/history',
  apiRateLimiter,
  validateQueryParams,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
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
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/history', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/history', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติ',
        timestamp: new Date(),
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
    const startTime = Date.now();

    try {
      const report = await getServices(_req).statisticsService.generateSystemReport();

      const response: SuccessResponse = {
        success: true,
        data: report,
        message: 'สร้างรายงานสำเร็จ',
        timestamp: new Date(),
      };

      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/report', 200, responseTime);

      return res.status(200).json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/report', 500, responseTime);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรายงาน',
        timestamp: new Date(),
      });
    }
  }),
);

export default router; 