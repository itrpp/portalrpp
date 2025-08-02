import { PrismaClient } from '@prisma/client';

// สร้าง Prisma client instance
const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ฟังก์ชันสำหรับเชื่อมต่อ database
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับปิดการเชื่อมต่อ database
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

// ฟังก์ชันสำหรับตรวจสอบสถานะ database
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', message: 'Database is connected and responsive' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default prisma; 
