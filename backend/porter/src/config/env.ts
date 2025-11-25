import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['NODE_ENV', 'PORT', 'DATABASE_URL'] as const;

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

type RequiredEnv = (typeof requiredEnvVars)[number];

type EnvRecord = Record<RequiredEnv, string>;

const env = requiredEnvVars.reduce<EnvRecord>((acc, key) => {
  acc[key] = process.env[key] as string;
  return acc;
}, {} as EnvRecord);

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
}

export const config: AppConfig = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number.parseInt(env.PORT, 10) || 3000,
  databaseUrl: env.DATABASE_URL
};


