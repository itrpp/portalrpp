import { Router, Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { AuthService } from '../services/authService';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { ErrorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import {
  validateQueryParams,
  sanitizeInput,
  validateContentType,
  validateBodySize,
} from '../middleware/validationMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// ใช้ middleware สำหรับ admin routes ทั้งหมด
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * POST /admin/test-data
 * สร้างข้อมูลทดสอบสำหรับ Windows AD login attempts
 */
router.post('/test-data', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin test data creation request', { adminId: req.user?.id });

    // สร้างข้อมูลทดสอบ Windows AD login attempts
    const testAttempts = [
      {
        email: 'ldaptest@rpphosp.local',
        success: true,
        authMethod: 'ldap',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 ชั่วโมงที่แล้ว
      },
      {
        email: 'ldaptest@rpphosp.local',
        success: false,
        authMethod: 'ldap',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 ชั่วโมงที่แล้ว
      },
      {
        email: 'windowsuser@rpphosp.local',
        success: true,
        authMethod: 'ldap',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 ชั่วโมงที่แล้ว
      },
      {
        email: 'admin@rpphosp.local',
        success: true,
        authMethod: 'local',
        ipAddress: '192.168.1.127',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 นาทีที่แล้ว
      },
      {
        email: 'testuser@rpphosp.local',
        success: false,
        authMethod: 'local',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 นาทีที่แล้ว
      },
    ];

    for (const attempt of testAttempts) {
      await prisma.loginAttempt.create({
        data: attempt,
      });
    }

    return res.status(200).json({
      success: true,
      message: `สร้างข้อมูลทดสอบสำเร็จ (${testAttempts.length} รายการ)`,
      data: {
        createdCount: testAttempts.length,
        attempts: testAttempts,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin test data creation error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลทดสอบ',
    });
  }
});

/**
 * GET /admin/statistics
 * ดึงข้อมูลสถิติระบบสำหรับ dashboard
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin statistics request', { adminId: req.user?.id });

    const stats = await AdminService.getSystemStats();

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: stats.totalUsers,
        activeSessions: stats.activeSessions,
        loginAttempts: stats.recentLogins,
        failedLogins: stats.failedLogins,
        systemUptime: stats.systemUptime,
        memoryUsage: stats.memoryUsage,
        cpuUsage: stats.cpuUsage,
      },
      message: 'ดึงข้อมูลสถิติระบบสำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin statistics error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
    });
  }
});

/**
 * GET /admin/stats
 * ดึงข้อมูลสถิติระบบ (legacy endpoint)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin stats request', { adminId: req.user?.id });

    const stats = await AdminService.getSystemStats();

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'ดึงข้อมูลสถิติระบบสำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin stats error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
    });
  }
});

/**
 * GET /admin/sessions
 * ดึงรายการ Session ทั้งหมด
 */
router.get('/sessions', validateQueryParams, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    logger.admin('Admin sessions request', { adminId: req.user?.id, page, limit });

    const result = await AdminService.getAllSessions(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงรายการ Session สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin sessions error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions',
    });
  }
});

/**
 * GET /admin/sessions/user/:userId
 * ดึงรายการ Session ของผู้ใช้
 */
router.get('/sessions/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId',
      });
    }

    logger.admin('Admin user sessions request', { adminId: req.user?.id, userId });

    const sessions = await AdminService.getUserSessions(userId);

    return res.status(200).json({
      success: true,
      data: sessions,
      message: 'ดึงรายการ Session ของผู้ใช้สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin user sessions error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions ของผู้ใช้',
    });
  }
});

/**
 * DELETE /admin/sessions/:sessionId
 * ลบ Session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ sessionId',
      });
    }

    logger.admin('Admin delete session request', { adminId: req.user?.id, sessionId });

    const result = await AdminService.deleteSession(sessionId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin delete session error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ session',
    });
  }
});

/**
 * DELETE /admin/sessions/user/:userId
 * ลบ Session ทั้งหมดของผู้ใช้
 */
router.delete('/sessions/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId',
      });
    }

    logger.admin('Admin delete all user sessions request', { adminId: req.user?.id, userId });

    const result = await AdminService.deleteAllUserSessions(userId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin delete all user sessions error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ sessions ทั้งหมดของผู้ใช้',
    });
  }
});

/**
 * GET /admin/users
 * ดึงรายการผู้ใช้ทั้งหมด
 */
router.get('/users', validateQueryParams, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    logger.admin('Admin users request', { adminId: req.user?.id, page, limit });

    const result = await AdminService.getAllUsers(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงรายการผู้ใช้สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin users error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
    });
  }
});

/**
 * GET /admin/users/:userId
 * ดึงข้อมูลผู้ใช้
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId',
      });
    }

    logger.admin('Admin user info request', { adminId: req.user?.id, userId });

    const userInfo = await AdminService.getUserInfo(userId);

    if (userInfo) {
      return res.status(200).json({
        success: true,
        data: userInfo,
        message: 'ดึงข้อมูลผู้ใช้สำเร็จ',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ระบุ',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin user info error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
    });
  }
});

/**
 * PATCH /admin/users/:userId/status
 * อัปเดตสถานะผู้ใช้
 */
router.patch(
  '/users/:userId/status',
  validateContentType,
  validateBodySize,
  sanitizeInput,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุ userId',
        });
      }

      // ตรวจสอบข้อมูลที่จำเป็น
      if (typeof isActive !== 'boolean') {
        return ErrorHandler.createValidationError(res, 'กรุณาระบุสถานะ isActive เป็น boolean');
      }

      logger.admin('Admin update user status request', { adminId: req.user?.id, userId, isActive });

      const result = await AdminService.updateUserStatus(userId, isActive);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Admin update user status error', { error: errorMessage, adminId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้',
      });
    }
  },
);

/**
 * PATCH /admin/users/:userId/role
 * อัปเดตบทบาทผู้ใช้
 */
router.patch(
  '/users/:userId/role',
  validateContentType,
  validateBodySize,
  sanitizeInput,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุ userId',
        });
      }

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!role || typeof role !== 'string') {
        return ErrorHandler.createValidationError(res, 'กรุณาระบุบทบาท role');
      }

      logger.admin('Admin update user role request', { adminId: req.user?.id, userId, role });

      const result = await AdminService.updateUserRole(userId, role);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Admin update user role error', { error: errorMessage, adminId: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาทผู้ใช้',
      });
    }
  },
);

/**
 * DELETE /admin/users/:userId
 * ลบผู้ใช้
 */
router.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId',
      });
    }

    logger.admin('Admin delete user request', { adminId: req.user?.id, userId });

    const result = await AdminService.deleteUser(userId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin delete user error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบผู้ใช้',
    });
  }
});

/**
 * GET /admin/login-attempts
 * ดึงข้อมูล Login Attempts
 */
router.get('/login-attempts', validateQueryParams, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    logger.admin('Admin login attempts request', { adminId: req.user?.id, page, limit });

    const result = await AdminService.getLoginAttempts(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงข้อมูล Login Attempts สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin login attempts error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล login attempts',
    });
  }
});

/**
 * DELETE /admin/login-attempts
 * ล้าง Login Attempts ทั้งหมด
 */
router.delete('/login-attempts', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin clear all login attempts request', { adminId: req.user?.id });

    const result = await AdminService.clearLoginAttempts();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin clear login attempts error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการล้าง login attempts',
    });
  }
});

/**
 * DELETE /admin/login-attempts/user/:userId
 * ล้าง Login Attempts ของผู้ใช้
 */
router.delete('/login-attempts/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    logger.admin('Admin clear user login attempts request', { adminId: req.user?.id, userId });

    const result = await AdminService.clearLoginAttempts(userId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin clear user login attempts error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการล้าง login attempts ของผู้ใช้',
    });
  }
});

/**
 * GET /admin/login-attempts/ip-details
 * ดึงข้อมูล Login Attempts พร้อมข้อมูล IP Address ที่ชัดเจน
 */
router.get('/login-attempts/ip-details', validateQueryParams, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    logger.admin('Admin login attempts with IP details request', { adminId: req.user?.id, page, limit });

    const result = await AdminService.getLoginAttemptsWithIPDetails(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงข้อมูล Login Attempts พร้อม IP Details สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin login attempts with IP details error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล login attempts พร้อม IP Details',
    });
  }
});

/**
 * GET /admin/sessions/ip-details
 * ดึงข้อมูล Sessions พร้อมข้อมูล IP Address ที่ชัดเจน
 */
router.get('/sessions/ip-details', validateQueryParams, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    logger.admin('Admin sessions with IP details request', { adminId: req.user?.id, page, limit });

    const result = await AdminService.getAllSessionsWithIPDetails(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ดึงข้อมูล Sessions พร้อม IP Details สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin sessions with IP details error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions พร้อม IP Details',
    });
  }
});

/**
 * DELETE /admin/sessions/ip/:ipAddress
 * ลบ Sessions ตาม IP Address
 */
router.delete('/sessions/ip/:ipAddress', async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ ipAddress',
      });
    }

    logger.admin('Admin delete sessions by IP request', { adminId: req.user?.id, ipAddress });

    const result = await AdminService.deleteSessionsByIP(ipAddress);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin delete sessions by IP error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ sessions ตาม IP',
    });
  }
});

/**
 * DELETE /admin/login-attempts/ip/:ipAddress
 * ลบ Login Attempts ตาม IP Address
 */
router.delete('/login-attempts/ip/:ipAddress', async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ ipAddress',
      });
    }

    logger.admin('Admin delete login attempts by IP request', { adminId: req.user?.id, ipAddress });

    const result = await AdminService.deleteLoginAttemptsByIP(ipAddress);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin delete login attempts by IP error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ login attempts ตาม IP',
    });
  }
});

/**
 * GET /admin/ip-statistics
 * ดึงข้อมูลสถิติ IP Address
 */
router.get('/ip-statistics', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin IP statistics request', { adminId: req.user?.id });

    // ดึงข้อมูลสถิติ IP Address จาก sessions และ login attempts
    const [sessionIPStats, loginAttemptIPStats] = await Promise.all([
      AdminService.getAllSessionsWithIPDetails(1, 1), // ใช้เพื่อดึง ipStats เท่านั้น
      AdminService.getLoginAttemptsWithIPDetails(1, 1), // ใช้เพื่อดึง ipStats เท่านั้น
    ]);

    const ipStatistics = {
      sessions: {
        uniqueIPs: sessionIPStats.ipStats.uniqueIPs,
        activeIPs: sessionIPStats.ipStats.activeIPs,
        topIPs: sessionIPStats.ipStats.topIPs,
      },
      loginAttempts: {
        uniqueIPs: loginAttemptIPStats.ipStats.uniqueIPs,
        topIPs: loginAttemptIPStats.ipStats.topIPs,
        suspiciousIPs: loginAttemptIPStats.ipStats.suspiciousIPs,
      },
    };

    return res.status(200).json({
      success: true,
      data: ipStatistics,
      message: 'ดึงข้อมูลสถิติ IP Address สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin IP statistics error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ IP Address',
    });
  }
});

/**
 * POST /admin/ensure-admin
 * สร้าง admin user ถ้าไม่มีในระบบ
 */
router.post('/ensure-admin', async (req: Request, res: Response) => {
  try {
    logger.admin('Ensure admin user request');

    // ตรวจสอบว่ามี admin user อยู่หรือไม่
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: {
          in: ['admin', 'ADMIN'],
        },
      },
    });

    if (existingAdmin) {
      return res.status(200).json({
        success: true,
        message: 'มี admin user อยู่แล้วในระบบ',
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          name: existingAdmin.name,
          role: existingAdmin.role,
        },
      });
    }

    // สร้าง admin user ใหม่
    const bcrypt = await import('bcryptjs');
    const adminPassword = await bcrypt.default.hash('admin123', 12);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@rpphosp.local',
        password: adminPassword,
        role: 'admin',
        isActive: true,
      },
    });

    logger.admin('Admin user created', { adminId: admin.id });

    return res.status(201).json({
      success: true,
      message: 'สร้าง admin user สำเร็จ',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      credentials: {
        email: 'admin@rpphosp.local',
        password: 'admin123',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Ensure admin error', { error: errorMessage });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ admin',
    });
  }
});

/**
 * GET /admin/debug/database
 * ตรวจสอบข้อมูล Database โดยตรง (สำหรับ debug)
 */
router.get('/debug/database', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin database debug request', { adminId: req.user?.id });

    // ดึงข้อมูลทั้งหมดจาก Database โดยตรง
    const [users, sessions, loginAttempts, totalUsers, totalSessions, totalLoginAttempts] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.session.findMany({
        select: {
          id: true,
          sessionToken: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          expires: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          expires: 'desc',
        },
        take: 10, // จำกัดจำนวนเพื่อไม่ให้ข้อมูลมากเกินไป
      }),
      prisma.loginAttempt.findMany({
        select: {
          id: true,
          email: true,
          ipAddress: true,
          success: true,
          authMethod: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // จำกัดจำนวนเพื่อไม่ให้ข้อมูลมากเกินไป
      }),
      prisma.user.count(),
      prisma.session.count(),
      prisma.loginAttempt.count(),
    ]);

    // คำนวณสถิติเพิ่มเติม
    const activeSessions = sessions.filter(s => s.expires > new Date()).length;
    const expiredSessions = sessions.filter(s => s.expires <= new Date()).length;
    const successfulLoginAttempts = loginAttempts.filter(a => a.success).length;
    const failedLoginAttempts = loginAttempts.filter(a => !a.success).length;

    // ตรวจสอบ IP Address ที่ใช้บ่อย
    const ipAddresses = loginAttempts.reduce((acc, attempt) => {
      const ip = attempt.ipAddress ?? 'unknown';
      acc[ip] = (acc[ip] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIPs = Object.entries(ipAddresses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    const debugData = {
      summary: {
        totalUsers,
        totalSessions,
        totalLoginAttempts,
        activeSessions,
        expiredSessions,
        successfulLoginAttempts,
        failedLoginAttempts,
      },
      users: users.map(user => ({
        ...user,
        sessionCount: user._count.sessions,
      })),
      sessions: sessions.map(session => ({
        ...session,
        isActive: session.expires > new Date(),
        userEmail: session.user?.email,
        userName: session.user?.name,
      })),
      loginAttempts: loginAttempts.map(attempt => ({
        ...attempt,
        timeAgo: new Date().getTime() - new Date(attempt.createdAt).getTime(),
      })),
      topIPs,
      databaseInfo: {
        timestamp: new Date().toISOString(),
        serverTime: new Date().toLocaleString('th-TH'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    return res.status(200).json({
      success: true,
      data: debugData,
      message: 'ดึงข้อมูล Database Debug สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin database debug error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Database Debug',
      error: errorMessage,
    });
  }
});

/**
 * GET /admin/debug/sync-data
 * ซิงค์ข้อมูลระหว่าง Database และ Cache
 */
router.get('/debug/sync-data', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin sync data request', { adminId: req.user?.id });

    // ดึงข้อมูลล่าสุดจาก Database
    const [users, sessions, loginAttempts] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          _count: {
            select: {
              sessions: true,
            },
          },
        },
      }),
      prisma.session.findMany({
        select: {
          id: true,
          userId: true,
          ipAddress: true,
          expires: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.loginAttempt.findMany({
        select: {
          email: true,
          success: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
    ]);

    // คำนวณข้อมูลที่ถูกต้อง
    const correctedUsers = [];
    for (const user of users) {
      const loginAttempts = await AuthService.calculateLoginCount(user.email);
      correctedUsers.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        sessionCount: user._count.sessions,
        loginAttempts: loginAttempts,
      });
    }

    const correctedData = {
      users: correctedUsers,
      sessions: sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.user?.email,
        ipAddress: session.ipAddress,
        isActive: session.expires > new Date(),
        expires: session.expires,
      })),
      loginAttempts: loginAttempts.map(attempt => ({
        email: attempt.email,
        success: attempt.success,
        ipAddress: attempt.ipAddress,
        createdAt: attempt.createdAt,
      })),
      statistics: {
        totalUsers: users.length,
        activeSessions: sessions.filter(s => s.expires > new Date()).length,
        totalSessions: sessions.length,
        totalLoginAttempts: loginAttempts.length,
        successfulLoginAttempts: loginAttempts.filter(la => la.success).length, // ใช้สำหรับสถิติรวม
        failedLoginAttempts: loginAttempts.filter(la => !la.success).length,
      },
    };

    return res.status(200).json({
      success: true,
      data: correctedData,
      message: 'ซิงค์ข้อมูล Database สำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin sync data error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
      error: errorMessage,
    });
  }
});

/**
 * GET /admin/debug/validate-data
 * ตรวจสอบและแก้ไขข้อมูลที่ไม่ตรงกับ Database
 */
router.get('/debug/validate-data', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin validate data request', { adminId: req.user?.id });

    const result = await AdminService.validateAndFixData();

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ตรวจสอบข้อมูลสำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin validate data error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      error: errorMessage,
    });
  }
});

/**
 * POST /admin/debug/cleanup-data
 * ล้างข้อมูลที่หมดอายุและไม่ถูกต้อง
 */
router.post('/debug/cleanup-data', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin cleanup data request', { adminId: req.user?.id });

    const result = await AdminService.cleanupInvalidData();

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ล้างข้อมูลสำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin cleanup data error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการล้างข้อมูล',
      error: errorMessage,
    });
  }
});

/**
 * GET /admin/sessions/debug
 * ตรวจสอบข้อมูล sessions ใน database โดยตรง (สำหรับ debug)
 */
router.get('/sessions/debug', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin sessions debug request', { adminId: req.user?.id });

    // ดึงข้อมูล sessions ทั้งหมดจาก database โดยตรง
    const allSessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        expires: 'desc',
      },
    });

    // แยกข้อมูล sessions ที่ active และ expired
    const now = new Date();
    const activeSessions = allSessions.filter(session => session.expires > now);
    const expiredSessions = allSessions.filter(session => session.expires <= now);

    // สร้างข้อมูลสำหรับ debug
    const debugData = {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: expiredSessions.length,
      sessions: allSessions.map(session => ({
        id: session.id,
        sessionToken: session.sessionToken,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name,
        userRole: session.user.role,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expires: session.expires,
        isActive: session.expires > now,
        createdAt: new Date(), // ใช้เวลาปัจจุบันแทน
      })),
      databaseInfo: {
        currentTime: now,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    return res.status(200).json({
      success: true,
      data: debugData,
      message: 'ข้อมูล sessions จาก database โดยตรง',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin sessions debug error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions debug',
    });
  }
});

/**
 * POST /admin/sessions/cleanup
 * ลบ sessions ที่หมดอายุแล้ว
 */
router.post('/sessions/cleanup', async (req: Request, res: Response) => {
  try {
    logger.admin('Admin sessions cleanup request', { adminId: req.user?.id });

    const result = await AdminService.cleanupExpiredSessions();

    return res.status(200).json({
      success: true,
      data: result,
      message: 'ลบ sessions ที่หมดอายุแล้วสำเร็จ',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin sessions cleanup error', { error: errorMessage, adminId: req.user?.id });
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ sessions ที่หมดอายุ',
    });
  }
});

export default router;
