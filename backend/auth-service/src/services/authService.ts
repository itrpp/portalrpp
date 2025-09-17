import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { authConfig } from '../config/auth';
import { LDAPService, LDAPUser } from './ldapService';
import { RefreshTokenPayload, LoginCredentials, AuthResponse, LDAPLoginCredentials } from '../types';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp?: number;
  aud: string;
  iss: string;
}

export interface UserWithRelations {
  id: string;
  name: string | null;
  email: string;
  password: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  ldapDN: string | null;
  authMethod: string;
  createdAt: Date;
  updatedAt: Date;
  sessions: Array<{
    id: string;
    sessionToken: string;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    expires: Date;
  }>;
  accounts: Array<{
    id: string;
    userId: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token: string | null;
    access_token: string | null;
    expires_at: number | null;
    token_type: string | null;
    scope: string | null;
    id_token: string | null;
    session_state: string | null;
  }>;
}

export class AuthService {
  private static readonly JWT_SECRET = authConfig.jwt.secret;
  private static readonly JWT_EXPIRES_IN = authConfig.jwt.accessTokenExpiresIn;
  private static readonly REFRESH_TOKEN_EXPIRES_IN = authConfig.jwt.refreshTokenExpiresIn;
  private static readonly SESSION_MAX_AGE = authConfig.session.maxAge; // ค่า maxAge อยู่ใน milliseconds แล้ว

  /**
   * เข้าสู่ระบบ
   */
  static async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      // ตรวจสอบ authentication method
      const authMethod = credentials.authMethod ?? 'local';

      logger.auth('Login attempt', undefined, undefined, { email: credentials.email, authMethod });

      let result: AuthResponse;
      if (authMethod === 'ldap') {
        result = await this.loginWithLDAP(credentials, ipAddress, userAgent);
      } else {
        result = await this.loginWithLocal(credentials, ipAddress, userAgent);
      }

      // บันทึก performance metrics
      const duration = Date.now() - startTime;
      logger.performance(`Login ${authMethod} completed`, duration, 'authentication', {
        email: credentials.email,
        authMethod,
        success: result.success,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      logger.error('Login error', { error: errorMessage, email: credentials.email });
      logger.performance(`Login ${credentials.authMethod || 'local'} failed`, duration, 'authentication', {
        email: credentials.email,
        authMethod: credentials.authMethod || 'local',
        error: errorMessage,
      });

      // บันทึก failed login attempt
      await this.recordLoginAttempt(credentials.email, false, credentials.authMethod ?? 'local', ipAddress, userAgent);

      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
      };
    }
  }

  /**
   * เข้าสู่ระบบด้วย LDAP (แยก endpoint)
   * ใช้สำหรับ Windows AD authentication แยกจาก local authentication
   */
  static async loginLDAP(
    credentials: LDAPLoginCredentials,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      logger.auth('LDAP login attempt', undefined, undefined, { username: credentials.username });

      // ตรวจสอบ LDAP authentication
      const ldapResult = await LDAPService.authenticate(credentials.username, credentials.password);

      if (!ldapResult.success || !ldapResult.user) {
        logger.warn('LDAP authentication failed', { username: credentials.username, error: ldapResult.message });

        // บันทึก failed login attempt ด้วย username (เพราะยังไม่มี user)
        await this.recordLoginAttempt(credentials.username, false, 'ldap', ipAddress, userAgent);

        const duration = Date.now() - startTime;
        logger.performance('LDAP authentication failed', duration, 'ldapAuthentication', {
          username: credentials.username,
          error: ldapResult.message,
        });

        return {
          success: false,
          message: ldapResult.message ?? 'ไม่สามารถเข้าสู่ระบบด้วย LDAP ได้',
        };
      }

      const ldapUser = ldapResult.user;
      logger.auth('LDAP authentication successful', undefined, undefined, {
        username: credentials.username,
        uid: ldapUser.uid,
      });

      // ค้นหาหรือสร้างผู้ใช้ในฐานข้อมูล
      let user = await this.findUserByLDAPData(ldapUser, credentials.username);

      if (!user) {
        // สร้างผู้ใช้ใหม่จากข้อมูล LDAP
        user = await this.createUserFromLDAP(ldapUser, credentials.username);
        if (user) {
          logger.db('User created from LDAP', 'create', 'user', { userId: user.id, username: credentials.username });
        }
      } else {
        // อัปเดตข้อมูลผู้ใช้จาก LDAP
        user = await this.updateUserFromLDAP(user, ldapUser);
        if (user) {
          logger.db('User updated from LDAP', 'update', 'user', { userId: user.id, username: credentials.username });
        }
      }

      // บันทึก successful login attempt ด้วย email ของ user
      if (user) {
        await this.recordLoginAttempt(user.email, true, 'ldap', ipAddress, userAgent);
        const result = await this.createUserSession(user, ipAddress, userAgent);

        // บันทึก performance metrics
        const duration = Date.now() - startTime;
        logger.performance('LDAP login completed', duration, 'ldapAuthentication', {
          username: credentials.username,
          success: result.success,
        });

        return result;
      }

      const duration = Date.now() - startTime;
      logger.performance('LDAP login failed - user not found', duration, 'ldapAuthentication', {
        username: credentials.username,
      });

      return {
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      logger.error('LDAP login error', { error: errorMessage, username: credentials.username });
      logger.performance('LDAP login error', duration, 'ldapAuthentication', {
        username: credentials.username,
        error: errorMessage,
      });

      // ตรวจสอบว่าเป็น unique constraint error หรือไม่
      if (errorMessage.includes('Unique constraint failed') && errorMessage.includes('email')) {
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ',
        };
      }

      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LDAP กรุณาลองใหม่อีกครั้ง',
      };
    }
  }

  /**
   * เข้าสู่ระบบด้วย Local Database
   */
  private static async loginWithLocal(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      // ค้นหาผู้ใช้
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: {
          sessions: true,
          accounts: true,
        },
      });

      if (!user) {
        logger.warn('User not found for login', { email: credentials.email });

        // บันทึก failed login attempt
        await this.recordLoginAttempt(credentials.email, false, 'local', ipAddress, userAgent);

        return {
          success: false,
          message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        };
      }

      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password ?? '');

      if (!isPasswordValid) {
        logger.warn('Invalid password for login', { email: credentials.email });

        // บันทึก failed login attempt
        await this.recordLoginAttempt(credentials.email, false, 'local', ipAddress, userAgent);

        return {
          success: false,
          message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        };
      }

      logger.auth('Local login successful', user.id, undefined, { email: credentials.email });

      // บันทึก successful login attempt
      await this.recordLoginAttempt(credentials.email, true, 'local', ipAddress, userAgent);

      return await this.createUserSession(user, ipAddress, userAgent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Local login error', { error: errorMessage, email: credentials.email });
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
      };
    }
  }

  /**
   * เข้าสู่ระบบด้วย LDAP
   */
  private static async loginWithLDAP(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      logger.auth('LDAP login attempt via login method', undefined, undefined, { email: credentials.email });

      // ตรวจสอบ LDAP authentication
      const ldapResult = await LDAPService.authenticate(credentials.email, credentials.password);

      if (!ldapResult.success || !ldapResult.user) {
        logger.warn('LDAP authentication failed via login method', {
          email: credentials.email,
          error: ldapResult.message,
        });

        // บันทึก failed login attempt
        await this.recordLoginAttempt(credentials.email, false, 'ldap', ipAddress, userAgent);

        return {
          success: false,
          message: ldapResult.message ?? 'ไม่สามารถเข้าสู่ระบบด้วย LDAP ได้',
        };
      }

      const ldapUser = ldapResult.user;
      logger.auth('LDAP authentication successful via login method', undefined, undefined, {
        email: credentials.email,
        uid: ldapUser.uid,
      });

      // ค้นหาหรือสร้างผู้ใช้ในฐานข้อมูล
      let user = await this.findUserByLDAPData(ldapUser, credentials.email);

      if (!user) {
        // สร้างผู้ใช้ใหม่จากข้อมูล LDAP
        user = await this.createUserFromLDAP(ldapUser, credentials.email);
        if (user) {
          logger.db('User created from LDAP via login method', 'create', 'user', {
            userId: user.id,
            email: user.email,
          });
        }
      } else {
        // อัปเดตข้อมูลผู้ใช้จาก LDAP
        user = await this.updateUserFromLDAP(user, ldapUser);
        if (user) {
          logger.db('User updated from LDAP via login method', 'update', 'user', {
            userId: user.id,
            email: user.email,
          });
        }
      }

      // บันทึก successful login attempt
      await this.recordLoginAttempt(credentials.email, true, 'ldap', ipAddress, userAgent);

      if (user) {
        return await this.createUserSession(user);
      }

      return {
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('LDAP login error via login method', { error: errorMessage, email: credentials.email });

      // ตรวจสอบว่าเป็น unique constraint error หรือไม่
      if (errorMessage.includes('Unique constraint failed') && errorMessage.includes('email')) {
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ',
        };
      }

      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LDAP กรุณาลองใหม่อีกครั้ง',
      };
    }
  }

  /**
   * ค้นหาผู้ใช้จาก LDAP data
   * ตรวจสอบทั้ง email, username และ LDAP DN
   */
  private static async findUserByLDAPData(ldapUser: LDAPUser, username: string): Promise<UserWithRelations | null> {
    // ตรวจสอบทั้ง username, email จาก LDAP และ LDAP DN
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { email: ldapUser.mail ?? username },
          { ldapDN: ldapUser.dn },
        ],
      },
      include: {
        sessions: true,
        accounts: true,
      },
    });

    // ถ้าไม่พบ ให้ลองค้นหาด้วย username@domain
    if (!user && !username.includes('@')) {
      const domainEmail = `${username}@rpphosp.local`;
      return prisma.user.findFirst({
        where: {
          OR: [
            { email: domainEmail },
            { email: ldapUser.mail ?? domainEmail },
            { ldapDN: ldapUser.dn },
          ],
        },
        include: {
          sessions: true,
          accounts: true,
        },
      });
    }

    return user;
  }

  /**
   * สร้างผู้ใช้ใหม่จากข้อมูล Windows AD
   * ใช้ upsert เพื่อจัดการกรณีที่ user มีอยู่แล้ว
   * ตรวจสอบ unique constraint ของ email ก่อนสร้าง
   */
  private static async createUserFromLDAP(ldapUser: LDAPUser, username: string): Promise<UserWithRelations | null> {
    // ตรวจสอบ email จาก LDAP หรือสร้างจาก username
    let email = ldapUser.mail;

    // ถ้าไม่มี mail จาก LDAP ให้สร้างจาก username
    if (!email || email.trim() === '') {
      email = username.includes('@') ? username : `${username}@rpphosp.local`;
    }

    // ตรวจสอบว่า email ซ้ำกับ user อื่นหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
      include: {
        sessions: true,
        accounts: true,
      },
    });

    if (existingUser) {
      // ถ้า user มีอยู่แล้ว ให้อัปเดตข้อมูลแทน
      logger.info('User already exists, updating from LDAP', {
        userId: existingUser.id,
        email: email,
      });

      return this.updateUserFromLDAP(existingUser as UserWithRelations, ldapUser);
    }

    const userData = {
      name: ldapUser.displayName ?? ldapUser.cn ?? ldapUser.sAMAccountName,
      email: email, // ใช้ mail จาก AD หรือ username
      password: '', // ไม่มีรหัสผ่านสำหรับ LDAP user
      role: this.determineRoleFromLDAP(ldapUser),
      isActive: true,
      emailVerified: new Date(),
      ldapDN: ldapUser.dn, // เก็บ DN สำหรับอ้างอิง
      authMethod: 'ldap', // ระบุว่าเป็น LDAP user
    };

    // สร้าง user ใหม่
    return prisma.user.create({
      data: userData,
      include: {
        sessions: true,
        accounts: true,
      },
    });
  }

  /**
   * อัปเดตข้อมูลผู้ใช้จาก Windows AD
   * อัปเดตชื่อ, อีเมล, และ role จากข้อมูลล่าสุดใน AD
   * ตรวจสอบ unique constraint ของ email ก่อนอัปเดต
   */
  private static async updateUserFromLDAP(user: UserWithRelations, ldapUser: LDAPUser): Promise<UserWithRelations | null> {
    // ตรวจสอบ email ใหม่จาก LDAP หรือใช้ email เดิม
    let newEmail = ldapUser.mail;

    // ถ้าไม่มี mail จาก LDAP ให้ใช้ email เดิม
    if (!newEmail || newEmail.trim() === '') {
      newEmail = user.email;
    }

    // ถ้า email เปลี่ยนไป ให้ตรวจสอบว่าไม่ซ้ำกับ user อื่น
    if (newEmail !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existingUser && existingUser.id !== user.id) {
        // ถ้า email ซ้ำกับ user อื่น ให้ใช้ email เดิม
        logger.warn('LDAP email update skipped - email already exists', {
          userId: user.id,
          oldEmail: user.email,
          newEmail: newEmail,
          existingUserId: existingUser.id,
        });
        // ใช้ email เดิมแทน
        newEmail = user.email;
      }
    }

    const updateData = {
      name: ldapUser.displayName ?? ldapUser.cn ?? ldapUser.sAMAccountName,
      email: newEmail, // ใช้ email ใหม่ถ้าไม่ซ้ำ หรือ email เดิมถ้าซ้ำ
      role: this.determineRoleFromLDAP(ldapUser),
      ldapDN: ldapUser.dn,
      authMethod: 'ldap', // ระบุว่าเป็น LDAP user
      updatedAt: new Date(),
    };

    return prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        sessions: true,
        accounts: true,
      },
    });
  }

  /**
   * กำหนด role จากข้อมูล Windows AD groups
   * ตรวจสอบ memberOf groups เพื่อกำหนด role (admin, manager, user)
   * Default role คือ "user" สำหรับ LDAP authentication
   */
  private static determineRoleFromLDAP(ldapUser: LDAPUser): string {
    // ตรวจสอบ memberOf groups เพื่อกำหนด role
    if (ldapUser.memberOf && ldapUser.memberOf.length > 0) {
      const groups = ldapUser.memberOf.map(group => group.toLowerCase());

      // Windows AD groups มักจะมีรูปแบบ "CN=GroupName,OU=Groups,DC=domain,DC=local"
      if (
        groups.some(
          group =>
            group.includes('admin') ||
            group.includes('administrator') ||
            group.includes('domain admins') ||
            group.includes('enterprise admins'),
        )
      ) {
        return 'admin';
      } else if (
        groups.some(
          group => group.includes('manager') || group.includes('supervisor') || group.includes('department manager'),
        )
      ) {
        return 'manager';
      }
    }

    // ค่าเริ่มต้นสำหรับ LDAP authentication คือ "user"
    return 'user';
  }

  /**
   * สร้าง session สำหรับผู้ใช้
   */
  private static async createUserSession(user: UserWithRelations, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // ลบ session เก่าทั้งหมดของ user นี้ (ไม่ใช่แค่ session หมดอายุ)
    await this.cleanupAllUserSessions(user.id);

    // สร้าง JWT tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // สร้าง session ใหม่
    const sessionToken = uuidv4();
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        ipAddress,
        userAgent,
        expires: new Date(Date.now() + this.SESSION_MAX_AGE),
      },
      include: {
        user: {
          include: {
            sessions: true,
            accounts: true,
          },
        },
      },
    });

    // อัปเดต lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // ลบ password ออกจาก response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const { password: _unused, ...userWithoutPassword } = user;

    // สร้าง user object ที่ครบถ้วน
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

    return {
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userResponse,
      accessToken: accessToken,
      refreshToken: refreshToken,
      sessionToken: sessionToken,
      expiresIn: Math.floor(this.SESSION_MAX_AGE / 1000), // แปลงจาก milliseconds เป็นวินาที
    };
  }

  /**
   * สร้าง Access Token
   */
  private static generateAccessToken(user: UserWithRelations): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name ?? '',
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      aud: 'portal-app',
      iss: 'auth-service',
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * สร้าง Refresh Token
   */
  private static async generateRefreshToken(userId: string, sessionId?: string): Promise<string> {
    const tokenId = uuidv4();
    const payload: RefreshTokenPayload = {
      userId,
      tokenId,
      sessionId,
    };

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);

    return refreshToken;
  }

  /**
   * ตรวจสอบ Access Token
   */
  static async verifyAccessToken(token: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          sessions: {
            orderBy: { expires: 'desc' },
            take: 1, // เอาแค่ session ล่าสุด
          },
          accounts: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
        };
      }

      // ตรวจสอบว่า user ยังคง active อยู่หรือไม่
      if (!user.isActive) {
        return {
          success: false,
          message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน',
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { password: _unused, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Token ถูกต้อง',
        user: userWithoutPassword,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          message: 'Token หมดอายุแล้ว',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          message: 'Token ไม่ถูกต้อง',
        };
      }

      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ Token',
      };
    }
  }

  /**
   * ต่ออายุ Access Token ด้วย Refresh Token
   */
  static async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as RefreshTokenPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          sessions: true,
          accounts: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
        };
      }

      // ตรวจสอบว่า session ยังมีอยู่หรือไม่
      const activeSession = await prisma.session.findFirst({
        where: {
          userId: user.id,
          expires: { gt: new Date() },
        },
      });

      if (!activeSession) {
        return {
          success: false,
          message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
        };
      }

      // สร้าง access token และ refresh token ใหม่
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user.id, activeSession.sessionToken);

      return {
        success: true,
        message: 'ต่ออายุ Token สำเร็จ',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionToken: activeSession.sessionToken,
        expiresIn: Math.floor(this.SESSION_MAX_AGE / 1000), // แปลงจาก milliseconds เป็นวินาที
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ',
      };
    }
  }

  /**
   * ตรวจสอบ Session
   */
  static async validateSession(sessionToken: string): Promise<AuthResponse> {
    try {
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
        return {
          success: false,
          message: 'ไม่พบ Session นี้',
        };
      }

      if (session.expires < new Date()) {
        return {
          success: false,
          message: 'Session หมดอายุแล้ว',
        };
      }

      // ตรวจสอบว่าผู้ใช้ยังคงมีอยู่ในระบบหรือไม่
      if (!session.user) {
        return {
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้ในระบบ',
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { password: _unused, ...userWithoutPassword } = session.user;

      return {
        success: true,
        message: 'Session ถูกต้อง',
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('🔴 Session validation error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบ Session',
      };
    }
  }

  /**
   * ออกจากระบบ
   */
  static async logout(sessionToken: string): Promise<AuthResponse> {
    try {
      // ลบ session ที่ระบุ
      await prisma.session.delete({
        where: { sessionToken },
      });

      return {
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      };
    }
  }

  /**
   * ออกจากระบบทั้งหมด (ลบทุก session ของผู้ใช้)
   */
  static async logoutAllSessions(userId: string): Promise<AuthResponse> {
    try {
      // ลบทุก session ของผู้ใช้
      await prisma.session.deleteMany({
        where: { userId },
      });

      return {
        success: true,
        message: 'ออกจากระบบทั้งหมดสำเร็จ',
      };
    } catch (error) {
      console.error('Logout all sessions error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบทั้งหมด',
      };
    }
  }

  /**
   * สมัครสมาชิก
   */
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<AuthResponse> {
    try {
      // ตรวจสอบว่าอีเมลซ้ำหรือไม่
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว',
        };
      }

      // ตรวจสอบความแข็งแกร่งของรหัสผ่าน
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `รหัสผ่านไม่ตรงตามข้อกำหนด: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // เข้ารหัสพาสเวิร์ด
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // สร้างผู้ใช้ใหม่
      const newUser = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role ?? 'user',
        },
        include: {
          sessions: true,
          accounts: true,
        },
      });

      // สร้าง JWT tokens
      const accessToken = this.generateAccessToken(newUser);
      const refreshToken = await this.generateRefreshToken(newUser.id);

      // สร้าง session
      const sessionToken = uuidv4();
      await prisma.session.create({
        data: {
          sessionToken,
          userId: newUser.id,
          expires: new Date(Date.now() + this.SESSION_MAX_AGE),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { password: _unused, ...userWithoutPassword } = newUser;

      return {
        success: true,
        message: 'สมัครสมาชิกสำเร็จ',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        sessionToken,
        expiresIn: Math.floor(this.SESSION_MAX_AGE / 1000), // แปลงจาก milliseconds เป็นวินาที
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
      };
    }
  }

  /**
   * ดึงข้อมูลโปรไฟล์ผู้ใช้
   */
  static async getProfile(userId: string): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          loginAttempts: true,
          authMethod: true,
          ldapDN: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
        };
      }

      return {
        success: true,
        message: 'ดึงข้อมูลโปรไฟล์สำเร็จ',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? 'user',
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์',
      };
    }
  }

  /**
   * อัปเดตโปรไฟล์ผู้ใช้
   */
  static async updateProfile(
    userId: string,
    profileData: {
      name?: string;
      email?: string;
      image?: string;
    },
  ): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
        };
      }

      // ตรวจสอบว่าอีเมลซ้ำหรือไม่ (ถ้ามีการเปลี่ยนอีเมล)
      if (profileData.email && profileData.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profileData.email },
        });

        if (existingUser) {
          return {
            success: false,
            message: 'อีเมลนี้ถูกใช้งานแล้ว',
          };
        }
      }

      // อัปเดตโปรไฟล์
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: profileData,
        include: {
          sessions: true,
          accounts: true,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { password: _unused, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        message: 'อัปเดตโปรไฟล์สำเร็จ',
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์',
      };
    }
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
        };
      }

      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password ?? '');

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
        };
      }

      // ตรวจสอบความแข็งแกร่งของรหัสผ่านใหม่
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `รหัสผ่านใหม่ไม่ตรงตามข้อกำหนด: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // ตรวจสอบว่ารหัสผ่านใหม่ไม่ซ้ำกับรหัสผ่านเก่า
      const isSameAsOld = await bcrypt.compare(newPassword, user.password ?? '');
      if (isSameAsOld) {
        return {
          success: false,
          message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเก่า',
        };
      }

      // เข้ารหัสพาสเวิร์ดใหม่
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // อัปเดตรหัสผ่าน
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return {
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
      };
    }
  }

  /**
   * ลบบัญชีผู้ใช้
   */
  static async deleteAccount(userId: string, password: string): Promise<AuthResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
        };
      }

      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(password, user.password ?? '');

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'รหัสผ่านไม่ถูกต้อง',
        };
      }

      // ลบทุก session และ account ของผู้ใช้
      await prisma.session.deleteMany({
        where: { userId },
      });

      await prisma.account.deleteMany({
        where: { userId },
      });

      // ลบบัญชีผู้ใช้
      await prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'ลบบัญชีสำเร็จ',
      };
    } catch (error) {
      console.error('Delete account error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบบัญชี',
      };
    }
  }

  /**
   * ตรวจสอบความแข็งแกร่งของรหัสผ่าน
   */
  private static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    // ตรวจสอบ password validation config
    const passwordConfig = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    };

    const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = passwordConfig;

    if (password.length < minLength) {
      errors.push(`รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
    }

    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ล้าง session ที่หมดอายุ
   */
  private static async cleanupExpiredSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: {
          userId,
          expires: { lt: new Date() },
        },
      });
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
    }
  }

  /**
   * ล้างทุก session ของผู้ใช้
   */
  private static async cleanupAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { userId },
      });
    } catch (error) {
      console.error('Cleanup all user sessions error:', error);
    }
  }

  /**
   * ตรวจสอบว่าเป็น email ที่ถูกต้องหรือไม่
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * สร้าง secure token
   */
  static generateSecureToken(): string {
    return uuidv4();
  }

  /**
   * Hash sensitive data
   */
  static async hashSensitiveData(data: string): Promise<string> {
    return bcrypt.hash(data, 12);
  }

  /**
   * บันทึก login attempt
   * ใช้วิธีการเดียวกับ Local Auth เป็นหลัก
   */
  private static async recordLoginAttempt(
    email: string,
    success: boolean,
    authMethod: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          email,
          success,
          authMethod,
          ipAddress: ipAddress ?? 'unknown',
          userAgent: userAgent ?? 'unknown',
        },
      });

      logger.auth('Login attempt recorded', undefined, undefined, {
        email,
        success,
        authMethod,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      logger.error('Failed to record login attempt', {
        error: (error as Error).message,
        email,
        success,
        authMethod,
      });
    }
  }

  /**
   * คำนวณ Login Count สำหรับผู้ใช้
   * ใช้วิธีการเดียวกับ Local Auth เป็นหลัก
   * สำหรับ: Frontend, User Profile, Session Management
   */
  // eslint-disable-next-line no-unused-vars
  static async calculateLoginCount(email: string, _timeRange: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      // คำนวณจาก successful login attempts ทั้งหมด (ไม่จำกัดเวลา)
      // ค้นหาทั้ง email และ username (สำหรับ LDAP)
      const successfulLoginAttempts = await prisma.loginAttempt.count({
        where: {
          OR: [
            { email: email },
            { email: email.replace('@rpphosp.local', '') }, // สำหรับ username ที่ไม่มี domain
            { email: email.includes('@') ? email : `${email}@rpphosp.local` }, // สำหรับ username ที่มี domain
          ],
          success: true,
        },
      });

      logger.auth('Login count calculated', undefined, undefined, {
        email,
        loginCount: successfulLoginAttempts,
        timeRange: 'all', // แสดงว่าเป็นทั้งหมด
      });

      return successfulLoginAttempts;
    } catch (error) {
      logger.error('Failed to calculate login count', {
        error: (error as Error).message,
        email,
      });
      return 0;
    }
  }

  /**
   * ดึงข้อมูล Login Count สำหรับผู้ใช้
   * ใช้วิธีการเดียวกับ Local Auth เป็นหลัก
   * สำหรับ: Frontend API, User Dashboard
   */
  static async getLoginCount(email: string): Promise<{ loginCount: number; lastLoginTime: Date | null }> {
    try {
      // คำนวณ login count
      const loginCount = await this.calculateLoginCount(email);

      // ดึงข้อมูล login ล่าสุด
      const lastLoginAttempt = await prisma.loginAttempt.findFirst({
        where: {
          OR: [
            { email: email },
            { email: email.replace('@rpphosp.local', '') }, // สำหรับ username ที่ไม่มี domain
            { email: email.includes('@') ? email : `${email}@rpphosp.local` }, // สำหรับ username ที่มี domain
          ],
          success: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const lastLoginTime = lastLoginAttempt ? lastLoginAttempt.createdAt : null;

      logger.auth('Login count retrieved', undefined, undefined, {
        email,
        loginCount,
        lastLoginTime,
      });

      return {
        loginCount,
        lastLoginTime,
      };
    } catch (error) {
      logger.error('Failed to get login count', {
        error: (error as Error).message,
        email,
      });
      return {
        loginCount: 0,
        lastLoginTime: null,
      };
    }
  }

  /**
   * ทดสอบการเชื่อมต่อ LDAP
   */
  static async testLDAPConnection(): Promise<{ success: boolean; message: string }> {
    return LDAPService.testConnection();
  }
}
