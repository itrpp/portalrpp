import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_GATEWAY_PORT: z.coerce
    .number()
    .int()
    .positive({ message: 'PORT must be positive integer' })
    .default(3001),
  TRUST_PROXY: z.string().optional(),
  ALLOW_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  REVENUE_SERVICE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('your-super-secret-key-change-this-in-production'),
  EPHIS_API_BASE_URL: z.string().url().optional(),
  EPHIS_API_USER: z.string().optional(),
  EPHIS_API_PASSWORD: z.string().optional()
});

type Env = z.infer<typeof EnvSchema>;

export type AppConfig = {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  trustProxy: string | undefined;
  cors: {
    allowOrigins: string[] | '*';
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  services: {
    revenue?: { baseUrl: string };
    ephis?: { baseUrl: string; user: string; password: string };
  };
  jwt: {
    secret: string;
  };
};

const parsed = EnvSchema.parse(process.env);

const allowOrigins = parsed.ALLOW_ORIGINS
  ? parsed.ALLOW_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : '*';

export const config: AppConfig = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.API_GATEWAY_PORT,
  trustProxy: parsed.TRUST_PROXY,
  cors: {
    allowOrigins
  },
  rateLimit: {
    windowMs: parsed.RATE_LIMIT_WINDOW_MS,
    max: parsed.RATE_LIMIT_MAX
  },
  services: {
    revenue: parsed.REVENUE_SERVICE_URL
      ? { baseUrl: parsed.REVENUE_SERVICE_URL }
      : undefined,
    ephis: parsed.EPHIS_API_BASE_URL && parsed.EPHIS_API_USER && parsed.EPHIS_API_PASSWORD
      ? {
          baseUrl: parsed.EPHIS_API_BASE_URL,
          user: parsed.EPHIS_API_USER,
          password: parsed.EPHIS_API_PASSWORD
        }
      : undefined
  },
  jwt: {
    secret: parsed.JWT_SECRET
  }
};


