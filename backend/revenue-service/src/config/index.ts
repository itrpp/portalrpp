import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Gateway URLs
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3001',
  databaseServiceUrl: process.env.DATABASE_SERVICE_URL || 'http://localhost:3001/api/db',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api/auth',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/revenue-service.log',
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  helmetEnabled: process.env.HELMET_ENABLED === 'true',
  
  // Revenue Collection Settings
  revenueCategories: (process.env.REVENUE_CATEGORIES || 'TAX,FEE,FINE,LICENSE,OTHER').split(','),
  currency: process.env.CURRENCY || 'THB',
  defaultPaymentMethods: (process.env.DEFAULT_PAYMENT_METHODS || 'CASH,TRANSFER,CREDIT_CARD,DEBIT_CARD').split(','),
  
  // Database settings (สำหรับการเรียกใช้ผ่าน API Gateway)
  revenueTableName: 'revenue_collections',
  revenueCategoriesTableName: 'revenue_categories',
  revenueReportsTableName: 'revenue_reports',
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'revenue-service-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Validation settings
  maxRevenueAmount: 1000000000, // 1 พันล้านบาท
  minRevenueAmount: 0.01, // 1 สตางค์
  
  // Report settings
  maxReportPeriodDays: 365, // 1 ปี
  defaultReportPeriodDays: 30, // 30 วัน
  
  // File upload settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
  
  // Notification settings
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
  notificationWebhook: process.env.NOTIFICATION_WEBHOOK || '',
} as const;

export type Config = typeof config; 