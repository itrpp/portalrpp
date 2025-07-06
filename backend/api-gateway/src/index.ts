import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'API Gateway', timestamp: new Date().toISOString() });
});

// Proxy configurations
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3003',
};

// Auth service proxy
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '',
  },
}));

// User service proxy
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '',
  },
}));

// User service proxy for specific user operations
app.use('/api/user', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/user': '/user',
  },
}));

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'RPP Portal API Gateway',
    version: '1.0.0',
    services: Object.keys(services)
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Services: ${JSON.stringify(services, null, 2)}`);
}); 