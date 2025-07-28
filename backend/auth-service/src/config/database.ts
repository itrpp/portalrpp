import { PrismaClient } from '@prisma/client';

/**
 * Database Configuration
 * ตั้งค่าการเชื่อมต่อฐานข้อมูล
 */

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'file:./dev.db',
    },
  },
});

export default prisma;
