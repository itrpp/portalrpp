import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: '../shared/prisma/schema.prisma',
  migrations: { path: '../shared/prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
