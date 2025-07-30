import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Validation middleware สำหรับตรวจสอบ Content-Type
export const validationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // ตรวจสอบ Content-Type สำหรับ POST และ PUT requests
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid Content-Type', {
        method: req.method,
        path: req.path,
        contentType,
        ip: req.ip,
      });
      
      return res.status(400).json({
        success: false,
        error: 'Content-Type ต้องเป็น application/json',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ Content-Length
  const contentLength = req.get('Content-Length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > 10 * 1024 * 1024) { // 10MB
      logger.warn('Request too large', {
        method: req.method,
        path: req.path,
        size,
        ip: req.ip,
      });
      
      return res.status(413).json({
        success: false,
        error: 'ขนาดข้อมูลเกินขีดจำกัด (สูงสุด 10MB)',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ User-Agent
  const userAgent = req.get('User-Agent');
  if (!userAgent) {
    logger.warn('Missing User-Agent', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  // ตรวจสอบ Accept header
  const accept = req.get('Accept');
  if (!accept || !accept.includes('application/json')) {
    logger.warn('Invalid Accept header', {
      method: req.method,
      path: req.path,
      accept,
      ip: req.ip,
    });
  }

  next();
};

// Middleware สำหรับตรวจสอบ query parameters
export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  const { page, limit, sortOrder } = req.query;

  // ตรวจสอบ page parameter
  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'หมายเลขหน้าต้องเป็นตัวเลขและมากกว่า 0',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ limit parameter
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนรายการต่อหน้าต้องเป็นตัวเลขระหว่าง 1-100',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ sortOrder parameter
  if (sortOrder !== undefined && !['asc', 'desc'].includes(sortOrder as string)) {
    return res.status(400).json({
      success: false,
      error: 'ลำดับการเรียงต้องเป็น asc หรือ desc',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Middleware สำหรับตรวจสอบ date parameters
export const validateDateParams = (req: Request, res: Response, next: NextFunction): void => {
  const { dateFrom, dateTo } = req.query;

  // ตรวจสอบ dateFrom
  if (dateFrom !== undefined) {
    const fromDate = new Date(dateFrom as string);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'วันที่เริ่มต้นไม่ถูกต้อง (รูปแบบ: YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ dateTo
  if (dateTo !== undefined) {
    const toDate = new Date(dateTo as string);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'วันที่สิ้นสุดไม่ถูกต้อง (รูปแบบ: YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ date range
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom as string);
    const toDate = new Date(dateTo as string);
    
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด',
        timestamp: new Date().toISOString(),
      });
    }

    // ตรวจสอบช่วงวันที่ไม่เกิน 1 ปี
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        error: 'ช่วงวันที่ต้องไม่เกิน 1 ปี',
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// Middleware สำหรับตรวจสอบ amount parameters
export const validateAmountParams = (req: Request, res: Response, next: NextFunction): void => {
  const { minAmount, maxAmount } = req.query;

  // ตรวจสอบ minAmount
  if (minAmount !== undefined) {
    const min = parseFloat(minAmount as string);
    if (isNaN(min) || min < 0) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนเงินขั้นต่ำต้องเป็นตัวเลขและมากกว่าหรือเท่ากับ 0',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ maxAmount
  if (maxAmount !== undefined) {
    const max = parseFloat(maxAmount as string);
    if (isNaN(max) || max < 0) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนเงินสูงสุดต้องเป็นตัวเลขและมากกว่าหรือเท่ากับ 0',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ตรวจสอบ amount range
  if (minAmount && maxAmount) {
    const min = parseFloat(minAmount as string);
    const max = parseFloat(maxAmount as string);
    
    if (min > max) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนเงินขั้นต่ำต้องไม่เกินจำนวนเงินสูงสุด',
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// Middleware สำหรับตรวจสอบ search parameter
export const validateSearchParam = (req: Request, res: Response, next: NextFunction): void => {
  const { search } = req.query;

  if (search !== undefined) {
    const searchStr = search as string;
    
    // ตรวจสอบความยาว
    if (searchStr.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'คำค้นหาต้องไม่เกิน 100 ตัวอักษร',
        timestamp: new Date().toISOString(),
      });
    }

    // ตรวจสอบอักขระพิเศษ
    const invalidChars = /[<>{}]/;
    if (invalidChars.test(searchStr)) {
      return res.status(400).json({
        success: false,
        error: 'คำค้นหามีอักขระที่ไม่ได้รับอนุญาต',
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// Middleware สำหรับตรวจสอบ ID parameter
export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุ ID',
      timestamp: new Date().toISOString(),
    });
  }

  // ตรวจสอบรูปแบบ ID (UUID หรือ custom format)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customIdPattern = /^REV-\d{8}-\d{5}$/;
  
  if (!uuidPattern.test(id) && !customIdPattern.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'รูปแบบ ID ไม่ถูกต้อง',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}; 