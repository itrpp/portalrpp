import { Request, Response, NextFunction } from 'express';
import { ValidationUtils } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

/**
 * Validation Middleware
 * จัดการ input validation ในระดับ middleware
 */

export class ValidationMiddleware {
  /**
   * ตรวจสอบข้อมูลการเข้าสู่ระบบ
   */
  static validateLogin(req: Request, res: Response, next: NextFunction): void {
    const { email, password } = req.body;

    const validation = ValidationUtils.validateLoginCredentials(email, password);

    if (!validation.isValid) {
      logger.warn('Login validation failed', { email, errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Validation failed');
    }

    // ทำความสะอาดข้อมูล
    req.body.email = ValidationUtils.sanitizeEmail(email);
    req.body.password = password.trim();

    next();
  }

  /**
   * ตรวจสอบข้อมูลการสมัครสมาชิก
   */
  static validateRegistration(req: Request, res: Response, next: NextFunction): void {
    const { name, email, password, role } = req.body;

    const validation = ValidationUtils.validateRegistrationData(name, email, password);

    if (!validation.isValid) {
      logger.warn('Registration validation failed', { email, errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Registration validation failed');
    }

    // ตรวจสอบ role ถ้ามี
    if (role) {
      const roleValidation = ValidationUtils.validateRole(role);
      if (!roleValidation.isValid) {
        logger.warn('Role validation failed', { role, errors: roleValidation.errors });
        return ErrorHandler.createValidationError(res, roleValidation.errors[0] || 'Role validation failed');
      }
    }

    // ทำความสะอาดข้อมูล
    req.body.name = ValidationUtils.sanitizeInput(name);
    req.body.email = ValidationUtils.sanitizeEmail(email);
    req.body.password = password.trim();
    req.body.role = role ?? 'user';

    next();
  }

  /**
   * ตรวจสอบข้อมูลการเปลี่ยนรหัสผ่าน
   */
  static validatePasswordChange(req: Request, res: Response, next: NextFunction): void {
    const { currentPassword, newPassword } = req.body;

    const validation = ValidationUtils.validatePasswordChange(currentPassword, newPassword);

    if (!validation.isValid) {
      logger.warn('Password change validation failed', { errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Password change validation failed');
    }

    // ทำความสะอาดข้อมูล
    req.body.currentPassword = currentPassword.trim();
    req.body.newPassword = newPassword.trim();

    next();
  }

  /**
   * ตรวจสอบ session token
   */
  static validateSessionToken(req: Request, res: Response, next: NextFunction): void {
    const { sessionToken } = req.body;

    const validation = ValidationUtils.validateSessionToken(sessionToken);

    if (!validation.isValid) {
      logger.warn('Session token validation failed', { errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Session token validation failed');
    }

    next();
  }

  /**
   * ตรวจสอบ access token
   */
  static validateAccessToken(req: Request, res: Response, next: NextFunction): void {
    const { accessToken } = req.body;

    const validation = ValidationUtils.validateAccessToken(accessToken);

    if (!validation.isValid) {
      logger.warn('Access token validation failed', { errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Access token validation failed');
    }

    next();
  }

  /**
   * ตรวจสอบ refresh token
   */
  static validateRefreshToken(req: Request, res: Response, next: NextFunction): void {
    const { refreshToken } = req.body;

    const validation = ValidationUtils.validateRefreshToken(refreshToken);

    if (!validation.isValid) {
      logger.warn('Refresh token validation failed', { errors: validation.errors });
      return ErrorHandler.createValidationError(res, validation.errors[0] || 'Refresh token validation failed');
    }

    next();
  }

  /**
   * ตรวจสอบข้อมูลการอัปเดตโปรไฟล์
   */
  static validateProfileUpdate(req: Request, res: Response, next: NextFunction): void {
    const { name, email, image } = req.body;

    // ตรวจสอบชื่อ
    if (name) {
      const nameValidation = ValidationUtils.validateName(name);
      if (!nameValidation.isValid) {
        logger.warn('Name validation failed', { name, errors: nameValidation.errors });
        return ErrorHandler.createValidationError(res, nameValidation.errors[0] || 'Name validation failed');
      }
    }

    // ตรวจสอบอีเมล
    if (email) {
      if (!ValidationUtils.isValidEmail(email)) {
        logger.warn('Email validation failed', { email });
        return ErrorHandler.createValidationError(res, 'รูปแบบอีเมลไม่ถูกต้อง');
      }
    }

    // ตรวจสอบ URL รูปภาพ
    if (image && !ValidationUtils.isValidUrl(image)) {
      logger.warn('Image URL validation failed', { image });
      return ErrorHandler.createValidationError(res, 'URL รูปภาพไม่ถูกต้อง');
    }

    // ทำความสะอาดข้อมูล
    if (name) req.body.name = ValidationUtils.sanitizeInput(name);
    if (email) req.body.email = ValidationUtils.sanitizeEmail(email);

    next();
  }

  /**
   * ตรวจสอบข้อมูลการลบบัญชี
   */
  static validateAccountDeletion(req: Request, res: Response, next: NextFunction): void {
    const { password } = req.body;

    if (!password || password.trim().length === 0) {
      logger.warn('Account deletion validation failed', { error: 'Password is required' });
      return ErrorHandler.createValidationError(res, 'กรุณากรอกรหัสผ่านเพื่อยืนยันการลบบัญชี');
    }

    req.body.password = password.trim();
    next();
  }

  /**
   * ตรวจสอบข้อมูล LDAP login
   */
  static validateLDAPLogin(req: Request, res: Response, next: NextFunction): void {
    const { username, password } = req.body;

    if (!username || username.trim().length === 0) {
      logger.warn('LDAP login validation failed', { error: 'Username is required' });
      return ErrorHandler.createValidationError(res, 'กรุณากรอกชื่อผู้ใช้');
    }

    if (!password || password.trim().length === 0) {
      logger.warn('LDAP login validation failed', { error: 'Password is required' });
      return ErrorHandler.createValidationError(res, 'กรุณากรอกรหัสผ่าน');
    }

    // ทำความสะอาดข้อมูล
    req.body.username = username.trim();
    req.body.password = password.trim();

    next();
  }

  /**
   * ตรวจสอบ query parameters
   */
  static validateQueryParams(req: Request, res: Response, next: NextFunction): void {
    const { userId, page, limit } = req.query;

    // ตรวจสอบ userId
    if (userId && typeof userId !== 'string') {
      return ErrorHandler.createValidationError(res, 'userId ต้องเป็น string');
    }

    // ตรวจสอบ page
    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        return ErrorHandler.createValidationError(res, 'page ต้องเป็นตัวเลขที่มากกว่า 0');
      }
    }

    // ตรวจสอบ limit
    if (limit) {
      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ErrorHandler.createValidationError(res, 'limit ต้องเป็นตัวเลขระหว่าง 1-100');
      }
    }

    next();
  }

  /**
   * ตรวจสอบและทำความสะอาดข้อมูลทั่วไป
   */
  static sanitizeInput(req: Request, res: Response, next: NextFunction): void {
    // ทำความสะอาดข้อมูลใน body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }

    // ทำความสะอาดข้อมูลใน query
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = (req.query[key] as string).trim();
        }
      });
    }

    next();
  }

  /**
   * ตรวจสอบ Content-Type
   */
  static validateContentType(req: Request, res: Response, next: NextFunction): void {
    const contentType = req.get('Content-Type');

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType?.includes('application/json')) {
        return ErrorHandler.createValidationError(res, 'Content-Type ต้องเป็น application/json');
      }
    }

    next();
  }

  /**
   * ตรวจสอบขนาด request body
   */
  static validateBodySize(req: Request, res: Response, next: NextFunction): void {
    const contentLength = parseInt(req.get('Content-Length') ?? '0');
    const maxSize = 1024 * 1024; // 1MB

    if (contentLength > maxSize) {
      return ErrorHandler.createValidationError(res, 'ขนาดข้อมูลเกินกว่าที่กำหนด (1MB)');
    }

    next();
  }
}

// Export middleware functions
export const validateLogin = ValidationMiddleware.validateLogin.bind(ValidationMiddleware);
export const validateRegistration = ValidationMiddleware.validateRegistration.bind(ValidationMiddleware);
export const validatePasswordChange = ValidationMiddleware.validatePasswordChange.bind(ValidationMiddleware);
export const validateSessionToken = ValidationMiddleware.validateSessionToken.bind(ValidationMiddleware);
export const validateAccessToken = ValidationMiddleware.validateAccessToken.bind(ValidationMiddleware);
export const validateRefreshToken = ValidationMiddleware.validateRefreshToken.bind(ValidationMiddleware);
export const validateProfileUpdate = ValidationMiddleware.validateProfileUpdate.bind(ValidationMiddleware);
export const validateAccountDeletion = ValidationMiddleware.validateAccountDeletion.bind(ValidationMiddleware);
export const validateLDAPLogin = ValidationMiddleware.validateLDAPLogin.bind(ValidationMiddleware);
export const validateQueryParams = ValidationMiddleware.validateQueryParams.bind(ValidationMiddleware);
export const sanitizeInput = ValidationMiddleware.sanitizeInput.bind(ValidationMiddleware);
export const validateContentType = ValidationMiddleware.validateContentType.bind(ValidationMiddleware);
export const validateBodySize = ValidationMiddleware.validateBodySize.bind(ValidationMiddleware);
