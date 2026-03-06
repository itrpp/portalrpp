import pino from 'pino';

/**
 * Logger สำหรับ backend/porter — ใช้ pino เหมือน api-gateway
 * ใน production (ไม่มี TTY) stdout อาจถูก buffer; pino เขียนแบบที่ PM2 จับได้
 * ระดับ log ใช้จาก env LOG_LEVEL (default: info)
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});
