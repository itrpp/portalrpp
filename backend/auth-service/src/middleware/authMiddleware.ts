import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService, JwtPayload } from '../services/authService';
import { logger } from '../utils/logger';
import { getClientIP } from '../index';

// สร้าง interface สำหรับ user ใน request
interface UserRequest {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

// ขยาย Request interface เพื่อเพิ่ม user property
declare global {
  namespace Express {
    interface Request {
      user?: UserRequest;
    }
  }
}

/**
 * Middleware สำหรับตรวจสอบ JWT Access Token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', { ip: getClientIP(req) });
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Access Token',
      });
    }

    logger.debug('Verifying access token...');
    const result = await AuthService.verifyAccessToken(token);

    if (!result.success) {
      logger.warn('Authentication failed', { error: result.message, ip: getClientIP(req) });
      return res.status(401).json(result);
    }

    // ตรวจสอบว่า user ยังคงมีอยู่ในฐานข้อมูลหรือไม่
    if (!result.user) {
      logger.warn('Authentication failed: User not found in database', { ip: getClientIP(req) });
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
      });
    }

    logger.info('Authentication successful', { userId: result.user.id, email: result.user.email });
    // เพิ่ม user ลงใน request object
    req.user = result.user as unknown as UserRequest;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Authentication middleware error', { error: errorMessage, ip: getClientIP(req) });
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบ Session Token
 */
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;

    if (!sessionToken) {
      logger.warn('Session authentication failed: No session token provided', { ip: getClientIP(req) });
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Session Token',
      });
    }

    logger.debug('Validating session token...');
    const result = await AuthService.validateSession(sessionToken);

    if (!result.success) {
      logger.warn('Session authentication failed', { error: result.message, ip: getClientIP(req) });
      return res.status(401).json(result);
    }

    // ตรวจสอบว่า user ยังคงมีอยู่ในฐานข้อมูลหรือไม่
    if (!result.user) {
      logger.warn('Session authentication failed: User not found in database', { ip: getClientIP(req) });
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
      });
    }

    logger.info('Session authentication successful', { userId: result.user.id, email: result.user.email });
    // เพิ่ม user ลงใน request object
    req.user = result.user as unknown as UserRequest;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Session authentication middleware error', { error: errorMessage, ip: getClientIP(req) });
    return res.status(401).json({
      success: false,
      message: 'Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบสิทธิ์ (Authorization)
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    // ตรวจสอบ role ของผู้ใช้ (แปลงเป็นตัวพิมพ์เล็กเพื่อเปรียบเทียบ)
    const userRole = (req.user.role ?? 'user').toLowerCase();
    const allowedRoles = roles.map(role => role.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Role check failed', {
        userRole: req.user.role,
        allowedRoles: roles,
        userId: req.user.id,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง',
      });
    }

    logger.debug('Role check passed', { userRole: req.user.role, userId: req.user.id });
    next();
  };
};

/**
 * Middleware สำหรับตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ ID ของข้อมูล',
      });
    }

    // ตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
    if (req.user.id !== resourceUserId) {
      logger.warn('Ownership check failed', {
        userId: req.user.id,
        resourceUserId,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
      });
    }

    next();
  };
};

/**
 * Middleware สำหรับตรวจสอบ JWT token แบบ manual
 */
export const verifyJWT = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'your-secret-key') as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Middleware สำหรับตรวจสอบ token expiration
 */
export const checkTokenExpiration = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    const decoded = verifyJWT(token);
    if (decoded?.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= decoded.exp) {
        return res.status(401).json({
          success: false,
          message: 'Token หมดอายุ กรุณาใช้ Refresh Token',
        });
      }
    }
  }

  next();
};

/**
 * Middleware สำหรับ rate limiting (พื้นฐาน)
 */
export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
    const now = Date.now();

    const userRequests = requests.get(ip);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      userRequests.count++;

      if (userRequests.count > maxRequests) {
        logger.warn('Rate limit exceeded', { ip, count: userRequests.count, maxRequests });
        return res.status(429).json({
          success: false,
          message: 'เกินขีดจำกัดการเรียก API',
        });
      }
    }

    next();
  };
};
