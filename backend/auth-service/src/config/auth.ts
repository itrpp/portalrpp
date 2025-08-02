import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

/**
 * Authentication Configuration
 * ตั้งค่าการ authentication และ JWT
 */

export interface JwtConfig {
  secret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface SessionConfig {
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface AuthConfig {
  jwt: JwtConfig;
  session: SessionConfig;
}

// JWT Configuration (ตาม Security Requirements)
const jwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET ?? 'your-secret-key',
  accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? '60m', // เพิ่มจาก 15m เป็น 60m
  refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ?? '7d', // 7 วันตาม Security Requirements
};

// Session Configuration (ตาม Security Requirements)
const sessionConfig: SessionConfig = {
  maxAge: parseInt(process.env.SESSION_MAX_AGE ?? '86400000'), // 24 ชั่วโมงตาม Security Requirements (86400000 milliseconds)
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
};

// Export configuration
export const authConfig: AuthConfig = {
  jwt: jwtConfig,
  session: sessionConfig,
};

/**
 * Validate JWT configuration
 */
export function validateJwtConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!authConfig.jwt.secret || authConfig.jwt.secret === 'your-secret-key') {
    errors.push('JWT_SECRET ต้องตั้งค่าใน environment variables');
  }

  if (!authConfig.jwt.accessTokenExpiresIn) {
    errors.push('JWT_ACCESS_TOKEN_EXPIRES_IN ต้องตั้งค่าใน environment variables');
  }

  if (!authConfig.jwt.refreshTokenExpiresIn) {
    errors.push('JWT_REFRESH_TOKEN_EXPIRES_IN ต้องตั้งค่าใน environment variables');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get JWT configuration
 */
export function getJwtConfig(): JwtConfig {
  return authConfig.jwt;
}

/**
 * Get session configuration
 */
export function getSessionConfig(): SessionConfig {
  return authConfig.session;
}

/**
 * Check if authentication is properly configured
 */
export function isAuthConfigured(): boolean {
  const validation = validateJwtConfig();
  return validation.isValid;
}

/**
 * Get authentication status
 */
export function getAuthStatus(): { configured: boolean; errors: string[] } {
  const validation = validateJwtConfig();
  return {
    configured: validation.isValid,
    errors: validation.errors,
  };
}
