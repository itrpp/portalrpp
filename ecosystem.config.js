module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    },
    {
      name: 'api-gateway',
      cwd: './backend/api-gateway',
      script: 'node',
      args: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        // อนุญาต origin สำหรับ production portal
        CORS_ORIGIN: 'https://portal.rpphosp.go.th,http://localhost:3000,http://localhost:3001'
      }
    },
    {
      name: 'auth-service',
      cwd: './backend/auth-service',
      script: 'node',
      args: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3002'
      }
    },
    {
      name: 'revenue-service',
      cwd: './backend/revenue-service',
      script: 'node',
      args: '--max-old-space-size=4096 --expose-gc dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
        // สอดคล้องกับ CORS origin
        CORS_ORIGIN: 'https://portal.rpphosp.go.th'
      }
    }
  ]
};


