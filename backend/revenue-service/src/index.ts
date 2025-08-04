import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database.js';
import { logger } from './utils/logger.js';
import importRoutes from './routes/importRoutes.js';
import processRoutes from './routes/processRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

const app = express();
const PORT = process.env['PORT'] || 3003;

// Middleware
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
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});
app.use(limiter);

// Routes
app.use('/api/import', importRoutes);
app.use('/api/process', processRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/health', async (req, res, _next) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'revenue-service',
      version: '1.0.0',
      database: dbHealth,
      features: [
        'DBF file upload and processing',
        'Database storage with Prisma + SQLite',
        'File type detection and validation',
        'Thai language support',
        'Batch processing',
        'Export functionality',
      ],
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'revenue-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint
app.get('/', (req, res, _next) => {
  res.json({
    message: 'Revenue Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      test: '/test',
      import: '/api/import',
      process: '/api/process',
      export: '/api/export',
    },
  });
});

// Test endpoint - แสดงหน้า revenue-test.html
app.get('/test', (req, res, _next) => {
  res.sendFile('revenue-test.html', { root: './public' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res, _next) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // เชื่อมต่อ database
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`🚀 Revenue Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📁 Import API: http://localhost:${PORT}/api/import`);
      logger.info(`⚙️ Process API: http://localhost:${PORT}/api/process`);
      logger.info(`📤 Export API: http://localhost:${PORT}/api/export`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

