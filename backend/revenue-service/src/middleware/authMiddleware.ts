import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // เรียก auth-service ผ่าน API Gateway
    try {
      const authResponse = await axios.post('http://localhost:3001/api/auth/verify-token', {
        token: token,
      });

      req.user = authResponse.data.data.user;
      next();
    } catch {
      // ถ้า auth-service ไม่พร้อม ให้ใช้ mock user สำหรับ development
      if (process.env['NODE_ENV'] === 'development') {
        req.user = {
          id: '1',
          email: 'admin@rpp.local',
          username: 'admin',
        };
        next();
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}; 
