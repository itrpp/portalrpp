import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

// Rate limiting configuration
export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 นาที
  max: config.rateLimitMaxRequests, // จำกัด 100 requests ต่อ window
  message: {
    error: 'เกินขีดจำกัดการเรียกใช้ API กรุณาลองใหม่อีกครั้งในภายหลัง',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      success: false,
      error: 'เกินขีดจำกัดการเรียกใช้ API กรุณาลองใหม่อีกครั้งในภายหลัง',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // ข้าม rate limiting สำหรับ health check
    return req.path === '/health';
  },
});

// Specific rate limiters for different endpoints
export const revenueCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 10, // จำกัด 10 requests ต่อนาที
  message: {
    error: 'เกินขีดจำกัดการสร้างรายการรายได้ กรุณาลองใหม่อีกครั้งในภายหลัง',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Revenue create rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      error: 'เกินขีดจำกัดการสร้างรายการรายได้ กรุณาลองใหม่อีกครั้งในภายหลัง',
      retryAfter: 60,
      timestamp: new Date().toISOString(),
    });
  },
});

export const reportGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 นาที
  max: 5, // จำกัด 5 requests ต่อ 5 นาที
  message: {
    error: 'เกินขีดจำกัดการสร้างรายงาน กรุณาลองใหม่อีกครั้งในภายหลัง',
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Report generation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      error: 'เกินขีดจำกัดการสร้างรายงาน กรุณาลองใหม่อีกครั้งในภายหลัง',
      retryAfter: 300,
      timestamp: new Date().toISOString(),
    });
  },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 30, // จำกัด 30 requests ต่อนาที
  message: {
    error: 'เกินขีดจำกัดการค้นหา กรุณาลองใหม่อีกครั้งในภายหลัง',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      error: 'เกินขีดจำกัดการค้นหา กรุณาลองใหม่อีกครั้งในภายหลัง',
      retryAfter: 60,
      timestamp: new Date().toISOString(),
    });
  },
}); 
