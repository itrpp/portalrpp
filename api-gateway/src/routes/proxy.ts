import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/env';
import { authMiddleware } from '../middlewares/auth';

export const proxyRouter = Router();

if (config.services.revenue?.baseUrl) {
  proxyRouter.use(
    '/revenue',
    authMiddleware,
    createProxyMiddleware({
      target: config.services.revenue.baseUrl,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq: any, req: any, _res: any) => {
          // หมายเหตุ: สำหรับ multipart/form-data (เช่น อัปโหลดไฟล์) ห้ามเขียน body เอง
          // ปล่อยให้ http-proxy-middleware ทำการ pipe สตรีมโดยตรง
          const method = req.method as string;
          const contentType = (req.headers['content-type'] as string | undefined) || '';

          // จัดการเฉพาะกรณีที่เป็น JSON เท่านั้น เพื่อแก้เคส body ถูก parse แล้ว
          const isJson = contentType.includes('application/json');
          const shouldRewriteBody = ['POST', 'PUT', 'PATCH'].includes(method) && isJson && req.body;

          if (shouldRewriteBody) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
          // กรณีอื่น ๆ (เช่น multipart/form-data) ไม่ต้องทำอะไร ปล่อยให้ proxy จัดการสตรีมเอง
        },
        error: (err: any, _req: any, res: any) => {
          console.error('Proxy Error:', err);
          res.status(500).json({ 
            success: false, 
            error: 'PROXY_ERROR',
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Revenue Service'
          });
        }
      }
    })
  );
}


