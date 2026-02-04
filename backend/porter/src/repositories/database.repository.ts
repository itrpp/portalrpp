import prisma from '../config/database';

/** ใช้สำหรับ health check — ทดสอบการเชื่อมต่อ DB */
export async function ping(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
