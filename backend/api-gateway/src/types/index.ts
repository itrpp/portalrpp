// ========================================
// Type Definitions สำหรับ API Gateway
// ========================================

export interface ServiceConfig {
  name: string;
  url: string;
  healthCheckUrl: string;
  timeout: number;
  retries: number;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

export interface RateLimitConfig {
  general: {
    windowMs: number;
    maxRequests: number;
  };
  auth: {
    windowMs: number;
    maxRequests: number;
  };
  validateSession: {
    windowMs: number;
    maxRequests: number;
  };
  admin: {
    windowMs: number;
    maxRequests: number;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
  };
}

export interface ProxyConfig {
  target: string;
  changeOrigin: boolean;
  timeout: number;
  proxyTimeout: number;
  pathRewrite: Record<string, string>;
}

export interface LogConfig {
  level: string;
  format: string;
  transports: string[];
  filename: string;
  maxSize: string;
  maxFiles: string;
}

export interface SecurityConfig {
  corsOrigins: string[];
  rateLimitEnabled: boolean;
  helmetEnabled: boolean;
  compressionEnabled: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsPath: string;
  healthCheckPath: string;
      // Removed statusMonitorPath due to security vulnerabilities
}

export interface ApiGatewayConfig {
  port: number;
  environment: string;
  services: Record<string, ServiceConfig>;
  circuitBreaker: CircuitBreakerConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  logging: LogConfig;
}

// Request และ Response Types
export interface ApiRequest extends Express.Request {
  requestId: string;
  startTime: number;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface ApiResponse extends Express.Response {
  requestId: string;
  responseTime: number;
}

export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  service: string;
  timestamp: string;
  port: number;
  services: Record<string, {
    url: string;
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
  }>;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  requestId?: string;
  timestamp: string;
}

// Service Health Types
export interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export interface ServiceRegistry {
  [key: string]: ServiceHealth;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

export interface RateLimitResponse {
  success: false;
  message: string;
  retryAfter: number;
  limit: number;
  remaining: number;
}

// Circuit Breaker Types
export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: string;
  nextAttempt: string;
}

export interface CircuitBreakerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  state: CircuitBreakerState;
}

// Logging Types
export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

// Metrics Types
export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  services: Record<string, ServiceHealth>;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Authentication Types
export interface AuthToken {
  token: string;
  type: 'Bearer';
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthRequest extends ApiRequest {
  user: AuthUser;
}

// API Documentation Types
export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  responses?: Record<string, any>;
  tags?: string[];
}

export interface ApiDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: Record<string, ApiEndpoint>;
  schemas: Record<string, any>;
}

// Environment Variables Types
export interface Environment {
  NODE_ENV: string;
  PORT: number;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
  REDIS_URL?: string;
  JWT_SECRET?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  CIRCUIT_BREAKER_TIMEOUT: number;
  CIRCUIT_BREAKER_ERROR_THRESHOLD: number;
  CIRCUIT_BREAKER_RESET_TIMEOUT: number;
  AUTH_SERVICE_URL: string;
  USER_SERVICE_URL?: string;
  DATABASE_SERVICE_URL?: string;
} 
