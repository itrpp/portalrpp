import { Server } from 'http';
import { logger } from '../middlewares/logger';

export function setupGracefulShutdown(server: Server) {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.info({ signal }, 'Received signal, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forcing shutdown');
        process.exit(1);
      }, 10_000).unref();
    });
  });
}


