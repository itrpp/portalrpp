import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { createCorsMiddleware } from './middlewares/cors';
import { httpLogger, logger } from './middlewares/logger';
import { apiRateLimiter } from './middlewares/rateLimit';
import { errorHandler } from './middlewares/error';
import { healthRouter } from './routes/health';
import { proxyRouter } from './routes/proxy';
import { ephisRouter } from './routes/ephis';
import { config } from './config/env';
import { setupGracefulShutdown } from './utils/shutdown';

const app = express();

if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(createCorsMiddleware());
app.use(httpLogger);
app.use(apiRateLimiter);

app.use('/api-gateway', healthRouter);
app.use('/api-gateway', proxyRouter);
app.use('/api-gateway/ephis', ephisRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`API Gateway listening on :${config.port}`);
});

setupGracefulShutdown(server);


