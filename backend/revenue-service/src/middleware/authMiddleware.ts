// ========================================
// AUTHENTICATION MIDDLEWARE FOR REVENUE SERVICE
// ========================================

import { Request, Response, NextFunction } from 'express';
import { logInfo, logError } from '@/utils/logger';

// Token cache เพื่อลดการเรียก API Gateway
const tokenCache = new Map<string, { user: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 นาที

// ล้าง cache ที่หมดอายุทุก 10 นาที (ไม่รันใน test environment)
let cleanupInterval: NodeJS.Timeout | null = null;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now > value.expires) {
        tokenCache.delete(key);
      }
    }
    logInfo('Cleaned expired tokens from cache', { 
      remainingTokens: tokenCache.size 
    });
  }, 10 * 60 * 1000); // 10 นาที
}

// Export cleanup function for tests
export function cleanupAuthMiddleware() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  tokenCache.clear();
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionToken?: string;
}

/**
 * ตรวจสอบ sessionToken จาก header
 */
export const authenticateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ตรวจสอบ Authorization Bearer token ก่อน
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // ตรวจสอบ session token
    const sessionToken = (req.headers['x-session-token'] || req.headers['X-Session-Token']) as string;

    if (!bearerToken && !sessionToken) {
      logError('Missing authentication token', undefined, { requestPath: req.path, requestMethod: req.method });
      res.status(401).json({
        success: false,
        message: 'ไม่พบ authentication token',
        code: 'MISSING_AUTH_TOKEN',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Debug: แสดงข้อมูล token
    logInfo('Authentication attempt', { 
      hasBearerToken: !!bearerToken,
      hasSessionToken: !!sessionToken,
      bearerToken: bearerToken ? bearerToken.substring(0, 10) + '...' : 'none',
      sessionToken: sessionToken ? sessionToken.substring(0, 10) + '...' : 'none',
      requestPath: req.path,
      requestMethod: req.method 
    });

    // ถ้ามี bearer token ให้ตรวจสอบผ่าน API Gateway
    if (bearerToken) {
      // ตรวจสอบ cache ก่อน
      const cachedToken = tokenCache.get(bearerToken);
      if (cachedToken && Date.now() < cachedToken.expires) {
        logInfo('Using cached token', { 
          userId: cachedToken.user.id,
          userEmail: cachedToken.user.email,
          requestPath: req.path 
        });
        
        req.userId = cachedToken.user.id;
        req.userEmail = cachedToken.user.email;
        req.userRole = cachedToken.user.role;
        
        next();
        return;
      }

      const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
      const validateUrl = `${apiGatewayUrl}/api/auth/verify-token`;

      logInfo('Calling API Gateway verify-token', { 
        apiGatewayUrl,
        validateUrl,
        bearerToken: bearerToken.substring(0, 10) + '...'
      });

      try {
        const response = await fetch(validateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
          },
          body: JSON.stringify({ accessToken: bearerToken }),
        });

        logInfo('API Gateway response received', { 
          status: response.status,
          statusText: response.statusText,
          url: validateUrl
        });

        if (!response.ok) {
          const errorText = await response.text();
          logError('Token verification failed', undefined, { 
            requestPath: req.path, 
            requestMethod: req.method, 
            responseStatus: response.status,
            errorText: errorText.substring(0, 200)
          });
          res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้อง',
            code: 'INVALID_TOKEN',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const data = await response.json() as any;

        logInfo('API Gateway response data', { 
          success: data.success,
          hasUser: !!data.user,
          userId: data.user?.id
        });

        if (!data.success || !data.user) {
          logError('Token verification returned invalid data', undefined, { 
            requestPath: req.path, 
            requestMethod: req.method,
            data: JSON.stringify(data).substring(0, 200)
          });
          res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้อง',
            code: 'INVALID_TOKEN_DATA',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // เพิ่มข้อมูลผู้ใช้ลงใน request
        req.userId = data.user.id;
        req.userEmail = data.user.email;
        req.userRole = data.user.role;

        // เก็บ token ใน cache
        tokenCache.set(bearerToken, {
          user: data.user,
          expires: Date.now() + CACHE_TTL
        });

        logInfo('Token verified successfully', { 
          userId: req.userId, 
          userEmail: req.userEmail, 
          requestPath: req.path 
        });

        next();
        return;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        logError('Error verifying token with API Gateway', errorObj, { 
          requestPath: req.path,
          requestMethod: req.method,
          apiGatewayUrl,
          validateUrl
        });
        res.status(503).json({
          success: false,
          message: 'ไม่สามารถตรวจสอบ token ได้ กรุณาลองใหม่อีกครั้ง',
          code: 'API_GATEWAY_UNAVAILABLE',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // ถ้ามี session token ให้ตรวจสอบผ่าน API Gateway validate-session
    if (sessionToken) {
      // ตรวจสอบ cache ก่อน
      const cachedSession = tokenCache.get(sessionToken);
      if (cachedSession && Date.now() < cachedSession.expires) {
        logInfo('Using cached session', { 
          userId: cachedSession.user.id,
          userEmail: cachedSession.user.email,
          requestPath: req.path 
        });
        
        req.userId = cachedSession.user.id;
        req.userEmail = cachedSession.user.email;
        req.userRole = cachedSession.user.role;
        req.sessionToken = sessionToken;
        
        next();
        return;
      }

      const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
      const validateUrl = `${apiGatewayUrl}/api/auth/validate-session`;

      logInfo('Calling API Gateway validate-session', { 
        apiGatewayUrl,
        validateUrl,
        sessionToken: sessionToken.substring(0, 10) + '...'
      });

      try {
        const response = await fetch(validateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({ sessionToken }),
        });

        logInfo('API Gateway response received', { 
          status: response.status,
          statusText: response.statusText,
          url: validateUrl
        });

        if (!response.ok) {
          const errorText = await response.text();
          logError('Session validation failed', undefined, { 
            requestPath: req.path, 
            requestMethod: req.method, 
            responseStatus: response.status,
            errorText: errorText.substring(0, 200)
          });
          res.status(401).json({
            success: false,
            message: 'Session ไม่ถูกต้อง',
            code: 'INVALID_SESSION',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const data = await response.json() as any;

        logInfo('API Gateway response data', { 
          success: data.success,
          hasUser: !!data.user,
          userId: data.user?.id
        });

        if (!data.success || !data.user) {
          logError('Session validation returned invalid data', undefined, { 
            requestPath: req.path, 
            requestMethod: req.method,
            data: JSON.stringify(data).substring(0, 200)
          });
          res.status(401).json({
            success: false,
            message: 'Session ไม่ถูกต้อง',
            code: 'INVALID_SESSION_DATA',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // เพิ่มข้อมูลผู้ใช้ลงใน request
        req.userId = data.user.id;
        req.userEmail = data.user.email;
        req.userRole = data.user.role;
        req.sessionToken = sessionToken;

        // เก็บ session ใน cache
        tokenCache.set(sessionToken, {
          user: data.user,
          expires: Date.now() + CACHE_TTL
        });

        logInfo('Session validated successfully', { 
          userId: req.userId, 
          userEmail: req.userEmail, 
          requestPath: req.path 
        });

        next();
        return;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        logError('Error validating session with API Gateway', errorObj, { 
          requestPath: req.path,
          requestMethod: req.method,
          apiGatewayUrl,
          validateUrl
        });
        res.status(503).json({
          success: false,
          message: 'ไม่สามารถตรวจสอบ session ได้ กรุณาลองใหม่อีกครั้ง',
          code: 'API_GATEWAY_UNAVAILABLE',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // ถ้าไม่มี token ใดๆ
    res.status(401).json({
      success: false,
      message: 'ไม่พบ authentication token',
      code: 'MISSING_AUTH_TOKEN',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    logError('Authentication middleware error', errorObj, { 
      requestPath: req.path,
      requestMethod: req.method,
    });
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ authentication',
      code: 'AUTHENTICATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * ตรวจสอบสิทธิ์ admin
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.userRole || req.userRole !== 'admin') {
    logError('Access denied - admin role required', undefined, { 
      userId: req.userId, 
      userRole: req.userRole, 
      requestPath: req.path 
    });
    res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึง',
      code: 'INSUFFICIENT_PERMISSIONS',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * ตรวจสอบสิทธิ์ user หรือ admin
 */
export const requireUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.userId) {
    logError('Access denied - user authentication required', undefined, { requestPath: req.path });
    res.status(401).json({
      success: false,
      message: 'ต้องเข้าสู่ระบบก่อน',
      code: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}; 