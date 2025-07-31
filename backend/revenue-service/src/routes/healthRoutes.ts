import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { HealthService } from '../services/healthService';
import { logger } from '../utils/logger';

const router = Router();
const healthService = new HealthService();

// GET /health - Health check endpoint
router.get('/', 
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    logger.info('Health check requested', { ip: req.ip });

    const healthStatus = await healthService.getHealthStatus();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/health', healthStatus.status === 'healthy' ? 200 : 503, duration);

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  }),
);

// GET /health/ready - Readiness check
router.get('/ready',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    logger.info('Readiness check requested', { ip: req.ip });

    const readinessStatus = await healthService.getReadinessStatus();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/health/ready', readinessStatus.ready ? 200 : 503, duration);

    const statusCode = readinessStatus.ready ? 200 : 503;
    res.status(statusCode).json(readinessStatus);
  }),
);

// GET /health/live - Liveness check
router.get('/live',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    logger.info('Liveness check requested', { ip: req.ip });

    const livenessStatus = await healthService.getLivenessStatus();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/health/live', 200, duration);

    res.json(livenessStatus);
  }),
);

// GET /health/detailed - Detailed health information
router.get('/detailed',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    logger.info('Detailed health check requested', { ip: req.ip });

    const detailedHealth = await healthService.getDetailedHealthStatus();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/health/detailed', 200, duration);

    res.json(detailedHealth);
  }),
);

export default router; 
