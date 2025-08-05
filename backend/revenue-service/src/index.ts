import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env['PORT'] || 3003;

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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002', 
      'http://127.0.0.1:3003',
      'null' // สำหรับ file:// URLs
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
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

// ตั้งค่า trust proxy สำหรับ development environment เท่านั้น
if (process.env['NODE_ENV'] === 'production') {
  app.set('trust proxy', 1); // ใช้เฉพาะ production
} else {
  app.set('trust proxy', false); // ปิดใน development
}

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================

app.get('/health', async (req, res, _next) => {
  try {
    res.status(200).json({
      status: 'OK',
      service: 'Revenue Service',
      timestamp: new Date().toISOString(),
      port: PORT,
      message: 'Revenue Service is running',
      environment: process.env['NODE_ENV'] || 'development',
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

app.get('/', (req, res, _next) => {
  res.json({
    message: 'RPP Portal Revenue Service',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
    },
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Revenue Service Error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
  });
});

// 404 handler
app.use('*', (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint นี้',
  });
});

// ========================================
// START SERVER
// ========================================

// Start server
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Revenue Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

