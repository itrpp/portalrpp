// ========================================
// RATE LIMITING MIDDLEWARE
// ========================================

import rateLimit from 'express-rate-limit';
import config from '@/config';
import { logWarn } from '@/utils/logger';

// สร้าง rate limiter สำหรับ API ทั่วไป
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'คุณส่งคำขอมากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    res.status(429).json({
      success: false,
      message: 'คุณส่งคำขอมากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
      timestamp: new Date(),
    });
  },
});

// สร้าง rate limiter สำหรับการอัปโหลดไฟล์
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 10, // สูงสุด 10 ไฟล์ต่อ 15 นาที
  message: {
    success: false,
    message: 'คุณอัปโหลดไฟล์มากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Upload rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    res.status(429).json({
      success: false,
      message: 'คุณอัปโหลดไฟล์มากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
      timestamp: new Date(),
    });
  },
});

// สร้าง rate limiter สำหรับการตรวจสอบไฟล์
export const validationRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 นาที
  max: 50, // สูงสุด 50 ครั้งต่อ 5 นาที
  message: {
    success: false,
    message: 'คุณตรวจสอบไฟล์มากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Validation rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    res.status(429).json({
      success: false,
      message: 'คุณตรวจสอบไฟล์มากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
      timestamp: new Date(),
    });
  },
});

export default {
  apiRateLimiter,
  uploadRateLimiter,
  validationRateLimiter,
}; 