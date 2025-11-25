import { PrismaClient } from '@prisma/client';
import { config } from './env';

const prisma = new PrismaClient({
  datasourceUrl: config.databaseUrl,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;


