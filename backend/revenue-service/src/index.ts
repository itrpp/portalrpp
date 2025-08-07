// ========================================
// REVENUE SERVICE - MAIN ENTRY POINT
// ========================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as fs from 'fs-extra';
import * as path from 'path';
import config from '@/config';
import { errorHandler, notFoundHandler } from '@/utils/errorHandler';
import { logInfo, logError } from '@/utils/logger';
import revenueRoutes from '@/routes/revenueRoutes';
import DatabaseService from '@/services/databaseService';
import FileStorageService from '@/services/fileStorageService';

const app = express();
const PORT = config.server.port;

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// ตั้งค่า security headers ด้วย helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:*'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ตั้งค่า CORS
app.use(cors({
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.security.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Service',
    'X-Response-Time'
  ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// ตั้งค่า trust proxy
app.set('trust proxy', config.server.trustProxy);

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========================================
// REQUEST LOGGING MIDDLEWARE
// ========================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Add request ID
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request
  logInfo('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    logInfo('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      requestId: req.headers['x-request-id'],
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// ========================================
// DIRECTORY SETUP
// ========================================

async function setupDirectories() {
  try {
    const directories = [
      config.upload.uploadPath,
      config.upload.processedPath,
      config.upload.backupPath,
      config.upload.tempPath,
      config.logging.filePath,
    ];
    
    for (const dir of directories) {
      await fs.ensureDir(path.resolve(dir));
      logInfo(`Directory ensured: ${dir}`);
    }
  } catch (error) {
    logError('Failed to setup directories', error as Error);
    throw error;
  }
}

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    // ตรวจสอบ file system
    const uploadDirExists = await fs.pathExists(config.upload.uploadPath);
    const processedDirExists = await fs.pathExists(config.upload.processedPath);
    const backupDirExists = await fs.pathExists(config.upload.backupPath);
    const tempDirExists = await fs.pathExists(config.upload.tempPath);
    
    const isHealthy = uploadDirExists && processedDirExists && backupDirExists && tempDirExists;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'OK' : 'DEGRADED',
      service: 'Revenue Service',
      timestamp: new Date().toISOString(),
      port: PORT,
      message: isHealthy ? 'Revenue Service is running' : 'Revenue Service has issues',
      environment: config.server.nodeEnv,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      fileSystem: {
        uploadDirectory: uploadDirExists,
        processedDirectory: processedDirExists,
        backupDirectory: backupDirExists,
        tempDirectory: tempDirExists,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'Revenue Service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// ROOT ENDPOINT
// ========================================

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'RPP Portal Revenue Service',
    version: '1.0.0',
    description: 'จัดการข้อมูล DBF, REP, และ Statement สำหรับการเบิกจ่าย สปสช.',
    endpoints: {
      health: 'GET /health',
      upload: 'POST /api/revenue/upload',
      validate: 'POST /api/revenue/validate',
      process: 'POST /api/revenue/process/:fileId',
      statistics: 'GET /api/revenue/statistics',
      history: 'GET /api/revenue/history',
      report: 'GET /api/revenue/report',
    },
    features: [
      'ตรวจสอบความพร้อม DBF File ก่อนนำส่งเบิก สปสช.',
      'จัดการข้อมูลผลการตรวจสอบ (REP)',
      'จัดการข้อมูลสรุปผลการเบิกจ่ายรายเดือน (Statement)',
      'แสดงผลรายงานที่ส่วนของ Frontend',
      'เก็บสถิติต่างๆ',
    ],
  });
});

// ========================================
// API ROUTES
// ========================================

app.use('/api/revenue', revenueRoutes);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

// ========================================
// START SERVER
// ========================================

// Start server
async function startServer() {
  try {
    // Setup directories
    await setupDirectories();
    
    // Start listening
    app.listen(PORT, () => {
      logInfo(`🚀 Revenue Service running on port ${PORT}`);
      logInfo(`📊 Health check: http://localhost:${PORT}/health`);
      logInfo(`🌍 Environment: ${config.server.nodeEnv}`);
      logInfo(`📁 Upload directory: ${config.upload.uploadPath}`);
      logInfo(`📁 Processed directory: ${config.upload.processedPath}`);
      logInfo(`📁 Backup directory: ${config.upload.backupPath}`);
      logInfo(`📁 Temp directory: ${config.upload.tempPath}`);
      logInfo(`📁 Log directory: ${config.logging.filePath}`);
    });
  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: any) => {
  logError('Unhandled Rejection', new Error(`Promise: ${promise}, Reason: ${reason}`));
  process.exit(1);
});

startServer();

