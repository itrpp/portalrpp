import { Request } from 'express';

// ========================================
// AUTH TYPES
// ========================================

export interface LoginCredentials {
  email: string;
  password: string;
  authMethod?: 'local' | 'ldap';
}

export interface LDAPLoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  sessionToken?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

// ========================================
// USER TYPES
// ========================================

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  emailVerified?: Date | null;
  role?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  image?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// ========================================
// SESSION TYPES
// ========================================

export interface SessionData {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  user: UserProfile;
}

export interface SessionStatus {
  sessionExists: boolean;
  userExists: boolean;
  isExpired: boolean;
  userActive?: boolean;
  expiredAt?: Date;
  expiresAt?: Date;
}

// ========================================
// VALIDATION TYPES
// ========================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordValidationResult extends ValidationResult {
  strength: 'weak' | 'medium' | 'strong';
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========================================
// ERROR TYPES
// ========================================

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

export interface ValidationError extends AppError {
  field: string;
  value: unknown;
}

// ========================================
// CONFIG TYPES
// ========================================

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

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

export interface LDAPConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  timeout: number;
  connectTimeout: number;
  idleTimeout: number;
}

// ========================================
// MIDDLEWARE TYPES
// ========================================

export interface AuthenticatedRequest extends Request {
  user?: UserProfile & { [key: string]: unknown };
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
}

// ========================================
// LOGGING TYPES
// ========================================

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
