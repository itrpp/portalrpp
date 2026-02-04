import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
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
    database: database ? decodeURIComponent(database) : ''
  };
}

const dbParams = parseDatabaseUrl(config.databaseUrl);
const adapter = new PrismaMariaDb({
  host: dbParams.host,
  port: dbParams.port,
  user: dbParams.user,
  password: dbParams.password,
  database: dbParams.database,
  connectionLimit: 10
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
