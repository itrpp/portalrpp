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
} from '@/types';
import { asyncHandler } from '@/utils/errorHandler';
import { logFileUpload, logApiRequest } from '@/utils/logger';
import { apiRateLimiter, uploadRateLimiter, validationRateLimiter } from '@/middleware/rateLimitMiddleware';
import { validateUploadedFile, validateQueryParams, validateRequestBody, validateFileId } from '@/middleware/validationMiddleware';
import FileValidationService from '@/services/fileValidationService';
import FileProcessingService from '@/services/fileProcessingService';
import StatisticsService from '@/services/statisticsService';
import config from '@/config';

const router = Router();

// สร้าง multer storage สำหรับโครงสร้างใหม่
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
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
          uploadDir = path.resolve(config.upload.dbfPath || './uploads/dbf', dateStr, uuid);
          break;
        case 'rep':
          uploadDir = path.resolve(config.upload.repPath || './uploads/rep', dateStr, uuid);
          break;
        case 'stm':
          uploadDir = path.resolve(config.upload.stmPath || './uploads/stm', dateStr, uuid);
          break;
        default:
          uploadDir = path.resolve(config.upload.tempPath || './uploads/temp', dateStr, uuid);
      }
      
      await fs.ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error);
    }
  },
  filename: (req, file, cb) => {
    // ใช้ชื่อไฟล์ต้นฉบับ
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(config.upload.maxFileSize.replace('mb', '')) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.upload.allowedFileTypes;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`ประเภทไฟล์ไม่ถูกต้อง (${allowedTypes.join(', ')})`));
    }
  },
});

// สร้าง service instances
const fileValidationService = new FileValidationService();
const fileProcessingService = new FileProcessingService();
const statisticsService = new StatisticsService();

// ========================================
// HEALTH CHECK
// ========================================

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
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
    
    res.status(200).json(response);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiRequest('GET', '/health', 500, responseTime);
    
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
      timestamp: new Date(),
    });
  }
}));

// ========================================
// FILE UPLOAD
// ========================================

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
      
      const { originalname, filename, size, path: filePath } = req.file;
      const fileId = uuidv4();
      
      // ตรวจสอบไฟล์
      const validationResult = await fileValidationService.validateFile(filePath, originalname);
      
      if (!validationResult.isValid) {
        // ลบไฟล์ที่ไม่ผ่านการตรวจสอบ
        await fs.remove(filePath);
        
        // อัปเดตสถิติ
        await statisticsService.updateUploadStatistics(
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
      
      // ประมวลผลไฟล์
      const processingResult = await fileProcessingService.processFile(
        filePath,
        originalname,
        validationResult,
      );
      
      // บันทึกผลการประมวลผล
      await statisticsService.saveProcessingResult(processingResult);
      
      // อัปเดตสถิติ
      await statisticsService.updateUploadStatistics(
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
          fileId: processingResult.fileId,
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
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/upload', 500, responseTime);
      
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
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
      const validationResult = await fileValidationService.validateFile(filePath, originalname);
      
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
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', '/validate', 500, responseTime);
      
      res.status(500).json({
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
      const targetFile = files.find(file => file.startsWith(fileId));
      
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
      const validationResult = await fileValidationService.validateFile(filePath, filename);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'ไฟล์ไม่ผ่านการตรวจสอบ',
          timestamp: new Date(),
        });
      }
      
      // ประมวลผลไฟล์
      const processingResult = await fileProcessingService.processFile(
        filePath,
        filename,
        validationResult,
      );
      
      // บันทึกผลการประมวลผล
      await statisticsService.saveProcessingResult(processingResult);
      
      const response: SuccessResponse = {
        success: true,
        data: processingResult,
        message: 'ประมวลผลไฟล์สำเร็จ',
        timestamp: new Date(),
      };
      
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/process/${fileId}`, 200, responseTime);
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('POST', `/process/${fileId}`, 500, responseTime);
      
      res.status(500).json({
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
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const uploadStats = await statisticsService.getUploadStatistics();
      const processingStats = await statisticsService.getProcessingStatistics();
      
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
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/statistics', 500, responseTime);
      
      res.status(500).json({
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
      const history = await statisticsService.getProcessingHistory();
      
      // กรองตาม type และ status
      let filteredHistory = history;
      
      if (type) {
        filteredHistory = filteredHistory.filter(item => item.type === type);
      }
      
      if (status) {
        filteredHistory = filteredHistory.filter(item => item.status === status);
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
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/history', 500, responseTime);
      
      res.status(500).json({
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
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const report = await statisticsService.generateSystemReport();
      
      const response: SuccessResponse = {
        success: true,
        data: report,
        message: 'สร้างรายงานสำเร็จ',
        timestamp: new Date(),
      };
      
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/report', 200, responseTime);
      
      res.status(200).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logApiRequest('GET', '/report', 500, responseTime);
      
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรายงาน',
        timestamp: new Date(),
      });
    }
  }),
);

export default router; 