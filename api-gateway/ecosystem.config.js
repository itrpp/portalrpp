module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'npm',
      args: 'run start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Memory monitoring settings
      max_memory_restart: '1G',
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      // Monitoring
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: false,
      // Memory and CPU monitoring
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
