// ========================================
// REVENUE SERVICE CONFIGURATION
// ========================================

import { FileUploadConfig, ValidationConfig, ProcessingConfig } from '@/types';

export const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3003,
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: process.env.NODE_ENV === 'production',
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50mb',
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '.dbf,.xls,.xlsx').split(','),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    tempPath: process.env.TEMP_DIR || './temp',
    processedPath: process.env.PROCESSED_DIR || './processed',
    backupPath: process.env.BACKUP_DIR || './backup',
  } as FileUploadConfig,

  // Validation Configuration
  validation: {
    maxRecordCount: 1000000, // 1 ล้าน records
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedEncodings: ['utf8', 'tis620', 'cp874'],
    requiredFields: {
      dbf: ['HN', 'AN', 'DATE', 'DIAG'],
      rep: ['HN', 'AN', 'DATE', 'DIAG'],
      statement: ['HN', 'AN', 'DATE', 'DIAG'],
    },
  } as ValidationConfig,

  // Processing Configuration
  processing: {
    batchSize: 1000,
    timeout: 300000, // 5 minutes
    retryAttempts: 3,
    parallelProcessing: true,
  } as ProcessingConfig,

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Security
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
    ],
  },

  // File Processing Rules
  fileRules: {
    dbf: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      requiredExtensions: ['.dbf'],
      encoding: 'cp874', // Thai Windows encoding
      fieldValidation: true,
    },
    rep: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      requiredExtensions: ['.xls', '.xlsx'],
      sheetValidation: true,
    },
    statement: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      requiredExtensions: ['.xls', '.xlsx'],
      sheetValidation: true,
    },
  },

  // Database Configuration (ถ้ามี)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'revenue_db',
    user: process.env.DB_USER || 'revenue_user',
    password: process.env.DB_PASSWORD || 'revenue_password',
  },
};

export default config; 