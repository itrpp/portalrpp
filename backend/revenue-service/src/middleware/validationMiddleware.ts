// ========================================
// REVENUE SERVICE VALIDATION MIDDLEWARE
// ========================================

import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { FileValidationError, BatchError } from '@/utils/errorHandler';
import { logError } from '@/utils/logger';
import { ValidationService } from '@/services/validationService';

const validationService = new ValidationService();

// ========================================
// REQUEST VALIDATION
// ========================================

export const validateRequest = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw new FileValidationError(errorMessages, { errors: errors.array() });
  }
  next();
};

// ========================================
// FILE UPLOAD VALIDATION
// ========================================

export const validateUploadedFile = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new FileValidationError('ไม่พบไฟล์ที่อัปโหลด', { field: 'file' });
    }

    // ใช้ ValidationService ตรวจสอบความปลอดภัยของไฟล์
    const securityValidation = await validationService.validateFileSecurity(req.file);
    if (!securityValidation.isValid) {
      throw new FileValidationError('ไฟล์ไม่ปลอดภัย', {
        filename: req.file.originalname,
        errors: securityValidation.errors,
      });
    }

    // ตรวจสอบขนาดไฟล์
    const maxSize = 52428800; // 50MB
    if (req.file.size > maxSize) {
      throw new FileValidationError(
        `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
        { filename: req.file.originalname, size: req.file.size, maxSize }
      );
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['.dbf', '.xls', '.xlsx'];
    const fileExtension = getFileExtension(req.file.originalname);
    if (!allowedTypes.includes(fileExtension.toLowerCase())) {
      throw new FileValidationError(
        `ประเภทไฟล์ไม่ถูกต้อง (${allowedTypes.join(', ')})`,
        { filename: req.file.originalname, extension: fileExtension, allowedTypes }
      );
    }

    next();
  } catch (error) {
    logError('File upload validation error', error as Error);
    next(error);
  }
};

// ========================================
// BATCH UPLOAD VALIDATION
// ========================================

export const validateBatchUpload = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw new BatchError('ไม่พบไฟล์ที่อัปโหลด', { field: 'files' });
    }

    if (files.length > 10) {
      throw new BatchError('จำนวนไฟล์เกินขีดจำกัด (สูงสุด 10 ไฟล์)', {
        fileCount: files.length,
        maxFiles: 10
      });
    }

    // ใช้ ValidationService ตรวจสอบความปลอดภัยของ batch
    const batchId = `batch-${Date.now()}`; // สร้าง temporary batch ID
    const batchSecurityValidation = await validationService.validateBatchSecurity(batchId, files);
    if (!batchSecurityValidation.isValid) {
      throw new BatchError('Batch ไม่ปลอดภัย', {
        batchId,
        errors: batchSecurityValidation.errors,
      });
    }

    // ตรวจสอบไฟล์แต่ละไฟล์
    for (const file of files) {
      const maxSize = 52428800; // 50MB
      if (file.size > maxSize) {
        throw new BatchError(
          `ไฟล์ ${file.originalname} มีขนาดใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
          { filename: file.originalname, size: file.size, maxSize }
        );
      }

      const allowedTypes = ['.dbf', '.xls', '.xlsx'];
      const fileExtension = getFileExtension(file.originalname);
      if (!allowedTypes.includes(fileExtension.toLowerCase())) {
        throw new BatchError(
          `ไฟล์ ${file.originalname} ไม่ใช่ประเภทที่อนุญาต (${allowedTypes.join(', ')})`,
          { filename: file.originalname, extension: fileExtension, allowedTypes }
        );
      }
    }

    next();
  } catch (error) {
    logError('Batch upload validation error', error as Error);
    next(error);
  }
};

// ========================================
// QUERY PARAMETERS VALIDATION
// ========================================

export const validateQueryParams = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, userId, startDate, endDate } = req.query;

    // ตรวจสอบ page
    if (page !== undefined) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new FileValidationError('page ต้องเป็นตัวเลขที่มากกว่า 0', { field: 'page', value: page });
      }
    }

    // ตรวจสอบ limit
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new FileValidationError('limit ต้องเป็นตัวเลขระหว่าง 1-100', { field: 'limit', value: limit });
      }
    }

    // ตรวจสอบ status
    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'validation_failed', 'success', 'error', 'partial'];
      if (!validStatuses.includes(status as string)) {
        throw new FileValidationError(`status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`, { field: 'status', value: status });
      }
    }

    // ตรวจสอบ userId
    if (userId !== undefined && typeof userId !== 'string') {
      throw new FileValidationError('userId ต้องเป็นข้อความ', { field: 'userId', value: userId });
    }

    // ตรวจสอบ startDate
    if (startDate !== undefined) {
      const startDateObj = new Date(startDate as string);
      if (isNaN(startDateObj.getTime())) {
        throw new FileValidationError('startDate ต้องเป็นวันที่ที่ถูกต้อง', { field: 'startDate', value: startDate });
      }
    }

    // ตรวจสอบ endDate
    if (endDate !== undefined) {
      const endDateObj = new Date(endDate as string);
      if (isNaN(endDateObj.getTime())) {
        throw new FileValidationError('endDate ต้องเป็นวันที่ที่ถูกต้อง', { field: 'endDate', value: endDate });
      }
    }

    // ตรวจสอบ startDate และ endDate ร่วมกัน
    if (startDate && endDate) {
      const startDateObj = new Date(startDate as string);
      const endDateObj = new Date(endDate as string);
      if (startDateObj > endDateObj) {
        throw new FileValidationError('startDate ต้องไม่เกิน endDate', { startDate, endDate });
      }
    }

    next();
  } catch (error) {
    logError('Query parameters validation error', error as Error);
    next(error);
  }
};

// ========================================
// REQUEST BODY VALIDATION
// ========================================

export const validateRequestBody = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { batchName, userId, ipAddress, userAgent } = req.body;

    // ตรวจสอบ batchName
    if (batchName !== undefined) {
      if (typeof batchName !== 'string') {
        throw new FileValidationError('batchName ต้องเป็นข้อความ', { field: 'batchName', value: batchName });
      }
      if (batchName.trim().length === 0) {
        throw new FileValidationError('batchName ต้องไม่เป็นค่าว่าง', { field: 'batchName', value: batchName });
      }
      if (batchName.length > 255) {
        throw new FileValidationError('batchName ต้องไม่เกิน 255 ตัวอักษร', { field: 'batchName', value: batchName });
      }
    }

    // ตรวจสอบ userId
    if (userId !== undefined && typeof userId !== 'string') {
      throw new FileValidationError('userId ต้องเป็นข้อความ', { field: 'userId', value: userId });
    }

    // ตรวจสอบ ipAddress
    if (ipAddress !== undefined && typeof ipAddress !== 'string') {
      throw new FileValidationError('ipAddress ต้องเป็นข้อความ', { field: 'ipAddress', value: ipAddress });
    }

    // ตรวจสอบ userAgent
    if (userAgent !== undefined && typeof userAgent !== 'string') {
      throw new FileValidationError('userAgent ต้องเป็นข้อความ', { field: 'userAgent', value: userAgent });
    }

    next();
  } catch (error) {
    logError('Request body validation error', error as Error);
    next(error);
  }
};

// ========================================
// FILE ID VALIDATION
// ========================================

export const validateFileId = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new FileValidationError('ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    if (id.trim().length === 0) {
      throw new FileValidationError('ID ต้องไม่เป็นค่าว่าง', { field: 'id', value: id });
    }

    // ตรวจสอบรูปแบบ ID (CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    if (!cuidPattern.test(id)) {
      throw new FileValidationError('รูปแบบ ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    next();
  } catch (error) {
    logError('File ID validation error', error as Error);
    next(error);
  }
};

// ========================================
// BATCH ID VALIDATION
// ========================================

export const validateBatchId = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new BatchError('Batch ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    if (id.trim().length === 0) {
      throw new BatchError('Batch ID ต้องไม่เป็นค่าว่าง', { field: 'id', value: id });
    }

    // ตรวจสอบรูปแบบ Batch ID (CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    if (!cuidPattern.test(id)) {
      throw new BatchError('รูปแบบ Batch ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    next();
  } catch (error) {
    logError('Batch ID validation error', error as Error);
    next(error);
  }
};

// ========================================
// VALIDATION CHAINS
// ========================================

export const validateBatchCreate = [
  body('batchName')
    .isString()
    .withMessage('batchName ต้องเป็นข้อความ')
    .isLength({ min: 1, max: 255 })
    .withMessage('batchName ต้องมีความยาว 1-255 ตัวอักษร'),
  body('userId')
    .optional()
    .isString()
    .withMessage('userId ต้องเป็นข้อความ'),
  body('ipAddress')
    .optional()
    .isString()
    .withMessage('ipAddress ต้องเป็นข้อความ'),
  body('userAgent')
    .optional()
    .isString()
    .withMessage('userAgent ต้องเป็นข้อความ'),
  validateRequest,
];

export const validateBatchUpdate = [
  body('batchName')
    .optional()
    .isString()
    .withMessage('batchName ต้องเป็นข้อความ')
    .isLength({ min: 1, max: 255 })
    .withMessage('batchName ต้องมีความยาว 1-255 ตัวอักษร'),
  body('totalFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('successFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('successFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('errorFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('errorFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('processingFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('processingFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('totalRecords')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalRecords ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('totalSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalSize ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('status')
    .optional()
    .isIn(['success', 'error', 'processing', 'partial'])
    .withMessage('status ต้องเป็นหนึ่งใน: success, error, processing, partial'),
  validateRequest,
];

export const validateBatchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page ต้องเป็นตัวเลขที่มากกว่า 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit ต้องเป็นตัวเลขระหว่าง 1-100'),
  query('status')
    .optional()
    .isIn(['success', 'error', 'processing', 'partial'])
    .withMessage('status ต้องเป็นหนึ่งใน: success, error, processing, partial'),
  query('userId')
    .optional()
    .isString()
    .withMessage('userId ต้องเป็นข้อความ'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate ต้องเป็นวันที่ที่ถูกต้อง'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate ต้องเป็นวันที่ที่ถูกต้อง'),
  validateRequest,
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

export default {
  validateRequest,
  validateUploadedFile,
  validateBatchUpload,
  validateQueryParams,
  validateRequestBody,
  validateFileId,
  validateBatchId,
  validateBatchCreate,
  validateBatchUpdate,
  validateBatchQuery,
}; 