// ========================================
// Request Validation Middleware
// ========================================

import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

// ========================================
// VALIDATION HELPERS
// ========================================

export const validateRequest = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: errors.array(),
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        message: 'Request validation failed',
        errors: errors.array(),
        code: 'VALIDATION_FAILED',
        timestamp: new Date().toISOString(),
      });
    }
    
    next();
  };
};

// ========================================
// COMMON VALIDATIONS
// ========================================

export const validateAuthRequest = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest,
];

export const validateAdminRequest = [
  body('action').isIn(['create', 'update', 'delete', 'read']).withMessage('Invalid action'),
  validateRequest,
];

export const validateHealthCheck = [
  // No validation needed for health checks
  (req: Request, res: Response, next: NextFunction) => next(),
];

// ========================================
// CUSTOM VALIDATIONS
// ========================================

export const validateServiceName = (req: Request, res: Response, next: NextFunction) => {
  const serviceName = req.params.serviceName;
  const validServices = ['auth', 'admin'];
  
  if (!validServices.includes(serviceName)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service name',
      code: 'INVALID_SERVICE',
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

export const validateApiVersion = (req: Request, res: Response, next: NextFunction) => {
  const version = req.params.version || req.headers['api-version'];
  const validVersions = ['v1', 'v2'];
  
  if (version && !validVersions.includes(version as string)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid API version',
      code: 'INVALID_VERSION',
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// ========================================
// SANITIZATION
// ========================================

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).trim();
      }
    });
  }
  
  next();
};

// ========================================
// RATE LIMIT VALIDATION
// ========================================

export const validateRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const rateLimit = (req as any).rateLimit;
  
  if (rateLimit && rateLimit.remaining <= 0) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  validateRequest,
  validateAuthRequest,
  validateAdminRequest,
  validateHealthCheck,
  validateServiceName,
  validateApiVersion,
  sanitizeInput,
  validateRateLimit,
}; 
