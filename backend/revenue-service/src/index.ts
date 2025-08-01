import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Import routes
import revenueRoutes from './routes/revenueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dbfRoutes from './routes/dbfRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware.js';

// Import utils
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting
app.use(rateLimitMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'revenue-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/revenue', revenueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dbf', dbfRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Revenue Service running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info('🔗 API Gateway: http://localhost:3001/api/revenue');
  logger.info(`📁 DBF API: http://localhost:${PORT}/api/dbf`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app; 
