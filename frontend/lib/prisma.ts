import 'server-only';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '@/generated/prisma/client';

function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const parsed = new URL(url);
  const database = parsed.pathname ? parsed.pathname.slice(1) : '';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
    user: parsed.username ? decodeURIComponent(parsed.username) : '',
    password: parsed.password ? decodeURIComponent(parsed.password) : '',
    database: database ? decodeURIComponent(database) : '',
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const dbParams = parseDatabaseUrl(url);

  // PoolConfig ตาม mariadb driver
  // ป้องกัน JWT_SESSION_ERROR / pool timeout เมื่อ DB ช้าหรืออยู่คนละเครือข่าย
  const adapter = new PrismaMariaDb({
    host: dbParams.host,
    port: dbParams.port,
    user: dbParams.user,
    password: dbParams.password,
    database: dbParams.database,
    connectionLimit: 10,
    connectTimeout: 20_000, // 20s ให้เวลาต่อ DB (default บางเวอร์ชันแค่ 1s)
    acquireTimeout: 20_000, // 20s รอ connection จาก pool (default 10s ทำให้ timeout ได้)
  });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
