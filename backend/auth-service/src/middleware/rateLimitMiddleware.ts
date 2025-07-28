import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Rate limiting storage (ตาม Security Requirements)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const registerAttempts = new Map<string, { count: number; resetTime: number }>();
const ldapAttempts = new Map<string, { count: number; resetTime: number }>();

// Default rate limit configuration (ตาม Security Requirements)
const DEFAULT_LOGIN_MAX_ATTEMPTS = 5; // 5 ครั้ง/15 นาที ตาม Security Requirements
const DEFAULT_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 นาที ตาม Security Requirements
const DEFAULT_REGISTER_MAX_ATTEMPTS = 3; // 3 ครั้ง/ชั่วโมง ตาม Security Requirements
const DEFAULT_REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 ชั่วโมง ตาม Security Requirements
const DEFAULT_LDAP_MAX_ATTEMPTS = 10; // 10 ครั้ง/นาที ตาม Security Requirements
const DEFAULT_LDAP_WINDOW_MS = 60 * 1000; // 1 นาที ตาม Security Requirements

/**
 * Rate limiting middleware สำหรับ login
 */
import { getClientIP } from '../index';

export const loginRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const maxAttempts = DEFAULT_LOGIN_MAX_ATTEMPTS;
  const windowMs = DEFAULT_LOGIN_WINDOW_MS;

  const userAttempts = loginAttempts.get(clientIP);

  if (!userAttempts || now > userAttempts.resetTime) {
    loginAttempts.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    userAttempts.count++;

    if (userAttempts.count > maxAttempts) {
      logger.warn('Login rate limit exceeded', {
        ip: clientIP,
        count: userAttempts.count,
        maxAttempts,
      });
      return res.status(429).json({
        success: false,
        message: 'เกินขีดจำกัดการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้งใน 15 นาที',
      });
    }
  }

  next();
};

/**
 * Rate limiting middleware สำหรับ register
 */
export const registerRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const maxAttempts = DEFAULT_REGISTER_MAX_ATTEMPTS;
  const windowMs = DEFAULT_REGISTER_WINDOW_MS;

  const userAttempts = registerAttempts.get(clientIP);

  if (!userAttempts || now > userAttempts.resetTime) {
    registerAttempts.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    userAttempts.count++;

    if (userAttempts.count > maxAttempts) {
      logger.warn('Register rate limit exceeded', {
        ip: clientIP,
        count: userAttempts.count,
        maxAttempts,
      });
      return res.status(429).json({
        success: false,
        message: 'เกินขีดจำกัดการสมัครสมาชิก กรุณาลองใหม่อีกครั้งใน 1 ชั่วโมง',
      });
    }
  }

  next();
};

/**
 * ล้าง rate limiting สำหรับ login
 */
export const clearLoginAttempts = (clientIP: string): void => {
  loginAttempts.delete(clientIP);
  logger.debug('Login attempts cleared', { ip: clientIP });
};

/**
 * Rate limiting middleware สำหรับ LDAP
 */
export const ldapRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const maxAttempts = DEFAULT_LDAP_MAX_ATTEMPTS;
  const windowMs = DEFAULT_LDAP_WINDOW_MS;

  const userAttempts = ldapAttempts.get(clientIP);

  if (!userAttempts || now > userAttempts.resetTime) {
    ldapAttempts.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    userAttempts.count++;

    if (userAttempts.count > maxAttempts) {
      logger.warn('LDAP rate limit exceeded', {
        ip: clientIP,
        count: userAttempts.count,
        maxAttempts,
      });
      return res.status(429).json({
        success: false,
        message: 'เกินขีดจำกัดการเข้าสู่ระบบ LDAP กรุณาลองใหม่อีกครั้งใน 1 นาที',
      });
    }
  }

  next();
};

/**
 * ล้าง rate limiting สำหรับ register
 */
export const clearRegisterAttempts = (clientIP: string): void => {
  registerAttempts.delete(clientIP);
  logger.debug('Register attempts cleared', { ip: clientIP });
};

/**
 * ล้าง rate limiting สำหรับ LDAP
 */
export const clearLDAPAttempts = (clientIP: string): void => {
  ldapAttempts.delete(clientIP);
  logger.debug('LDAP attempts cleared', { ip: clientIP });
};

/**
 * ดูข้อมูล rate limiting
 */
export const getRateLimitInfo = (clientIP: string) => {
  const loginInfo = loginAttempts.get(clientIP);
  const registerInfo = registerAttempts.get(clientIP);
  const ldapInfo = ldapAttempts.get(clientIP);

  return {
    login: loginInfo
      ? {
        count: loginInfo.count,
        resetTime: loginInfo.resetTime,
        remaining: DEFAULT_LOGIN_MAX_ATTEMPTS - loginInfo.count,
      }
      : null,
    register: registerInfo
      ? {
        count: registerInfo.count,
        resetTime: registerInfo.resetTime,
        remaining: DEFAULT_REGISTER_MAX_ATTEMPTS - registerInfo.count,
      }
      : null,
    ldap: ldapInfo
      ? {
        count: ldapInfo.count,
        resetTime: ldapInfo.resetTime,
        remaining: DEFAULT_LDAP_MAX_ATTEMPTS - ldapInfo.count,
      }
      : null,
  };
};
