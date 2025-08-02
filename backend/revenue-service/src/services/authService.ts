import axios from 'axios';
import { AuthUser } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  private static readonly API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'http://localhost:3001';
  private static readonly AUTH_SERVICE_PATH = '/api/auth';

  /**
   * ตรวจสอบ JWT token ผ่าน API Gateway
   */
  public static async verifyToken(authHeader: string): Promise<AuthUser | null> {
    try {
      const token = authHeader.replace('Bearer ', '');

      // เรียกผ่าน API Gateway ไปยัง auth-service
      const response = await axios.post(
        `${this.API_GATEWAY_URL}${this.AUTH_SERVICE_PATH}/verify`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          timeout: 5000, // 5 seconds timeout
        },
      );

      if (response.status === 200 && response.data.success) {
        return {
          userId: response.data.user.userId,
          userName: response.data.user.userName,
          role: response.data.user.role,
        };
      }

      return null;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบสิทธิ์การเข้าถึง
   */
  public static async checkPermission(
    token: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.API_GATEWAY_URL}${this.AUTH_SERVICE_PATH}/permission`,
        {
          resource,
          action,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 5000,
        },
      );

      return response.status === 200 && response.data.hasPermission;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้
   */
  public static async getUserInfo(token: string): Promise<AuthUser | null> {
    try {
      const response = await axios.get(
        `${this.API_GATEWAY_URL}${this.AUTH_SERVICE_PATH}/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: 5000,
        },
      );

      if (response.status === 200 && response.data.success) {
        return {
          userId: response.data.user.userId,
          userName: response.data.user.userName,
          role: response.data.user.role,
        };
      }

      return null;
    } catch (error) {
      logger.error('Get user info failed:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อกับ auth-service
   */
  public static async checkAuthServiceHealth(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.API_GATEWAY_URL}${this.AUTH_SERVICE_PATH}/health`,
        {
          timeout: 3000,
        },
      );

      return response.status === 200;
    } catch (error) {
      logger.error('Auth service health check failed:', error);
      return false;
    }
  }

  /**
   * สร้าง token สำหรับ testing (เฉพาะ development)
   */
  public static createTestToken(user: AuthUser): string {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Test token creation is not allowed in production');
    }

    // สร้าง mock token สำหรับ testing
    const mockToken = {
      userId: user.userId,
      userName: user.userName,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    return `mock.${Buffer.from(JSON.stringify(mockToken)).toString('base64')}`;
  }

  /**
   * ตรวจสอบ token format
   */
  public static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // ตรวจสอบ format ของ token
    const parts = token.split('.');
    return parts.length === 3 || token.startsWith('mock.');
  }

  /**
   * แยก token จาก Authorization header
   */
  public static extractToken(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // ลบ "Bearer " ออก
    return this.isValidTokenFormat(token) ? token : null;
  }
}
