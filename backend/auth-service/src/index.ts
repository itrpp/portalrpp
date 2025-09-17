import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import os from 'os';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import prisma from './config/database';
import { logger } from './utils/logger';

// โหลด environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
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
    'x-session-token',
    'X-Session-Token',
  ],
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for correct IP detection
app.set('trust proxy', true);

// Serve static files
app.use(express.static('public'));

/**
 * Helper function to get client IP address
 * รองรับการทำงานกับ proxy และ load balancer
 */
export function getClientIP(req: express.Request): string {
  // Try multiple sources for IP address
  let clientIP = req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown';

  // If x-forwarded-for contains multiple IPs, take the first one
  if (clientIP && clientIP.includes(',')) {
    const firstIP = clientIP.split(',')[0];
    if (firstIP) {
      clientIP = firstIP.trim();
    }
  }

  // Handle IPv6 format
  if (clientIP.startsWith('::ffff:')) {
    clientIP = clientIP.replace('::ffff:', '');
  }

  // Handle IPv6 localhost and localhost - always get actual network IP
  if (clientIP === '::1' || clientIP === 'localhost' || clientIP === '127.0.0.1') {
    clientIP = getLocalNetworkIP();
  }

  return clientIP;
}

/**
 * Get local network IP address
 */
function getLocalNetworkIP(): string {
  const networkInterfaces = os.networkInterfaces();

  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (interfaces) {
      for (const netInterface of interfaces) {
        // Skip internal and non-IPv4 addresses
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          return netInterface.address;
        }
      }
    }
  }

  return '127.0.0.1';
}

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    // Test LDAP connection
    const ldapService = await import('./services/ldapService');
    const ldapResult = await ldapService.LDAPService.testConnection();

    // Import LDAP config
    const { ldapConfig } = await import('./config/ldap');

    // สร้าง server URL
    const protocol = req.protocol;
    const host = req.get('host');
    const serverURL = `${protocol}://${host}`;

    // Get client IP address
    const clientIP = getClientIP(req);

    res.json({
      status: 'OK',
      service: 'Auth Service',
      timestamp: new Date().toISOString(),
      port: PORT,
      serverURL: serverURL,
      database: 'SQLite with Prisma',
      serverIP: 'localhost',
      clientIP: clientIP,
      userAgent: req.get('User-Agent'),
      ldap: {
        status: ldapResult.success ? 'connected' : 'disconnected',
        message: ldapResult.message,
        url: ldapConfig.url,
        baseDN: ldapConfig.baseDN,
        bindDN: ldapConfig.bindDN,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  } catch (_error) {
    // Import LDAP config
    const { ldapConfig } = await import('./config/ldap');

    // สร้าง server URL
    const protocol = req.protocol;
    const host = req.get('host');
    const serverURL = `${protocol}://${host}`;

    // Get client IP address
    const clientIP = getClientIP(req);

    res.json({
      status: 'OK',
      service: 'Auth Service',
      timestamp: new Date().toISOString(),
      port: PORT,
      serverURL: serverURL,
      database: 'SQLite with Prisma',
      serverIP: 'localhost',
      clientIP: clientIP,
      userAgent: req.get('User-Agent'),
      ldap: {
        status: 'error',
        message: 'LDAP service not available',
        url: ldapConfig.url,
        baseDN: ldapConfig.baseDN,
        bindDN: ldapConfig.bindDN,
      },
    });
  }
});

// Auth routes
app.use('/auth', authRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// Test page route
app.get('/test', (req, res) => {
  res.sendFile('auth-test.html', { root: 'public' });
});

// Admin test page route
app.get('/admin-test', (req, res) => {
  res.sendFile('admin-test.html', { root: 'public' });
});

// Tailwind CSS test page route
app.get('/tailwind-test', (req, res) => {
  res.sendFile('tailwind-test.html', { root: 'public' });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'RPP Portal Auth Service',
    version: '1.0.0',
    database: 'SQLite with Prisma',
    endpoints: {
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      validateSession: 'POST /auth/validate-session',
      checkSessionStatus: 'POST /auth/check-session-status',
      getUserInfo: 'GET /auth/me',
      health: 'GET /health',
    },
    testPage: 'GET /test',
    example: {
      login: {
        method: 'POST',
        url: '/auth/login',
        body: {
          email: 'admin@rpp.com',
          password: 'password123',
        },
      },
      validateSession: {
        method: 'POST',
        url: '/auth/validate-session',
        body: {
          sessionToken: 'your-session-token',
        },
      },
    },
  });
});

// Error handling middleware

// eslint-disable-next-line no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Auth Service Error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint นี้',
  });
});

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`กำลังปิด Auth Service... (${signal})`);
  await prisma.$disconnect();
  process.exit(0);
}

// Graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

app.listen(PORT, () => {
  logger.info(`🔐 Auth Service กำลังรันที่ port ${PORT}`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 Auth endpoints: http://localhost:${PORT}/auth/*`);
  logger.info(`🧪 Test page: http://localhost:${PORT}/test`);
  logger.info('💾 Database: SQLite with Prisma');
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 JWT Secret: ${process.env.JWT_SECRET ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}`);
});
