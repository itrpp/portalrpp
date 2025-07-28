// ========================================
// Rate Limiting Middleware
// ========================================

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../config/index.js';
import { logRateLimit } from '../utils/logger.js';

// ========================================
// RATE LIMITERS
// ========================================

// General Rate Limiter
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.general.windowMs,
  max: config.rateLimit.general.maxRequests,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP',
    retryAfter: Math.ceil(config.rateLimit.general.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    logRateLimit(ip || 'unknown', config.rateLimit.general.maxRequests, 0);
    return ip;
  },
  skip: (req: Request) => {
    // ข้าม rate limiting สำหรับ health checks และ metrics
    return req.path === '/health' || 
           req.path === '/metrics' || 
           req.path === '/api/docs';
  },
});

// Auth Rate Limiter (เข้มงวดกว่า)
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.maxRequests,
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts',
    retryAfter: Math.ceil(config.rateLimit.auth.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    logRateLimit(ip || 'unknown', config.rateLimit.auth.maxRequests, 0);
    return ip;
  },
  skip: (req: Request) => {
    // ข้าม rate limiting สำหรับ health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

// Validate Session Rate Limiter (ผ่อนคลายกว่า auth แต่เข้มงวดกว่า admin)
export const validateSessionRateLimiter = rateLimit({
  windowMs: config.rateLimit.validateSession.windowMs,
  max: config.rateLimit.validateSession.maxRequests,
  message: {
    error: 'VALIDATE_SESSION_RATE_LIMIT_EXCEEDED',
    message: 'Too many session validation requests',
    retryAfter: Math.ceil(config.rateLimit.validateSession.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    logRateLimit(ip || 'unknown', config.rateLimit.validateSession.maxRequests, 0);
    return ip;
  },
  skip: (req: Request) => {
    // ข้าม rate limiting สำหรับ health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

// Admin Rate Limiter (ผ่อนคลายกว่า)
export const adminRateLimiter = rateLimit({
  windowMs: config.rateLimit.admin.windowMs,
  max: config.rateLimit.admin.maxRequests,
  message: {
    error: 'ADMIN_RATE_LIMIT_EXCEEDED',
    message: 'Too many admin requests',
    retryAfter: Math.ceil(config.rateLimit.admin.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    logRateLimit(ip || 'unknown', config.rateLimit.admin.maxRequests, 0);
    return ip;
  },
  skip: (req: Request) => {
    // ข้าม rate limiting สำหรับ health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

// ========================================
// SLOW DOWN MIDDLEWARE
// ========================================

export const slowDownMiddleware = slowDown({
  windowMs: config.rateLimit.slowDown.windowMs,
  delayAfter: config.rateLimit.slowDown.delayAfter,
  delayMs: () => config.rateLimit.slowDown.delayMs,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return ip;
  },
  skip: (req: Request) => {
    // ข้าม slow down สำหรับ health checks และ metrics
    return req.path === '/health' || 
           req.path === '/metrics' || 
           req.path === '/api/docs';
  },
});

// ========================================
// RATE LIMIT MONITOR
// ========================================

export const rateLimitMonitor = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function (body: any) {
    if (res.statusCode === 429) {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      logRateLimit(ip || 'unknown', 0, 0);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// ========================================
// RATE LIMIT CONFIGURATION HELPER
// ========================================

export const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  message: string,
  code: string,
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const ip = req.ip || req.connection.remoteAddress;
      const limit = (req as any).rateLimit?.limit || maxRequests;
      const remaining = (req as any).rateLimit?.remaining || 0;
      
      logRateLimit(ip || 'unknown', limit, remaining);
      
      res.status(429).json({
        success: false,
        message,
        code,
        retryAfter: Math.ceil(windowMs / 1000),
        limit,
        remaining,
        timestamp: new Date().toISOString(),
      });
    },
    keyGenerator: (req: Request) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  });
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  generalRateLimiter,
  authRateLimiter,
  validateSessionRateLimiter,
  adminRateLimiter,
  slowDownMiddleware,
  rateLimitMonitor,
  createRateLimiter,
}; 
