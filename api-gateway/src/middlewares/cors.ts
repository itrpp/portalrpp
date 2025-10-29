import cors, { CorsOptions } from 'cors';
import { config } from '../config/env';

export function createCorsMiddleware() {
  const options: CorsOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-user-id'
    ]
  };

  if (config.cors.allowOrigins === '*') {
    // สะท้อน origin แทนการส่งเป็น '*' เพื่อให้ใช้ร่วมกับ credentials ได้
    options.origin = true;
  } else {
    options.origin = (origin, callback) => {
      if (!origin || config.cors.allowOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
  }

  return cors(options);
}


