import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AdminStats {
  totalUsers: number;
  activeSessions: number;
  totalSessions: number;
  recentLogins: number;
  failedLogins: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SessionInfo {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  userRole: string;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  expires: Date;
  isActive: boolean;
}

export interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  sessionCount: number;
  loginAttempts: number;
}

export interface LoginAttemptInfo {
  id: string;
  email: string;
  success: boolean;
  authMethod: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CorrectedData {
  users: UserInfo[];
  sessions: SessionInfo[];
  loginAttempts: LoginAttemptInfo[];
}

export class AdminService {
  /**
   * ดึงข้อมูลสถิติระบบ
   */
  static async getSystemStats(): Promise<AdminStats> {
    try {
      // ดึงข้อมูลจาก Database โดยตรง
      const [totalUsers, activeSessions, totalSessions, loginAttempts24h, failedLogins24h] = await Promise.all([
        prisma.user.count(),
        prisma.session.count({
          where: {
            expires: {
              gt: new Date(),
            },
          },
        }),
        prisma.session.count(),
        prisma.loginAttempt.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 ชั่วโมงที่ผ่านมา
            },
          },
        }),
        prisma.loginAttempt.count({
          where: {
            success: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 ชั่วโมงที่ผ่านมา
            },
          },
        }),
      ]);

      // ข้อมูลระบบ
      const systemUptime = process.uptime();
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const cpuUsage = 0; // ต้องใช้ library เพิ่มเติมสำหรับ CPU usage

      logger.admin('System stats retrieved', {
        totalUsers,
        activeSessions,
        loginAttempts24h,
        failedLogins24h,
      });

      return {
        totalUsers,
        activeSessions,
        totalSessions,
        recentLogins: loginAttempts24h, // เปลี่ยนชื่อให้ตรงกับ interface
        failedLogins: failedLogins24h,
        systemUptime,
        memoryUsage,
        cpuUsage,
      };
    } catch (error) {
      logger.error('Error getting system stats', { error: (error as Error).message });
      throw new Error('ไม่สามารถดึงข้อมูลสถิติระบบได้');
    }
  }

  /**
   * ดึงรายการ Session ทั้งหมด
   */
  static async getAllSessions(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    sessions: SessionInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
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
          skip: offset,
          take: limit,
        }),
        prisma.session.count(),
      ]);

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name,
        userRole: session.user.role,
        sessionToken: session.sessionToken,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expires: session.expires,
        isActive: session.expires > new Date(),
      }));

      const totalPages = Math.ceil(total / limit);

      logger.admin('Sessions retrieved', { total, page, totalPages });

      return {
        sessions: sessionInfos,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting sessions', { error: (error as Error).message });
      throw new Error('ไม่สามารถดึงรายการ Session ได้');
    }
  }

  /**
   * ดึงรายการ Session ของผู้ใช้
   */
  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
        },
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

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name,
        userRole: session.user.role,
        sessionToken: session.sessionToken,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expires: session.expires,
        isActive: session.expires > new Date(),
      }));

      logger.admin('User sessions retrieved', { userId, count: sessions.length });

      return sessionInfos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting user sessions', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล sessions ของผู้ใช้');
    }
  }

  /**
   * ลบ Session
   */
  static async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session) {
        return {
          success: false,
          message: 'ไม่พบ Session ที่ระบุ',
        };
      }

      await prisma.session.delete({
        where: { id: sessionId },
      });

      logger.admin('Session deleted', { sessionId, userId: session.userId });

      return {
        success: true,
        message: 'ลบ Session สำเร็จ',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting session', { error: errorMessage, sessionId });
      throw new Error('เกิดข้อผิดพลาดในการลบ session');
    }
  }

  /**
   * ลบ Session ทั้งหมดของผู้ใช้
   */
  static async deleteAllUserSessions(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้ที่ระบุ',
        };
      }

      const deletedSessions = await prisma.session.deleteMany({
        where: { userId },
      });

      logger.admin('All user sessions deleted', { userId, count: deletedSessions.count });

      return {
        success: true,
        message: `ลบ Session ทั้งหมดของ ${user.name} สำเร็จ (${deletedSessions.count} sessions)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting all user sessions', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการลบ sessions ทั้งหมดของผู้ใช้');
    }
  }

  /**
   * ลบ sessions ที่หมดอายุแล้ว
   */
  static async cleanupExpiredSessions(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const now = new Date();

      const deletedSessions = await prisma.session.deleteMany({
        where: {
          expires: {
            lte: now,
          },
        },
      });

      logger.admin('Expired sessions cleaned up', { deletedCount: deletedSessions.count });

      return {
        success: true,
        message: `ลบ sessions ที่หมดอายุแล้วสำเร็จ (${deletedSessions.count} sessions)`,
        deletedCount: deletedSessions.count,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error cleaning up expired sessions', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการลบ sessions ที่หมดอายุ');
    }
  }

  /**
   * ดึงรายการผู้ใช้ทั้งหมด
   */
  static async getAllUsers(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: UserInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            sessions: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        prisma.user.count(),
      ]);

      const userInfos: UserInfo[] = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        sessionCount: user.sessions.length,
        loginAttempts: 0, // จะคำนวณแยกต่างหาก
      }));

      // ลบ Login Count logic ออก - ใช้ AuthService เป็นหลัก

      const totalPages = Math.ceil(total / limit);

      logger.admin('Users retrieved', { total, page, totalPages });

      return {
        users: userInfos,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting users', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้
   */
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          sessions: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      const userInfo: UserInfo = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        sessionCount: user.sessions.length,
        loginAttempts: 0, // จะคำนวณแยกต่างหาก
      };

      // ลบ Login Count logic ออก - ใช้ AuthService เป็นหลัก

      logger.admin('User info retrieved', { userId });

      return userInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting user info', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
    }
  }

  /**
   * อัปเดตสถานะผู้ใช้
   */
  static async updateUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้ที่ระบุ',
        };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive },
      });

      // ถ้าปิดการใช้งานผู้ใช้ ให้ลบ session ทั้งหมด
      if (!isActive) {
        await prisma.session.deleteMany({
          where: { userId },
        });
      }

      logger.admin('User status updated', { userId, isActive });

      return {
        success: true,
        message: `${user.name} ${isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} สำเร็จ`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating user status', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้');
    }
  }

  /**
   * อัปเดตบทบาทผู้ใช้
   */
  static async updateUserRole(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้ที่ระบุ',
        };
      }

      // ตรวจสอบบทบาทที่ถูกต้อง
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        return {
          success: false,
          message: 'บทบาทไม่ถูกต้อง',
        };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      logger.admin('User role updated', { userId, role });

      return {
        success: true,
        message: `อัปเดตบทบาทของ ${user.name} เป็น ${role} สำเร็จ`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating user role', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการอัปเดตบทบาทผู้ใช้');
    }
  }

  /**
   * ลบผู้ใช้
   */
  static async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้ที่ระบุ',
        };
      }

      // ลบข้อมูลที่เกี่ยวข้อง
      await Promise.all([
        prisma.session.deleteMany({ where: { userId } }),
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.loginAttempt.deleteMany({ where: { email: user.email } }),
        prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      ]);

      logger.admin('User deleted', { userId, userName: user.name });

      return {
        success: true,
        message: `ลบผู้ใช้ ${user.name} สำเร็จ`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting user', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  }

  /**
   * ดึงรายการ Login Attempts (สำหรับ Admin Management)
   * ใช้สำหรับ: Admin Panel, System Monitoring, Security Analysis
   */
  static async getLoginAttempts(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    attempts: LoginAttemptInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [attempts, total] = await Promise.all([
        prisma.loginAttempt.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        prisma.loginAttempt.count(),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.admin('Login attempts retrieved', { total, page, totalPages });

      return {
        attempts,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting login attempts', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล login attempts');
    }
  }

  /**
   * ล้าง Login Attempts
   */
  static async clearLoginAttempts(userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      let deletedAttempts;

      if (userId) {
        // ล้าง Login Attempts ของผู้ใช้เฉพาะ (ถ้ามี userId)
        deletedAttempts = await prisma.loginAttempt.deleteMany({
          where: {
            email: {
              contains: userId, // ใช้ email แทน userId
            },
          },
        });
      } else {
        // ล้าง Login Attempts ทั้งหมด
        deletedAttempts = await prisma.loginAttempt.deleteMany({});
      }

      logger.admin('Login attempts cleared', { userId, count: deletedAttempts.count });

      return {
        success: true,
        message: userId
          ? `ล้าง Login Attempts ของผู้ใช้สำเร็จ (${deletedAttempts.count} records)`
          : `ล้าง Login Attempts ทั้งหมดสำเร็จ (${deletedAttempts.count} records)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error clearing login attempts', { error: errorMessage, userId });
      throw new Error('เกิดข้อผิดพลาดในการล้าง login attempts');
    }
  }

  /**
   * ดึงข้อมูล Login Attempts พร้อมข้อมูล IP Address ที่ชัดเจน
   */
  static async getLoginAttemptsWithIPDetails(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    attempts: LoginAttemptInfo[];
    total: number;
    page: number;
    totalPages: number;
    ipStats: {
      uniqueIPs: number;
      topIPs: Array<{ ip: string; count: number }>;
      suspiciousIPs: Array<{ ip: string; failedCount: number; successCount: number }>;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      const [attempts, total] = await Promise.all([
        prisma.loginAttempt.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        prisma.loginAttempt.count(),
      ]);

      // คำนวณสถิติ IP Address
      const ipStats = await this.calculateIPStatistics();

      const totalPages = Math.ceil(total / limit);

      logger.admin('Login attempts with IP details retrieved', { total, page, totalPages });

      return {
        attempts,
        total,
        page,
        totalPages,
        ipStats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting login attempts with IP details', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล login attempts');
    }
  }

  /**
   * คำนวณสถิติ IP Address
   */
  private static async calculateIPStatistics(): Promise<{
    uniqueIPs: number;
    topIPs: Array<{ ip: string; count: number }>;
    suspiciousIPs: Array<{ ip: string; failedCount: number; successCount: number }>;
  }> {
    try {
      // นับ IP Address ที่ไม่ซ้ำกัน
      const uniqueIPs = await prisma.loginAttempt.groupBy({
        by: ['ipAddress'],
        _count: {
          ipAddress: true,
        },
      });

      // หา IP ที่มีการพยายามเข้าสู่ระบบมากที่สุด
      const topIPs = await prisma.loginAttempt.groupBy({
        by: ['ipAddress'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // หา IP ที่น่าสงสัย (มี failed attempts มาก)
      const suspiciousIPs = await prisma.$queryRaw`
        SELECT 
          ipAddress,
          COUNT(CASE WHEN success = 0 THEN 1 END) as failedCount,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successCount
        FROM LoginAttempt 
        WHERE ipAddress IS NOT NULL 
        GROUP BY ipAddress 
        HAVING failedCount > successCount 
        ORDER BY failedCount DESC 
        LIMIT 10
      `;

      return {
        uniqueIPs: uniqueIPs.length,
        topIPs: topIPs.map(item => ({
          ip: item.ipAddress || 'unknown',
          count: item._count.id,
        })),
        suspiciousIPs: (suspiciousIPs as Array<{ ipAddress: string; failedCount: number; successCount: number }>).map(item => ({
          ip: item.ipAddress || 'unknown',
          failedCount: item.failedCount,
          successCount: item.successCount,
        })),
      };
    } catch (error) {
      logger.error('Error calculating IP statistics', { error: (error as Error).message });
      return {
        uniqueIPs: 0,
        topIPs: [],
        suspiciousIPs: [],
      };
    }
  }

  /**
   * ดึงข้อมูล Session พร้อมข้อมูล IP Address ที่ชัดเจน
   */
  static async getAllSessionsWithIPDetails(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    sessions: SessionInfo[];
    total: number;
    page: number;
    totalPages: number;
    ipStats: {
      uniqueIPs: number;
      activeIPs: number;
      topIPs: Array<{ ip: string; sessionCount: number }>;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
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
          skip: offset,
          take: limit,
        }),
        prisma.session.count(),
      ]);

      // คำนวณสถิติ IP Address สำหรับ sessions
      const ipStats = await this.calculateSessionIPStatistics();

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name,
        userRole: session.user.role,
        sessionToken: session.sessionToken,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expires: session.expires,
        isActive: session.expires > new Date(),
      }));

      const totalPages = Math.ceil(total / limit);

      logger.admin('Sessions with IP details retrieved', { total, page, totalPages });

      return {
        sessions: sessionInfos,
        total,
        page,
        totalPages,
        ipStats,
      };
    } catch (error) {
      logger.error('Error getting sessions with IP details', { error: (error as Error).message });
      throw new Error('ไม่สามารถดึงรายการ Session ได้');
    }
  }

  /**
   * คำนวณสถิติ IP Address สำหรับ sessions
   */
  private static async calculateSessionIPStatistics(): Promise<{
    uniqueIPs: number;
    activeIPs: number;
    topIPs: Array<{ ip: string; sessionCount: number }>;
  }> {
    try {
      // นับ IP Address ที่ไม่ซ้ำกัน
      const uniqueIPs = await prisma.session.groupBy({
        by: ['ipAddress'],
        _count: {
          ipAddress: true,
        },
      });

      // นับ IP Address ที่มี active sessions
      const activeIPs = await prisma.session.groupBy({
        by: ['ipAddress'],
        where: {
          expires: {
            gt: new Date(),
          },
        },
        _count: {
          ipAddress: true,
        },
      });

      // หา IP ที่มี sessions มากที่สุด
      const topIPs = await prisma.session.groupBy({
        by: ['ipAddress'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      return {
        uniqueIPs: uniqueIPs.length,
        activeIPs: activeIPs.length,
        topIPs: topIPs.map(item => ({
          ip: item.ipAddress || 'unknown',
          sessionCount: item._count.id,
        })),
      };
    } catch (error) {
      logger.error('Error calculating session IP statistics', { error: (error as Error).message });
      return {
        uniqueIPs: 0,
        activeIPs: 0,
        topIPs: [],
      };
    }
  }

  /**
   * ลบ sessions ตาม IP Address
   */
  static async deleteSessionsByIP(ipAddress: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const deletedSessions = await prisma.session.deleteMany({
        where: {
          ipAddress: ipAddress,
        },
      });

      logger.admin('Sessions deleted by IP', { ipAddress, deletedCount: deletedSessions.count });

      return {
        success: true,
        message: `ลบ sessions ของ IP ${ipAddress} สำเร็จ (${deletedSessions.count} sessions)`,
        deletedCount: deletedSessions.count,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting sessions by IP', { error: errorMessage, ipAddress });
      throw new Error('เกิดข้อผิดพลาดในการลบ sessions ตาม IP');
    }
  }

  /**
   * ลบ login attempts ตาม IP Address
   */
  static async deleteLoginAttemptsByIP(ipAddress: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const deletedAttempts = await prisma.loginAttempt.deleteMany({
        where: {
          ipAddress: ipAddress,
        },
      });

      logger.admin('Login attempts deleted by IP', { ipAddress, deletedCount: deletedAttempts.count });

      return {
        success: true,
        message: `ลบ login attempts ของ IP ${ipAddress} สำเร็จ (${deletedAttempts.count} attempts)`,
        deletedCount: deletedAttempts.count,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting login attempts by IP', { error: errorMessage, ipAddress });
      throw new Error('เกิดข้อผิดพลาดในการลบ login attempts ตาม IP');
    }
  }

  /**
   * ตรวจสอบและแก้ไขข้อมูลที่ไม่ตรงกับ Database
   */
  static async validateAndFixData(): Promise<{
    success: boolean;
    message: string;
    issues: Array<{
      type: string;
      description: string;
      fixed: boolean;
    }>;
    correctedData: CorrectedData;
  }> {
    try {
      const issues: Array<{
        type: string;
        description: string;
        fixed: boolean;
      }> = [];

      // ดึงข้อมูลจาก Database โดยตรง
      const [users, sessions, loginAttempts] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
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
            sessionToken: true,
            userId: true,
            ipAddress: true,
            userAgent: true,
            expires: true,
            user: {
              select: {
                email: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        prisma.loginAttempt.findMany({
          select: {
            id: true,
            email: true,
            ipAddress: true,
            success: true,
            authMethod: true,
            createdAt: true,
            userAgent: true,
          },
        }),
      ]);

      // ตรวจสอบ sessions ที่หมดอายุ
      const expiredSessions = sessions.filter(s => s.expires <= new Date());
      if (expiredSessions.length > 0) {
        issues.push({
          type: 'expired_sessions',
          description: `พบ sessions ที่หมดอายุ ${expiredSessions.length} รายการ`,
          fixed: false,
        });
      }

      // ตรวจสอบ sessions ที่ไม่มี user
      const orphanedSessions = sessions.filter(s => !s.user);
      if (orphanedSessions.length > 0) {
        issues.push({
          type: 'orphaned_sessions',
          description: `พบ sessions ที่ไม่มี user ${orphanedSessions.length} รายการ`,
          fixed: false,
        });
      }

      // ตรวจสอบ login attempts ที่ไม่มี IP Address
      const attemptsWithoutIP = loginAttempts.filter(la => !la.ipAddress || la.ipAddress === 'unknown');
      if (attemptsWithoutIP.length > 0) {
        issues.push({
          type: 'attempts_without_ip',
          description: `พบ login attempts ที่ไม่มี IP Address ${attemptsWithoutIP.length} รายการ`,
          fixed: false,
        });
      }

      // ตรวจสอบ users ที่ไม่มี sessions
      const usersWithoutSessions = users.filter(u => u._count.sessions === 0);
      if (usersWithoutSessions.length > 0) {
        issues.push({
          type: 'users_without_sessions',
          description: `พบ users ที่ไม่มี sessions ${usersWithoutSessions.length} รายการ`,
          fixed: false,
        });
      }

      // สร้างข้อมูลที่ถูกต้อง
      const correctedData: CorrectedData = {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          sessionCount: user._count.sessions,
          loginAttempts: 0, // ลบ Login Count logic ออก - ใช้ AuthService เป็นหลัก
        })),
        sessions: sessions.map(session => ({
          id: session.id,
          sessionToken: session.sessionToken,
          userId: session.userId,
          userEmail: session.user?.email ?? '',
          userName: session.user?.name ?? null,
          userRole: session.user?.role ?? 'user',
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expires: session.expires,
          isActive: session.expires > new Date(),
        })),
        loginAttempts: loginAttempts.map(attempt => ({
          id: attempt.id,
          email: attempt.email,
          success: attempt.success,
          authMethod: attempt.authMethod,
          ipAddress: attempt.ipAddress,
          userAgent: attempt.userAgent,
          createdAt: attempt.createdAt,
        })),
      };

      logger.admin('Data validation completed', {
        totalUsers: users.length,
        totalSessions: sessions.length,
        totalLoginAttempts: loginAttempts.length,
        issuesFound: issues.length,
      });

      return {
        success: true,
        message: 'ตรวจสอบข้อมูลสำเร็จ',
        issues,
        correctedData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error validating data', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
    }
  }

  /**
   * ล้างข้อมูลที่หมดอายุและไม่ถูกต้อง
   */
  static async cleanupInvalidData(): Promise<{
    success: boolean;
    message: string;
    cleanedData: {
      expiredSessions: number;
      orphanedSessions: number;
      oldLoginAttempts: number;
    };
  }> {
    try {
      // ลบ sessions ที่หมดอายุ
      const expiredSessions = await prisma.session.deleteMany({
        where: {
          expires: {
            lte: new Date(),
          },
        },
      });

      // ลบ sessions ที่ไม่มี user (orphaned sessions)
      const orphanedSessions = await prisma.session.deleteMany({
        where: {
          userId: {
            notIn: await prisma.user.findMany({ select: { id: true } }).then(users => users.map(u => u.id)),
          },
        },
      });

      // ลบ login attempts ที่เก่าเกินไป (มากกว่า 30 วัน)
      const oldLoginAttempts = await prisma.loginAttempt.deleteMany({
        where: {
          createdAt: {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 วันที่แล้ว
          },
        },
      });

      logger.admin('Data cleanup completed', {
        expiredSessions: expiredSessions.count,
        orphanedSessions: orphanedSessions.count,
        oldLoginAttempts: oldLoginAttempts.count,
      });

      return {
        success: true,
        message: 'ล้างข้อมูลที่ไม่ถูกต้องสำเร็จ',
        cleanedData: {
          expiredSessions: expiredSessions.count,
          orphanedSessions: orphanedSessions.count,
          oldLoginAttempts: oldLoginAttempts.count,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error cleaning up data', { error: errorMessage });
      throw new Error('เกิดข้อผิดพลาดในการล้างข้อมูล');
    }
  }
}
