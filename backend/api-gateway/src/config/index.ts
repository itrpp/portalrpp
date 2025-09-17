// ========================================
// Configuration สำหรับ API Gateway
// ========================================

import dotenv from 'dotenv';
import { ApiGatewayConfig, ServiceConfig, CircuitBreakerConfig, RateLimitConfig, SecurityConfig, MonitoringConfig, LogConfig } from '../types/index.js';

// โหลด environment variables
dotenv.config();

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development';
const isProduction = environment === 'production';

// ========================================
// SERVICE CONFIGURATIONS
// ========================================

const services: Record<string, ServiceConfig> = {
  auth: {
    name: 'Auth Service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
    healthCheckUrl: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/health`,
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '30000'),
    retries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3'),
  },
  revenue: {
    name: 'Revenue Service',
    url: process.env.REVENUE_SERVICE_URL || 'http://localhost:3003',
    healthCheckUrl: `${process.env.REVENUE_SERVICE_URL || 'http://localhost:3003'}/health`,
    timeout: parseInt(process.env.REVENUE_SERVICE_TIMEOUT || '300000'), // 5 นาที สำหรับ validation ไฟล์ขนาดใหญ่
    retries: parseInt(process.env.REVENUE_SERVICE_RETRIES || '3'),
  },
};

// ========================================
// CIRCUIT BREAKER CONFIGURATION
// ========================================

const circuitBreaker: CircuitBreakerConfig = {
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '10000'), // 10 seconds
  errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50'), // 50% = 5 failures out of 10
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'), // 60 seconds
  volumeThreshold: parseInt(process.env.CIRCUIT_BREAKER_VOLUME_THRESHOLD || '10'), // Monitor: 10 requests
};

// ========================================
// RATE LIMITING CONFIGURATION
// ========================================

const rateLimit: RateLimitConfig = {
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL_MAX_REQUESTS || '100'), // 100 requests per minute
  },
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '50'), // เพิ่มเป็น 50 requests per minute
  },
  validateSession: {
    windowMs: parseInt(process.env.RATE_LIMIT_VALIDATE_SESSION_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_VALIDATE_SESSION_MAX_REQUESTS || '100'), // เพิ่มเป็น 100 requests per minute
  },
  admin: {
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN_MAX_REQUESTS || '10'), // 10 requests per minute
  },
  slowDown: {
    windowMs: parseInt(process.env.RATE_LIMIT_SLOW_DOWN_WINDOW_MS || '900000'), // 15 minutes
    delayAfter: parseInt(process.env.RATE_LIMIT_SLOW_DOWN_DELAY_AFTER || '50'),
    delayMs: parseInt(process.env.RATE_LIMIT_SLOW_DOWN_DELAY_MS || '500'),
  },
};

// ========================================
// SECURITY CONFIGURATION
// ========================================

const security: SecurityConfig = {
  corsOrigins: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  helmetEnabled: process.env.HELMET_ENABLED !== 'false',
  compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
};

// ========================================
// MONITORING CONFIGURATION
// ========================================

const monitoring: MonitoringConfig = {
  enabled: process.env.MONITORING_ENABLED !== 'false',
  metricsPath: process.env.METRICS_PATH || '/metrics',
  healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
  // Removed statusMonitorPath due to security vulnerabilities
};

// ========================================
// LOGGING CONFIGURATION
// ========================================

const logging: LogConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: process.env.LOG_FORMAT || 'json',
  transports: process.env.LOG_TRANSPORTS 
    ? process.env.LOG_TRANSPORTS.split(',') 
    : ['console', 'file'],
  filename: process.env.LOG_FILENAME || 'logs/api-gateway.log',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
};

// ========================================
// MAIN CONFIGURATION
// ========================================

export const config: ApiGatewayConfig = {
  port: parseInt(process.env.PORT || '3001'),
  environment,
  services,
  circuitBreaker,
  rateLimit,
  security,
  monitoring,
  logging,
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

export const validateConfig = (): boolean => {
  const errors: string[] = [];

  // ตรวจสอบ port
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // ตรวจสอบ services
  Object.entries(config.services).forEach(([key, service]) => {
    if (!service.url) {
      errors.push(`${key} service URL is required`);
    }
    if (!service.healthCheckUrl) {
      errors.push(`${key} service health check URL is required`);
    }
  });

  // ตรวจสอบ rate limit
  if (config.rateLimit.general.windowMs < 1000) {
    errors.push('Rate limit general window must be at least 1000ms');
  }
  if (config.rateLimit.general.maxRequests < 1) {
    errors.push('Rate limit general max requests must be at least 1');
  }
  if (config.rateLimit.auth.windowMs < 1000) {
    errors.push('Rate limit auth window must be at least 1000ms');
  }
  if (config.rateLimit.auth.maxRequests < 1) {
    errors.push('Rate limit auth max requests must be at least 1');
  }
  if (config.rateLimit.admin.windowMs < 1000) {
    errors.push('Rate limit admin window must be at least 1000ms');
  }
  if (config.rateLimit.admin.maxRequests < 1) {
    errors.push('Rate limit admin max requests must be at least 1');
  }
  if (config.rateLimit.slowDown.windowMs < 1000) {
    errors.push('Rate limit slow down window must be at least 1000ms');
  }
  if (config.rateLimit.slowDown.delayAfter < 1) {
    errors.push('Rate limit slow down delay after must be at least 1');
  }
  if (config.rateLimit.slowDown.delayMs < 1) {
    errors.push('Rate limit slow down delay ms must be at least 1');
  }

  // ตรวจสอบ circuit breaker
  if (config.circuitBreaker.timeout < 1000) {
    errors.push('Circuit breaker timeout must be at least 1000ms');
  }
  if (config.circuitBreaker.errorThresholdPercentage < 1 || config.circuitBreaker.errorThresholdPercentage > 100) {
    errors.push('Circuit breaker error threshold must be between 1 and 100');
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    return false;
  }

  return true;
};

// ========================================
// ENVIRONMENT HELPERS
// ========================================

export const isDev = (): boolean => isDevelopment;
export const isProd = (): boolean => isProduction;
export const isTest = (): boolean => environment === 'test';

// ========================================
// SERVICE URL HELPERS
// ========================================

export const getServiceUrl = (serviceName: string): string => {
  const service = config.services[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} not found in configuration`);
  }
  return service.url;
};

export const getServiceHealthUrl = (serviceName: string): string => {
  const service = config.services[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} not found in configuration`);
  }
  return service.healthCheckUrl;
};

// ========================================
// EXPORT CONFIGURATION
// ========================================

export default config; 
