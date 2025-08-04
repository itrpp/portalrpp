// ========================================
// API Gateway Service - Main Entry Point
// ========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { v4 as uuidv4 } from 'uuid';
// Removed express-status-monitor due to security vulnerabilities
// Swagger imports
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Import configurations และ utilities
import { config, validateConfig, isDev } from './config/index.js';
import { logger, logStartup, logShutdown, logRequest } from './utils/logger.js';
import { errorHandler, setupProcessErrorHandlers } from './utils/errorHandler.js';
import {
  generalRateLimiter,
  authRateLimiter,
  validateSessionRateLimiter,
  adminRateLimiter,
  slowDownMiddleware,
  rateLimitMonitor,
} from './middleware/rateLimitMiddleware.js';
import {
  initializeCircuitBreakers,
  circuitBreakerMiddleware,
  getAllCircuitBreakerStats,
} from './middleware/circuitBreakerMiddleware.js';
import { sanitizeInput } from './middleware/validationMiddleware.js';

// ========================================
// SWAGGER CONFIGURATION
// ========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RPP Portal API Gateway',
      version: '1.0.0',
      description: 'API Gateway สำหรับระบบ RPP Portal ที่ทำหน้าที่เป็นจุดเข้าใช้งานหลักของ microservices',
      contact: {
        name: 'RPP Team',
        email: 'support@rpphosp.local',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [import.meta.url], // ใช้ไฟล์ปัจจุบัน
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ========================================
// VALIDATE CONFIGURATION
// ========================================

if (!validateConfig()) {
  console.error('❌ Configuration validation failed. Exiting...');
  process.exit(1);
}

// ========================================
// INITIALIZE SERVICES
// ========================================

// ตั้งค่า process error handlers
setupProcessErrorHandlers();

// เริ่มต้น circuit breakers
initializeCircuitBreakers();

// ========================================
// PERFORMANCE MONITORING
// ========================================

// Metrics collection
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    startTime: Date.now(),
  },
  responseTimes: [] as number[],
  errors: {
    total: 0,
    byType: {} as Record<string, number>,
  },
  performance: {
    p50: 0,
    p95: 0,
    p99: 0,
    avgResponseTime: 0,
    requestRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  },
};

// Performance monitoring middleware
const performanceMonitor = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  // Track request count
  metrics.requests.total++;

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);

    // Keep only last 1000 response times for memory efficiency
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes.shift();
    }

    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }

    // Calculate performance metrics
    calculatePerformanceMetrics();
  });

  next();
};

// Calculate performance metrics
const calculatePerformanceMetrics = () => {
  if (metrics.responseTimes.length === 0) return;

  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const uptime = Date.now() - metrics.requests.startTime;

  metrics.performance = {
    p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
    p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
    p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
    avgResponseTime: sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length,
    requestRate: uptime > 0 ? (metrics.requests.total / uptime) * 1000 : 0,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    cpuUsage: process.cpuUsage().user + process.cpuUsage().system,
  };

  // Check performance targets
  checkPerformanceTargets();
};

// Check performance targets
const checkPerformanceTargets = () => {
  const { performance } = metrics;
  const warnings = [];

  // Response time targets
  if (performance.p50 > 100) warnings.push(`P50 response time (${performance.p50}ms) exceeds target (100ms)`);
  if (performance.p95 > 500) warnings.push(`P95 response time (${performance.p95}ms) exceeds target (500ms)`);
  if (performance.p99 > 1000) warnings.push(`P99 response time (${performance.p99}ms) exceeds target (1000ms)`);

  // Throughput targets
  if (performance.requestRate < 1000) warnings.push(`Request rate (${performance.requestRate}/s) below target (1000/s)`);

  // Memory usage target
  if (performance.memoryUsage > 512) warnings.push(`Memory usage (${performance.memoryUsage.toFixed(2)}MB) exceeds target (512MB)`);

  // CPU usage target (simplified check)
  if (performance.cpuUsage > 80) warnings.push(`CPU usage (${performance.cpuUsage}%) exceeds target (80%)`);

  if (warnings.length > 0) {
    logger.warn('Performance targets not met', { warnings, performance });
  }
};

// ========================================
// EXPRESS APP SETUP
// ========================================

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// ตั้งค่า security headers ด้วย helmet
if (config.security.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    ieNoOpen: true,
  }));
}

// ตั้งค่า CORS
app.use(cors({
  origin: config.security.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'X-API-Key',
  ],
}));

// ตั้งค่า trust proxy เพื่อให้ได้ IP address ที่ถูกต้อง
app.set('trust proxy', true);

// ========================================
// COMPRESSION MIDDLEWARE
// ========================================

if (config.security.compressionEnabled) {
  app.use(compression({
    level: 6, // Optimal compression level
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't want it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Don't compress for health checks and metrics
      if (req.path === '/health' || req.path === '/metrics') {
        return false;
      }
      return compression.filter(req, res);
    },
    // Set appropriate headers
    setHeaders: (res: any) => {
      res.setHeader('Vary', 'Accept-Encoding');
    },
  }));
}

// ========================================
// LOGGING MIDDLEWARE
// ========================================

// ตั้งค่า request ID middleware
app.use((req: any, res: any, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  next();
});

// ตั้งค่า logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// ========================================
// RATE LIMITING MIDDLEWARE
// ========================================

if (config.security.rateLimitEnabled) {
  // General rate limiting
  app.use(generalRateLimiter);

  // Slow down middleware
  app.use(slowDownMiddleware);

  // Rate limit monitoring
  app.use(rateLimitMonitor);
}

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// INPUT SANITIZATION MIDDLEWARE
// ========================================

app.use(sanitizeInput);

// ========================================
// MONITORING MIDDLEWARE
// ========================================

// Removed express-status-monitor due to security vulnerabilities
// Using built-in performance monitoring instead

// ========================================
// REQUEST LOGGING MIDDLEWARE
// ========================================

app.use((req: any, res: any, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Structured logging with request details
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString(),
    };

    // Log based on status code
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }

    logRequest(req, res, responseTime);
  });

  next();
});

// ========================================
// PERFORMANCE MONITORING MIDDLEWARE
// ========================================

app.use(performanceMonitor);


// ========================================
// SWAGGER DOCUMENTATION
// ========================================

// Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RPP Portal API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    url: '/api-docs/swagger.json',
  },
}));

// ========================================
// AUTH SERVICE SWAGGER DOCUMENTATION
// ========================================

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "admin@rpphosp.local"
 *         password:
 *           type: string
 *           example: "password123"
 *         authMethod:
 *           type: string
 *           enum: [local, ldap]
 *           example: "local"
 *     LoginLDAPRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: "ldapuser@rpphosp.local"
 *         password:
 *           type: string
 *           example: "password123"
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "เข้าสู่ระบบสำเร็จ"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *             token:
 *               type: string
 *             refreshToken:
 *               type: string
 *     LogoutRequest:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *     ValidateSessionRequest:
 *       type: object
 *       required:
 *         - sessionToken
 *       properties:
 *         sessionToken:
 *           type: string
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *         newPassword:
 *           type: string
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         code:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Auth Service
 *     description: Authentication และ Admin Management (Auth Service)
 *   - name: Health
 *     description: Health Check และ Monitoring
 *   - name: Information
 *     description: API Gateway Information
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ (Local)
 *     description: เข้าสู่ระบบด้วย email และ password
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             local:
 *               summary: Local Authentication
 *               value:
 *                 email: "admin@rpphosp.local"
 *                 password: "password123"
 *                 authMethod: "local"
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/login-ldap:
 *   post:
 *     summary: เข้าสู่ระบบ (LDAP)
 *     description: เข้าสู่ระบบด้วย LDAP
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginLDAPRequest'
 *           examples:
 *             ldap:
 *               summary: LDAP Authentication
 *               value:
 *                 username: "ldapuser@rpphosp.local"
 *                 password: "password123"
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: ลงทะเบียนผู้ใช้ใหม่
 *     description: สร้างบัญชีผู้ใช้ใหม่
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: ลงทะเบียนสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email ซ้ำ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: ออกจากระบบ
 *     description: ออกจากระบบและ invalidate session
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "ออกจากระบบสำเร็จ"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: ออกจากระบบทั้งหมด
 *     description: ออกจากระบบทุก session ของผู้ใช้
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบทั้งหมดสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "ออกจากระบบทั้งหมดสำเร็จ"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh Token
 *     description: ต่ออายุ access token ด้วย refresh token
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Refresh token สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/verify-token:
 *   post:
 *     summary: ตรวจสอบ Token
 *     description: ตรวจสอบความถูกต้องของ access token
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Token ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/validate-session:
 *   post:
 *     summary: ตรวจสอบ Session
 *     description: ตรวจสอบความถูกต้องของ session
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateSessionRequest'
 *     responses:
 *       200:
 *         description: Session ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Session ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/check-session-status:
 *   post:
 *     summary: ตรวจสอบสถานะ Session
 *     description: ตรวจสอบสถานะของ session
 *     tags: [Auth Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateSessionRequest'
 *     responses:
 *       200:
 *         description: สถานะ Session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Session ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: ข้อมูลผู้ใช้ปัจจุบัน
 *     description: ดึงข้อมูลผู้ใช้ที่ login อยู่
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ข้อมูลผู้ใช้
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: ดูข้อมูล Profile
 *     description: ดึงข้อมูล profile ของผู้ใช้
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ข้อมูล Profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: อัปเดต Profile
 *     description: อัปเดตข้อมูล profile ของผู้ใช้
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: อัปเดต Profile สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "อัปเดต Profile สำเร็จ"
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: เปลี่ยนรหัสผ่าน
 *     description: เปลี่ยนรหัสผ่านของผู้ใช้
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "เปลี่ยนรหัสผ่านสำเร็จ"
 *       400:
 *         description: รหัสผ่านปัจจุบันไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: ลบบัญชีผู้ใช้
 *     description: ลบบัญชีผู้ใช้และข้อมูลทั้งหมด
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ลบบัญชีสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "ลบบัญชีสำเร็จ"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/statistics:
 *   get:
 *     summary: ดูสถิติระบบ
 *     description: ดึงสถิติต่างๆ ของระบบ
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: สถิติระบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     activeSessions:
 *                       type: number
 *                     loginAttempts:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - ไม่มีสิทธิ์ admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: ดูรายชื่อผู้ใช้ทั้งหมด
 *     description: ดึงรายชื่อผู้ใช้ทั้งหมดในระบบ
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: หน้า
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: จำนวนรายการต่อหน้า
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: ค้นหาชื่อหรือ email
 *     responses:
 *       200:
 *         description: รายชื่อผู้ใช้
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - ไม่มีสิทธิ์ admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/sessions:
 *   get:
 *     summary: ดู Session ทั้งหมด
 *     description: ดึงข้อมูล session ทั้งหมดในระบบ
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: หน้า
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: จำนวนรายการต่อหน้า
 *     responses:
 *       200:
 *         description: รายการ Session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - ไม่มีสิทธิ์ admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/login-attempts:
 *   get:
 *     summary: ดูประวัติการ Login
 *     description: ดึงประวัติการพยายามเข้าสู่ระบบ
 *     tags: [Auth Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: หน้า
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: จำนวนรายการต่อหน้า
 *     responses:
 *       200:
 *         description: ประวัติการ Login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     loginAttempts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - ไม่มีสิทธิ์ admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ========================================
// HEALTH CHECK ENDPOINTS
// ========================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: ตรวจสอบสถานะของ API Gateway และ services ต่างๆ
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API Gateway พร้อมใช้งาน
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 service:
 *                   type: string
 *                   example: "API Gateway"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 port:
 *                   type: number
 *                   example: 3001
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 services:
 *                   type: object
 *                   description: Status of connected services
 *                 circuitBreakers:
 *                   type: object
 *                   description: Circuit breaker statistics
 *                 availability:
 *                   type: object
 *                   description: Availability metrics and targets
 *       503:
 *         description: API Gateway ไม่พร้อมใช้งาน
 */
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    // ตรวจสอบสถานะ services
    const services = await checkServicesHealth();
    const circuitBreakers = getAllCircuitBreakerStats();

    // Calculate availability metrics
    const uptime = process.uptime();
    const totalRequests = metrics.requests.total;
    const errorRate = totalRequests > 0 ? (metrics.requests.failed / totalRequests) * 100 : 0;
    const circuitBreakerTrips = Object.values(circuitBreakers).filter(cb => cb.state.status === 'OPEN').length;
    const circuitBreakerTripRate = Object.keys(circuitBreakers).length > 0 ? (circuitBreakerTrips / Object.keys(circuitBreakers).length) * 100 : 0;

    const healthResponse = {
      status: 'OK',
      service: 'API Gateway',
      timestamp: new Date().toISOString(),
      port: config.port,
      environment: config.environment,
      uptime,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      services,
      circuitBreakers,
      availability: {
        uptimePercentage: (uptime / (uptime + 0)) * 100, // Simplified calculation
        errorRate,
        circuitBreakerTripRate,
        targets: {
          uptime: { target: 99.9, unit: '%' },
          errorRate: { target: 0.1, unit: '%' },
          circuitBreakerTrips: { target: 1, unit: '%' },
          rateLimitHits: { target: 5, unit: '%' },
        },
      },
    };

    const responseTime = Date.now() - startTime;
    logger.info('Health check completed', { responseTime, services });

    res.json(healthResponse);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'ERROR',
      service: 'API Gateway',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// METRICS ENDPOINT
// ========================================

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: System metrics endpoint
 *     description: ดู metrics ของระบบ
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapUsed:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     external:
 *                       type: number
 *                     rss:
 *                       type: number
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: number
 *                     system:
 *                       type: number
 *                 circuitBreakers:
 *                   type: object
 *                   description: Circuit breaker statistics
 *                 performance:
 *                   type: object
 *                   description: Performance metrics and targets
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/metrics', (req, res) => {
  // Calculate performance metrics
  const responseTimes = metrics.responseTimes;
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.5)] : 0;
  const p95 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;
  const p99 = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] : 0;

  const uptime = Date.now() - metrics.requests.startTime;
  const requestRate = uptime > 0 ? (metrics.requests.total / uptime) * 1000 : 0;

  const systemMetrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    circuitBreakers: getAllCircuitBreakerStats(),
    timestamp: new Date().toISOString(),
  };

  const performanceMetrics = {
    requests: {
      total: metrics.requests.total,
      successful: metrics.requests.successful,
      failed: metrics.requests.failed,
      rate: requestRate,
    },
    responseTime: {
      average: avgResponseTime,
      p50,
      p95,
      p99,
    },
    errors: {
      total: metrics.errors.total,
      rate: uptime > 0 ? (metrics.errors.total / uptime) * 1000 : 0,
      byType: metrics.errors.byType,
    },
    performance: metrics.performance,
    targets: {
      responseTime: {
        p50: { target: 100, unit: 'ms' },
        p95: { target: 500, unit: 'ms' },
        p99: { target: 1000, unit: 'ms' },
      },
      throughput: {
        requestsPerSecond: { target: 1000, unit: 'req/s' },
      },
      resources: {
        memory: { target: 512, unit: 'MB' },
        cpu: { target: 80, unit: '%' },
      },
    },
  };

  res.json({
    ...systemMetrics,
    performance: performanceMetrics,
  });
});


// ========================================
// SERVICE HEALTH CHECK FUNCTION
// ========================================

async function checkServicesHealth() {
  const services: Record<string, any> = {};

  for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(serviceConfig.healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      services[serviceName] = {
        url: serviceConfig.url,
        status: response.ok ? 'connected' : 'error',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      services[serviceName] = {
        url: serviceConfig.url,
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  return services;
}

// ========================================
// PROXY CONFIGURATION
// ========================================

// สร้าง proxy สำหรับ Auth Service
const authServiceProxy = createProxyMiddleware({
  target: config.services.auth?.url || 'http://localhost:3002',
  changeOrigin: true,
  timeout: config.services.auth?.timeout || 30000,
  proxyTimeout: config.services.auth?.timeout || 30000,
  pathRewrite: {
    '^/api/auth': '/auth',
    '^/api/admin': '/admin',
  },
  onProxyReq: (proxyReq, req) => {
    // เพิ่ม service name สำหรับ monitoring
    (req as any).serviceName = 'auth-service';

    // Log การส่งต่อ request
    if (isDev()) {
      logger.debug(`🔄 ส่งต่อ ${req.method} ${req.path} -> Auth Service`);
    }

    // ส่งต่อ headers ที่สำคัญ
    if (req.headers['authorization']) {
      proxyReq.setHeader('Authorization', req.headers['authorization']);
    }
    if (req.headers['content-type']) {
      proxyReq.setHeader('Content-Type', req.headers['content-type']);
    }

    // เพิ่ม tracing headers
    proxyReq.setHeader('X-Request-ID', (req as any).requestId);
    proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress || 'unknown');
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);

    // สำหรับ POST request ให้ส่งต่อ body
    if (req.method === 'POST' && req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req) => {
    // Log การตอบกลับจาก Auth Service
    if (isDev()) {
      logger.debug(`✅ Auth Service ตอบกลับด้วย ${proxyRes.statusCode} สำหรับ ${req.method} ${req.path}`);
    }

    // Add response headers for monitoring
    proxyRes.headers['X-Proxy-By'] = 'API-Gateway';
    proxyRes.headers['X-Service'] = 'auth-service';
  },
  onError: (err, req, res) => {
    // จัดการ error เมื่อ Auth Service ไม่พร้อมใช้งาน
    logger.error(`❌ Proxy error สำหรับ ${req.method} ${req.path}:`, err.message);

    // Track error metrics
    metrics.errors.total++;
    const errorType = (err as any).code || 'PROXY_ERROR';
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;

    res.status(503).json({
      success: false,
      message: 'Auth Service ไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง',
      code: 'AUTH_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
      retryAfter: 30, // Suggest retry after 30 seconds
    });
  },
});

// สร้าง proxy สำหรับ Revenue Service
const revenueServiceProxy = createProxyMiddleware({
  target: config.services.revenue?.url || 'http://localhost:3003',
  changeOrigin: true,
  timeout: config.services.revenue?.timeout || 30000,
  proxyTimeout: config.services.revenue?.timeout || 30000,
  pathRewrite: {
    '^/api/revenue': '/api/revenue',
    '^/api/reports': '/api/reports',
    '^/api/dbf': '/api/dbf',
  },
  onProxyReq: (proxyReq, req) => {
    // เพิ่ม service name สำหรับ monitoring
    (req as any).serviceName = 'revenue-service';

    // Log การส่งต่อ request
    if (isDev()) {
      logger.debug(`🔄 ส่งต่อ ${req.method} ${req.path} -> Revenue Service`);
    }

    // ส่งต่อ headers ที่สำคัญ
    if (req.headers['authorization']) {
      proxyReq.setHeader('Authorization', req.headers['authorization']);
    }
    if (req.headers['content-type']) {
      proxyReq.setHeader('Content-Type', req.headers['content-type']);
    }

    // เพิ่ม tracing headers
    proxyReq.setHeader('X-Request-ID', (req as any).requestId);
    proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress || 'unknown');
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);

    // สำหรับ POST request ให้ส่งต่อ body
    if (req.method === 'POST' && req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req) => {
    // Log การตอบกลับจาก Revenue Service
    if (isDev()) {
      logger.debug(`✅ Revenue Service ตอบกลับด้วย ${proxyRes.statusCode} สำหรับ ${req.method} ${req.path}`);
    }

    // Add response headers for monitoring
    proxyRes.headers['X-Proxy-By'] = 'API-Gateway';
    proxyRes.headers['X-Service'] = 'revenue-service';
  },
  onError: (err, req, res) => {
    // จัดการ error เมื่อ Revenue Service ไม่พร้อมใช้งาน
    logger.error(`❌ Proxy error สำหรับ ${req.method} ${req.path}:`, err.message);

    // Track error metrics
    metrics.errors.total++;
    const errorType = (err as any).code || 'PROXY_ERROR';
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;

    res.status(503).json({
      success: false,
      message: 'Revenue Service ไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง',
      code: 'REVENUE_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
      retryAfter: 30, // Suggest retry after 30 seconds
    });
  },
});

// ========================================
// ROUTE CONFIGURATION
// ========================================

// Auth Service routes (with rate limiting)
app.use('/api/auth', authRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);
app.use('/api/admin', adminRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);

// Special rate limiting for validate-session endpoint
app.post('/api/auth/validate-session', validateSessionRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);

// Special rate limiting for verify-token endpoint
app.post('/api/auth/verify-token', authRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);

// Revenue Service routes (with rate limiting)
app.use('/api/revenue', generalRateLimiter, circuitBreakerMiddleware('revenue-service'), revenueServiceProxy);
app.use('/api/reports', generalRateLimiter, circuitBreakerMiddleware('revenue-service'), revenueServiceProxy);

// Import Service routes (with rate limiting)
app.use('/api/import', generalRateLimiter, circuitBreakerMiddleware('revenue-service'), revenueServiceProxy);

// DBF Service routes (with rate limiting)
app.use('/api/dbf', generalRateLimiter, circuitBreakerMiddleware('revenue-service'), revenueServiceProxy);

// Backward compatibility routes
app.use('/auth', authRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);
app.use('/admin', adminRateLimiter, circuitBreakerMiddleware('auth-service'), authServiceProxy);

// ========================================
// API DOCUMENTATION ENDPOINT
// ========================================

// ลบ /api/docs endpoint ออกเพราะมี Swagger UI ที่ /api-docs แล้ว

// ========================================
// DEFAULT ROUTE
// ========================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Gateway Information
 *     description: ดูข้อมูลของ API Gateway
 *     tags: [Information]
 *     responses:
 *       200:
 *         description: API Gateway information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 services:
 *                   type: object
 *                 endpoints:
 *                   type: object
 *                 cors:
 *                   type: object
 *                 rateLimiting:
 *                   type: object
 */
app.get('/', (req, res) => {
  res.json({
    message: 'RPP Portal API Gateway',
    version: '1.0.0',
    environment: config.environment,
    services: {
      auth: config.services.auth?.url || 'http://localhost:3002',
      revenue: config.services.revenue?.url || 'http://localhost:3003',
    },
    endpoints: {
      health: 'GET /health',
      metrics: 'GET /metrics',
      swagger: 'GET /api-docs',
      auth: '/api/auth/*',
      admin: '/api/admin/*',
      revenue: '/api/revenue/*',
      reports: '/api/reports/*',
    },
    cors: {
      enabled: true,
      origins: config.security.corsOrigins,
    },
    rateLimiting: {
      enabled: config.security.rateLimitEnabled,
      general: `${config.rateLimit.general.maxRequests} requests per ${config.rateLimit.general.windowMs / 1000} seconds`,
      auth: `${config.rateLimit.auth.maxRequests} requests per ${config.rateLimit.auth.windowMs / 1000} seconds`,
      admin: `${config.rateLimit.admin.maxRequests} requests per ${config.rateLimit.admin.windowMs / 1000} seconds`,
    },
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// จัดการ 404 error (ไม่พบ endpoint)
app.use('*', (req, res) => {
  // Track 404 errors
  metrics.errors.total++;
  metrics.errors.byType['NOT_FOUND'] = (metrics.errors.byType['NOT_FOUND'] || 0) + 1;

  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint นี้',
    code: 'ENDPOINT_NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
    availableEndpoints: {
      health: 'GET /health',
      metrics: 'GET /metrics',
      swagger: 'GET /api-docs',
      auth: '/api/auth/*',
      admin: '/api/admin/*',
      revenue: '/api/revenue/*',
      reports: '/api/reports/*',
    },
  });
});

// Global error handler
app.use(errorHandler);

// ========================================
// START SERVER
// ========================================

const server = app.listen(config.port, () => {
  logStartup();

  console.log(`🚀 API Gateway กำลังรันที่ port ${config.port}`);
  console.log(`📍 Health check: http://localhost:${config.port}/health`);
  console.log(`📊 Metrics: http://localhost:${config.port}/metrics`);
  console.log(`📖 Swagger UI: http://localhost:${config.port}/api-docs`);
  console.log(`🔐 Auth Service Proxy: http://localhost:${config.port}/api/auth/*`);
  console.log(`👨‍💼 Admin Service Proxy: http://localhost:${config.port}/api/admin/*`);
  console.log(`💰 Revenue Service Proxy: http://localhost:${config.port}/api/revenue/*`);
  console.log(`📊 Reports Service Proxy: http://localhost:${config.port}/api/reports/*`);
  console.log(`🌍 CORS Origins: ${config.security.corsOrigins.join(', ')}`);
  console.log(`⚡ Rate Limiting: ${config.security.rateLimitEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`🛡️ Security Headers: ${config.security.helmetEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`🗜️ Compression: ${config.security.compressionEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`📈 Monitoring: ${config.monitoring.enabled ? 'Enabled' : 'Disabled'}`);

  // Log configuration details
  console.log('\n📋 Configuration:');
  console.log(`   - Environment: ${config.environment}`);
  console.log(`   - Circuit Breaker: ${config.circuitBreaker.timeout}ms timeout, ${config.circuitBreaker.errorThresholdPercentage}% threshold`);
  console.log(`   - Rate Limits: General ${config.rateLimit.general.maxRequests}/min, Auth ${config.rateLimit.auth.maxRequests}/min, Admin ${config.rateLimit.admin.maxRequests}/min`);
  console.log('   - Performance Targets: P50<100ms, P95<500ms, P99<1000ms, >1000req/s, <512MB memory');
  console.log('   - Availability Targets: >99.9% uptime, <0.1% error rate, <1% circuit breaker trips');
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  logShutdown();

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); 
