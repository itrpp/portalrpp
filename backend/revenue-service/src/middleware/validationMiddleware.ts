// ========================================
// VALIDATION MIDDLEWARE
// ========================================

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validationErrorHandler } from '@/utils/errorHandler';
import config from '@/config';

// ตรวจสอบ validation errors
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationErrorHandler(errors.array());
  }
  next();
};

// ตรวจสอบไฟล์ที่อัปโหลด
export const validateUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'ไม่พบไฟล์ที่อัปโหลด',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบขนาดไฟล์
  const maxSize = parseInt(config.upload.maxFileSize.replace('mb', '')) * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${config.upload.maxFileSize})`,
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบประเภทไฟล์
  const allowedTypes = config.upload.allowedFileTypes;
  const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
  
  if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
    return res.status(400).json({
      success: false,
      message: `ประเภทไฟล์ไม่ถูกต้อง (${allowedTypes.join(', ')})`,
      timestamp: new Date(),
    });
  }
  
  next();
};

// ตรวจสอบ query parameters
export const validateQueryParams = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit, type, status } = req.query;
  
  // ตรวจสอบ page
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'page ต้องเป็นตัวเลขที่มากกว่า 0',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบ limit
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'limit ต้องเป็นตัวเลขระหว่าง 1-100',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบ type
  if (type && !['dbf', 'rep', 'statement'].includes(type as string)) {
    return res.status(400).json({
      success: false,
      message: 'type ต้องเป็น dbf, rep, หรือ statement',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบ status
  if (status && !['pending', 'processing', 'completed', 'failed'].includes(status as string)) {
    return res.status(400).json({
      success: false,
      message: 'status ต้องเป็น pending, processing, completed, หรือ failed',
      timestamp: new Date(),
    });
  }
  
  next();
};

// ตรวจสอบ request body
export const validateRequestBody = (req: Request, res: Response, next: NextFunction) => {
  const { filename, fileType, description } = req.body;
  
  // ตรวจสอบ filename
  if (filename && typeof filename !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'filename ต้องเป็นข้อความ',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบ fileType
  if (fileType && !['dbf', 'rep', 'statement'].includes(fileType)) {
    return res.status(400).json({
      success: false,
      message: 'fileType ต้องเป็น dbf, rep, หรือ statement',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบ description
  if (description && typeof description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'description ต้องเป็นข้อความ',
      timestamp: new Date(),
    });
  }
  
  next();
};

// ตรวจสอบ file ID
export const validateFileId = (req: Request, res: Response, next: NextFunction) => {
  const { fileId } = req.params;
  
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'fileId ไม่ถูกต้อง',
      timestamp: new Date(),
    });
  }
  
  // ตรวจสอบรูปแบบ UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(fileId)) {
    return res.status(400).json({
      success: false,
      message: 'fileId ไม่มีรูปแบบที่ถูกต้อง',
      timestamp: new Date(),
    });
  }
  
  next();
};

export default {
  validateRequest,
  validateUploadedFile,
  validateQueryParams,
  validateRequestBody,
  validateFileId,
}; 