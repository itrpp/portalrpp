import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from './logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication Middleware สำหรับตรวจสอบ JWT Token
 * ตรวจสอบ Authorization header และ validate JWT token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // ตรวจสอบ Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn({ 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      }, 'Missing authorization header');
      return res.status(401).json({ 
        message: 'Missing authorization header',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    // ตรวจสอบ Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn({ 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      }, 'Invalid authorization header format');
      return res.status(401).json({ 
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    // แยก token ออกจาก Bearer prefix
    const token = authHeader.substring(7);
    
    if (!token) {
      logger.warn({ 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      }, 'Empty token in authorization header');
      return res.status(401).json({ 
        message: 'Empty token',
        code: 'EMPTY_TOKEN'
      });
    }

    // ตรวจสอบและ decode JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // ตรวจสอบว่ามีข้อมูล user ที่จำเป็น
    if (!decoded.sub || !decoded.iat || !decoded.exp) {
      logger.warn({ 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path,
        tokenPayload: { sub: decoded.sub, iat: decoded.iat, exp: decoded.exp }
      }, 'Invalid token structure');
      return res.status(401).json({ 
        message: 'Invalid token structure',
        code: 'INVALID_TOKEN_STRUCTURE'
      });
    }

    // ตรวจสอบ token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      logger.warn({ 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path,
        tokenExp: decoded.exp,
        currentTime
      }, 'Token expired');
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // เก็บข้อมูล user ใน request object
    req.user = {
      id: decoded.sub,
      department: decoded.department,
      title: decoded.title,
      groups: decoded.groups,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    logger.info({ 
      userId: decoded.sub,
      ip: req.ip,
      path: req.path,
      role: decoded.role
    }, 'Authentication successful');

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ 
        error: error.message,
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      }, 'JWT verification failed');
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn({ 
        error: error.message,
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      }, 'Token expired');
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      path: req.path 
    }, 'Authentication middleware error');
    
    return res.status(500).json({ 
      message: 'Internal server error during authentication',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
}

/**
 * Optional Authentication Middleware
 * ตรวจสอบ token ถ้ามี แต่ไม่ reject request ถ้าไม่มี
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // ไม่มี token หรือ format ไม่ถูกต้อง - ผ่านไปได้
    return next();
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (decoded.sub && decoded.iat && decoded.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp >= currentTime) {
        req.user = {
          id: decoded.sub,
          department: decoded.department,
          title: decoded.title,
          groups: decoded.groups,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp
        };
      }
    }
  } catch {
    // ไม่ log error สำหรับ optional auth
    // แค่ไม่ set req.user
  }

  next();
}


