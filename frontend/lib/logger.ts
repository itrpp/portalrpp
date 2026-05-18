type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const fromEnv = (process.env.LOG_LEVEL ?? '').toLowerCase() as LogLevel;

  if (fromEnv in LEVEL_RANK) return fromEnv;

  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
}

const MIN_LEVEL_RANK = LEVEL_RANK[resolveMinLevel()];

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= MIN_LEVEL_RANK;
}

function format(level: LogLevel, message: string, meta?: unknown): unknown[] {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;

  return meta !== undefined ? [prefix, message, meta] : [prefix, message];
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(...format('debug', message, meta));
  },
  info(message: string, meta?: unknown): void {
    if (!shouldLog('info')) return;
    console.info(...format('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    if (!shouldLog('warn')) return;
    console.warn(...format('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    if (!shouldLog('error')) return;
    console.error(...format('error', message, meta));
  },
};
