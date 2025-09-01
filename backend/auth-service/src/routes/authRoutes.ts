import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LDAPService } from '../services/ldapService';
import { ValidationMiddleware } from '../middleware/validationMiddleware';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { loginRateLimit, registerRateLimit, ldapRateLimit, clearLoginAttempts, clearRegisterAttempts, clearLDAPAttempts } from '../middleware/rateLimitMiddleware';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { getClientIP } from '../index';

const prisma = new PrismaClient();

const router = Router();

/**
 * POST /auth/register
 * สมัครสมาชิก
 */
router.post(
  '/register',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateRegistration,
  registerRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;

      logger.info('Registration attempt', { email, role });

      const result = await AuthService.register({ name, email, password, role });

      if (result.success) {
        // ล้าง rate limiting เมื่อสมัครสมาชิกสำเร็จ
        const clientIP = getClientIP(req);
        clearRegisterAttempts(clientIP);

        logger.auth('User registered successfully', result.user?.id, undefined, { email, role });
        return ErrorHandler.createCreatedResponse(res, result, 'สมัครสมาชิกสำเร็จ');
      } else {
        logger.warn('Registration failed', { email, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Registration error', { error: errorMessage, email: req.body.email });
      return ErrorHandler.handleError(res, error);
    }
  },
);

/**
 * POST /auth/login
 * เข้าสู่ระบบ (Local Authentication)
 */
router.post(
  '/login',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateLogin,
  loginRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { email, password, authMethod } = req.body;

      logger.info('Login attempt', { email, authMethod });

      // ดึงข้อมูล IP และ User Agent
      const clientIP = getClientIP(req);
      const userAgent = req.get('User-Agent') ?? 'unknown';

      const result = await AuthService.login({ email, password, authMethod }, clientIP, userAgent);

      if (result.success) {
        // ล้าง rate limiting เมื่อเข้าสู่ระบบสำเร็จ
        clearLoginAttempts(clientIP);

        logger.auth('User logged in successfully', result.user?.id, result.sessionToken, { email, authMethod });
        return res.status(200).json(result);
      } else {
        logger.warn('Login failed', { email, error: result.message });
        return res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Login error', { error: errorMessage, email: req.body.email });
      return ErrorHandler.handleError(res, error);
    }
  },
);

/**
 * POST /auth/login-ldap
 * เข้าสู่ระบบ (LDAP Authentication)
 */
router.post(
  '/login-ldap',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateLDAPLogin,
  ldapRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      logger.info('LDAP login attempt', { username });

      // ดึงข้อมูล IP และ User Agent
      const clientIP = getClientIP(req);
      const userAgent = req.get('User-Agent') ?? 'unknown';

      const result = await AuthService.loginLDAP({ username, password }, clientIP, userAgent);

      if (result.success) {
        // ล้าง rate limiting เมื่อเข้าสู่ระบบสำเร็จ
        clearLDAPAttempts(clientIP);

        logger.auth('User logged in via LDAP successfully', result.user?.id, result.sessionToken, { username });
        return res.status(200).json(result);
      } else {
        logger.warn('LDAP login failed', { username, error: result.message });
        return res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('LDAP login error', { error: errorMessage, username: req.body.username });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ LDAP',
      });
    }
  },
);

/**
 * POST /auth/refresh
 * ต่ออายุ Access Token
 */
router.post(
  '/refresh',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateRefreshToken,
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      logger.info('Token refresh attempt');

      const result = await AuthService.refreshAccessToken(refreshToken);

      if (result.success) {
        logger.auth('Token refreshed successfully', result.user?.id);
        return res.status(200).json(result);
      } else {
        logger.warn('Token refresh failed', { error: result.message });
        return res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token refresh error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการ refresh token',
      });
    }
  },
);

/**
 * POST /auth/verify-token
 * ตรวจสอบ Access Token
 */
router.post(
  '/verify-token',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateAccessToken,
  async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;

      logger.info('Token verification attempt');

      const result = await AuthService.verifyAccessToken(accessToken);

      if (result.success) {
        logger.auth('Token verified successfully', result.user?.id);
        return res.status(200).json(result);
      } else {
        logger.warn('Token verification failed', { error: result.message });
        return res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token verification error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ token',
      });
    }
  },
);

/**
 * GET /auth/client/ip
 * ดึง IP address ของ client
 */
router.get('/client/ip', async (req: Request, res: Response) => {
  try {
    const clientIP = req.ip ?? req.connection.remoteAddress ?? 'unknown';

    logger.info('Client IP requested', { clientIP });

    return res.status(200).json({
      success: true,
      ip: clientIP,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting client IP', { error: errorMessage });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล IP',
    });
  }
});

/**
 * POST /auth/logout
 * ออกจากระบบ
 */
router.post(
  '/logout',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateSessionToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionToken } = req.body;

      logger.info('Logout attempt');

      const result = await AuthService.logout(sessionToken);

      if (result.success) {
        logger.auth('User logged out successfully', result.user?.id, sessionToken);
        return res.status(200).json(result);
      } else {
        logger.warn('Logout failed', { error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      });
    }
  },
);

/**
 * POST /auth/logout-all
 * ออกจากระบบทั้งหมด (ลบทุก session)
 */
router.post(
  '/logout-all',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  async (req: Request, res: Response) => {
    try {
      const { userId, sessionToken } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!userId && !sessionToken) {
        return ErrorHandler.createValidationError(res, 'กรุณาระบุ userId หรือ sessionToken');
      }

      let targetUserId = userId;

      // ถ้าไม่มี userId แต่มี sessionToken ให้ค้นหา userId จาก session
      if (!targetUserId && sessionToken) {
        const session = await prisma.session.findUnique({
          where: { sessionToken },
          include: { user: true },
        });

        if (!session) {
          return ErrorHandler.createAuthError(res, 'Session token ไม่ถูกต้อง');
        }

        targetUserId = session.userId;
      }

      if (!targetUserId) {
        return ErrorHandler.createValidationError(res, 'ไม่พบข้อมูลผู้ใช้');
      }

      logger.info('Logout all sessions attempt', { userId: targetUserId });

      const result = await AuthService.logoutAllSessions(targetUserId);

      if (result.success) {
        logger.auth('All sessions logged out successfully', targetUserId);
        return res.status(200).json(result);
      } else {
        logger.warn('Logout all sessions failed', { userId: targetUserId, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout all sessions error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบทั้งหมด',
      });
    }
  },
);

/**
 * POST /auth/validate-session
 * ตรวจสอบ Session
 */
router.post(
  '/validate-session',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateSessionToken,
  async (req: Request, res: Response) => {
    try {
      // รับ session token จาก body หรือ header
      const sessionToken = req.body.sessionToken || (req.headers['x-session-token'] || req.headers['X-Session-Token']) as string;

      if (!sessionToken) {
        logger.warn('Session validation failed - no session token provided');
        return res.status(401).json({
          success: false,
          message: 'ไม่พบ session token',
        });
      }

      logger.info('Session validation attempt');

      const result = await AuthService.validateSession(sessionToken);

      if (result.success) {
        logger.auth('Session validated successfully', result.user?.id, sessionToken);
        return res.status(200).json(result);
      } else {
        logger.warn('Session validation failed', { error: result.message });
        return res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Session validation error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ session',
      });
    }
  },
);

/**
 * POST /auth/test-ldap
 * ทดสอบการเชื่อมต่อ LDAP
 */
router.post('/test-ldap', ValidationMiddleware.validateContentType, ValidationMiddleware.validateBodySize, async (req: Request, res: Response) => {
  try {
    logger.info('LDAP connection test attempt');

    const result = await LDAPService.testConnection();

    if (result.success) {
      logger.info('LDAP connection test successful');
      return res.status(200).json(result);
    } else {
      logger.warn('LDAP connection test failed', { error: result.message });
      return res.status(500).json(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('LDAP connection test error', { error: errorMessage });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ LDAP',
    });
  }
});

/**
 * POST /auth/check-session-status
 * ตรวจสอบสถานะ Session แบบละเอียด
 */
router.post(
  '/check-session-status',
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateSessionToken,
  async (req: Request, res: Response) => {
    try {
      // รับ session token จาก body หรือ header
      const sessionToken = req.body.sessionToken || (req.headers['x-session-token'] || req.headers['X-Session-Token']) as string;

      if (!sessionToken) {
        logger.warn('Session status check failed - no session token provided');
        return res.status(401).json({
          success: false,
          message: 'ไม่พบ session token',
        });
      }

      logger.info('Session status check attempt');

      // ตรวจสอบ session ในฐานข้อมูล
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: {
          user: {
            include: {
              sessions: true,
              accounts: true,
            },
          },
        },
      });

      if (!session) {
        logger.warn('Session not found', { sessionToken });
        return res.status(401).json({
          success: false,
          message: 'ไม่พบ Session นี้',
          details: {
            sessionExists: false,
            userExists: false,
            isExpired: false,
          },
        });
      }

      const isExpired = session.expires < new Date();
      const userExists = !!session.user;

      if (isExpired) {
        logger.warn('Session expired', { sessionToken, expiredAt: session.expires });
        return res.status(401).json({
          success: false,
          message: 'Session หมดอายุแล้ว',
          details: {
            sessionExists: true,
            userExists,
            isExpired: true,
            expiredAt: session.expires,
          },
        });
      }

      if (!userExists) {
        logger.warn('User not found for session', { sessionToken });
        return res.status(401).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
          details: {
            sessionExists: true,
            userExists: false,
            isExpired: false,
          },
        });
      }

      // ตรวจสอบสถานะผู้ใช้
      if (!session.user.isActive) {
        logger.warn('User account is inactive', { userId: session.user.id });
        return res.status(401).json({
          success: false,
          message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน',
          details: {
            sessionExists: true,
            userExists: true,
            isExpired: false,
            userActive: false,
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { password: _unused, ...userWithoutPassword } = session.user;

      logger.auth('Session status check successful', session.user.id, sessionToken);
      return res.status(200).json({
        success: true,
        message: 'Session ถูกต้อง',
        user: userWithoutPassword,
        details: {
          sessionExists: true,
          userExists: true,
          isExpired: false,
          userActive: true,
          expiresAt: session.expires,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Session status check error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ session',
      });
    }
  },
);

/**
 * GET /auth/me
 * ข้อมูลผู้ใช้ปัจจุบัน
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // ตรวจสอบว่า req.user มีค่าหรือไม่
    if (!req.user) {
      // ลองตรวจสอบ session token จาก header
      const sessionToken = (req.headers['x-session-token'] || req.headers['X-Session-Token']) as string;
      
      if (sessionToken) {
        // ตรวจสอบ session
        const sessionResult = await AuthService.validateSession(sessionToken);
        if (sessionResult.success && sessionResult.user) {
          // ใช้ข้อมูลจาก session แทน
          const userResponse = {
            id: sessionResult.user.id,
            email: sessionResult.user.email,
            username: sessionResult.user.email,
            name: sessionResult.user.name ?? sessionResult.user.email,
            role: sessionResult.user.role ?? 'user',
            isActive: sessionResult.user.isActive !== undefined ? sessionResult.user.isActive : true,
            authMethod: 'local',
            department: '',
            displayName: sessionResult.user.name ?? sessionResult.user.email,
            createdAt: sessionResult.user.createdAt,
            updatedAt: sessionResult.user.updatedAt,
            lastLoginAt: new Date(),
          };

          logger.auth('User info retrieved successfully via session', sessionResult.user.id);
          return ErrorHandler.createSuccessResponse(res, userResponse, 'ข้อมูลผู้ใช้');
        }
      }

      return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
    }

    logger.info('Get user info attempt', { userId: req.user.id });

    // ดึงข้อมูลผู้ใช้ล่าสุดจากฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        sessions: true,
        accounts: true,
      },
    });

    if (!user) {
      logger.warn('User not found in database', { userId: req.user.id });
      return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้ในระบบ');
    }

    // สร้าง user object ในรูปแบบเดียวกับ login response
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.email,
      name: user.name ?? user.email,
      role: user.role ?? 'user',
      isActive: user.isActive !== undefined ? user.isActive : true,
      authMethod: user.authMethod ?? 'local',
      department: '',
      displayName: user.name ?? user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt ?? new Date(),
    };

    logger.auth('User info retrieved successfully', user.id);
    return ErrorHandler.createSuccessResponse(res, userResponse, 'ข้อมูลผู้ใช้');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get user info error', { error: errorMessage, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
    });
  }
});

/**
 * GET /auth/profile
 * ดึงข้อมูลโปรไฟล์ผู้ใช้
 */
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
    }

    logger.info('Get profile attempt', { userId });

    const result = await AuthService.getProfile(userId);

    if (result.success) {
      logger.auth('Profile retrieved successfully', userId);
      return res.status(200).json(result);
    } else {
      logger.warn('Profile retrieval failed', { userId, error: result.message });
      return res.status(400).json(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Profile retrieval error', { error: errorMessage, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์',
    });
  }
});

/**
 * PUT /auth/profile
 * อัปเดตโปรไฟล์ผู้ใช้
 */
router.put(
  '/profile',
  authenticateToken,
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateProfileUpdate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { name, email, image } = req.body;

      if (!userId) {
        return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
      }

      logger.info('Profile update attempt', { userId, updates: { name, email, image } });

      const result = await AuthService.updateProfile(userId, { name, email, image });

      if (result.success) {
        logger.auth('Profile updated successfully', userId);
        return res.status(200).json(result);
      } else {
        logger.warn('Profile update failed', { userId, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Profile update error', { error: errorMessage, userId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์',
      });
    }
  },
);

/**
 * PUT /auth/change-password
 * เปลี่ยนรหัสผ่าน
 */
router.put(
  '/change-password',
  authenticateToken,
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validatePasswordChange,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
      }

      logger.info('Password change attempt', { userId });

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      if (result.success) {
        logger.auth('Password changed successfully', userId);
        return res.status(200).json(result);
      } else {
        logger.warn('Password change failed', { userId, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Password change error', { error: errorMessage, userId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
      });
    }
  },
);

/**
 * DELETE /auth/account
 * ลบบัญชีผู้ใช้
 */
router.delete(
  '/account',
  authenticateToken,
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateAccountDeletion,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { password } = req.body;

      if (!userId) {
        return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
      }

      logger.info('Account deletion attempt', { userId });

      const result = await AuthService.deleteAccount(userId, password);

      if (result.success) {
        logger.auth('Account deleted successfully', userId);
        return res.status(200).json(result);
      } else {
        logger.warn('Account deletion failed', { userId, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Account deletion error', { error: errorMessage, userId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบบัญชี',
      });
    }
  },
);

/**
 * GET /auth/sessions
 * ดู session ทั้งหมดของผู้ใช้ (สำหรับ admin)
 */
router.get(
  '/sessions',
  authenticateToken,
  requireRole(['admin']),
  ValidationMiddleware.validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return ErrorHandler.createValidationError(res, 'กรุณาระบุ userId');
      }

      logger.info('Get user sessions attempt', { userId, adminId: req.user?.id });

      // ต้องเพิ่ม method ใน AuthService สำหรับดึง sessions
      // const sessions = await AuthService.getUserSessions(userId);

      return res.status(200).json({
        success: true,
        message: 'ข้อมูล sessions',
        // sessions
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get user sessions error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions',
      });
    }
  },
);

/**
 * POST /auth/revoke-session
 * ยกเลิก session เฉพาะ (สำหรับ admin)
 */
router.post(
  '/revoke-session',
  authenticateToken,
  requireRole(['admin']),
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateSessionToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionToken } = req.body;

      logger.info('Session revocation attempt', { sessionToken, adminId: req.user?.id });

      const result = await AuthService.logout(sessionToken);

      if (result.success) {
        logger.auth('Session revoked successfully', result.user?.id, sessionToken);
        return res.status(200).json(result);
      } else {
        logger.warn('Session revocation failed', { sessionToken, error: result.message });
        return res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Session revocation error', { error: errorMessage });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิก session',
      });
    }
  },
);

/**
 * GET /auth/active-sessions
 * ดึงรายการ session ที่ใช้งานอยู่
 */
router.get('/active-sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
    }

    logger.info('Get active sessions attempt', { userId });

    // ดึง session ที่ใช้งานอยู่ทั้งหมด
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expires: { gt: new Date() },
      },
      orderBy: { expires: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // แปลงข้อมูล session
    const activeSessions = sessions.map(session => ({
      id: session.id,
      sessionToken: session.sessionToken,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expires: session.expires,
      isCurrentSession: session.sessionToken === req.headers['x-session-token'],
    }));

    logger.auth('Active sessions retrieved successfully', userId);
    return res.status(200).json({
      success: true,
      message: 'ดึงรายการ session สำเร็จ',
      data: {
        sessions: activeSessions,
        totalSessions: activeSessions.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get active sessions error', { error: errorMessage, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการ session',
    });
  }
});

/**
 * POST /auth/revoke-other-sessions
 * ลบ session อื่นๆ ยกเว้น session ปัจจุบัน
 */
router.post(
  '/revoke-other-sessions',
  authenticateToken,
  ValidationMiddleware.validateContentType,
  ValidationMiddleware.validateBodySize,
  ValidationMiddleware.sanitizeInput,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const currentSessionToken = req.headers['x-session-token'] as string;

      if (!userId) {
        return ErrorHandler.createAuthError(res, 'ไม่พบข้อมูลผู้ใช้');
      }

      if (!currentSessionToken) {
        return ErrorHandler.createValidationError(res, 'ไม่พบ session token ปัจจุบัน');
      }

      logger.info('Revoke other sessions attempt', { userId });

      // ลบ session อื่นๆ ยกเว้น session ปัจจุบัน
      const result = await prisma.session.deleteMany({
        where: {
          userId,
          sessionToken: { not: currentSessionToken },
        },
      });

      logger.auth('Other sessions revoked successfully', userId, undefined, {
        deletedCount: result.count,
        currentSessionToken,
      });

      return res.status(200).json({
        success: true,
        message: 'ลบ session อื่นๆ สำเร็จ',
        data: {
          deletedCount: result.count,
          remainingSessions: 1, // เหลือแค่ session ปัจจุบัน
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Revoke other sessions error', { error: errorMessage, userId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบ session อื่นๆ',
      });
    }
  },
);

// Development endpoint สำหรับล้าง rate limiting
if (process.env.NODE_ENV === 'development') {
  router.post('/clear-rate-limit', (req, res) => {
    const clientIP = getClientIP(req);
    clearLoginAttempts(clientIP);
    res.json({
      success: true,
      message: 'Rate limiting cleared for development',
      clientIP,
    });
  });
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString(),
  });
});

// Profile endpoint
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }
    const result = await AuthService.getProfile(req.user.id);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const result = await AuthService.logout(req.body.sessionToken);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const result = await AuthService.refreshAccessToken(req.body.refreshToken);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
});

// Password change endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้',
      });
    }
    const result = await AuthService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return ErrorHandler.handleError(res, error);
  }
});

/**
 * GET /auth/login-count
 * ดึงข้อมูล Login Count สำหรับผู้ใช้
 */
router.get('/login-count', authenticateToken, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลอีเมลผู้ใช้',
      });
    }

    const result = await AuthService.getLoginCount(email);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงข้อมูล Login Count สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get login count error', { error: errorMessage, email: req.user?.email });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Login Count',
    });
  }
});

export default router;
