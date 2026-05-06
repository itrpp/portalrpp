import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@shared/prisma/client';

import { config } from './env';

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
  const dbParams = parseDatabaseUrl(config.databaseUrl);
  const adapter = new PrismaMariaDb({
    host: dbParams.host,
    port: dbParams.port,
    user: dbParams.user,
    password: dbParams.password,
    database: dbParams.database,
    connectionLimit: 10,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
