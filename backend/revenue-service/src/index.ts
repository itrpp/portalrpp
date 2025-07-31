import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { validationMiddleware } from './middleware/validationMiddleware';
import healthRoutes from './routes/healthRoutes';

// โหลด environment variables
dotenv.config();

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// Validation middleware
app.use(validationMiddleware);

// Routes
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'Revenue Collection Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
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
  logger.info(`🚀 Revenue Collection Service เริ่มต้นที่ port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
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
