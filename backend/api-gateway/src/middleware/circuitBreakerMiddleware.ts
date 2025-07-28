// ========================================
// Circuit Breaker Middleware
// ========================================

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { logger, logCircuitBreaker } from '../utils/logger.js';

// Type declaration สำหรับ opossum
declare global {
  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
  }
  
  interface CircuitBreaker {
    fire(..._args: any[]): Promise<any>;
    fallback(_fn: Function): CircuitBreaker;
    on(_event: string, _fn: Function): CircuitBreaker;
    opened: boolean;
    resetTimeout: number;
    stats: {
      fires: number;
      fallbacks: number;
      successes: number;
      failures: number;
      timeouts: number;
      totalCount: number;
      errorCount: number;
      errorPercentage: number;
    };
  }
  
  class CircuitBreaker {
    constructor(_fn: Function, _options?: CircuitBreakerOptions);
  }
}

// @ts-ignore - opossum ไม่มี type definitions
import CircuitBreaker from 'opossum';
import { CircuitBreakerStats, CircuitBreakerState } from '../types/index.js';

// ========================================
// CIRCUIT BREAKER INSTANCES
// ========================================

const circuitBreakers = new Map<string, CircuitBreaker>();

// ========================================
// CIRCUIT BREAKER CONFIGURATION
// ========================================

export const createCircuitBreaker = (serviceName: string, fallback?: Function): CircuitBreaker => {
  const options = {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
    volumeThreshold: config.circuitBreaker.volumeThreshold,
    name: serviceName,
  };

  const breaker = new CircuitBreaker(async (_fn: Function, ..._args: any[]) => {
    return await _fn(..._args);
  }, options);

  // Event handlers
  breaker.on('open', () => {
    logCircuitBreaker(serviceName, 'OPEN', breaker.stats.failures);
    logger.warn(`Circuit breaker for ${serviceName} is now OPEN`);
  });

  breaker.on('close', () => {
    logCircuitBreaker(serviceName, 'CLOSED', breaker.stats.failures);
    logger.info(`Circuit breaker for ${serviceName} is now CLOSED`);
  });

  breaker.on('halfOpen', () => {
    logCircuitBreaker(serviceName, 'HALF_OPEN', breaker.stats.failures);
    logger.info(`Circuit breaker for ${serviceName} is now HALF_OPEN`);
  });

  breaker.on('fallback', (result: any) => {
    logger.warn(`Circuit breaker fallback triggered for ${serviceName}`, { result });
  });

  breaker.on('success', (result: any) => {
    logger.debug(`Circuit breaker success for ${serviceName}`, { result });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout for ${serviceName}`);
  });

  breaker.on('reject', (error: Error) => {
    logger.error(`Circuit breaker reject for ${serviceName}`, { error: error.message });
  });

  breaker.on('fire', () => {
    logger.debug(`Circuit breaker fire for ${serviceName}`);
  });

  // ตั้งค่า fallback function
  if (fallback) {
    breaker.fallback(fallback);
  }

  return breaker;
};

// ========================================
// SERVICE-SPECIFIC CIRCUIT BREAKERS
// ========================================

export const authServiceBreaker = createCircuitBreaker('auth-service', () => {
  return {
    success: false,
    message: 'Auth service is temporarily unavailable',
    code: 'AUTH_SERVICE_UNAVAILABLE',
    timestamp: new Date().toISOString(),
  };
});


// ========================================
// CIRCUIT BREAKER MIDDLEWARE
// ========================================

// Circuit Breaker Middleware สำหรับ Express routes
export const circuitBreakerMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const breaker = circuitBreakers.get(serviceName);
    
    if (!breaker) {
      return next();
    }
    
    if (breaker.opened) {
      logCircuitBreaker(serviceName, 'open', 0);
      
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: `${serviceName} service is temporarily unavailable`,
        retryAfter: Math.ceil(breaker.resetTimeout / 1000),
        timestamp: new Date().toISOString(),
      });
    }
    
    next();
  };
};

// ========================================
// CIRCUIT BREAKER WRAPPER
// ========================================

export const withCircuitBreaker = (serviceName: string, fn: Function) => {
  const breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    logger.error(`Circuit breaker not found for service: ${serviceName}`);
    return fn;
  }

  return async (...args: any[]) => {
    try {
      return await breaker.fire(fn, ...args);
    } catch (error) {
      logger.error(`Circuit breaker error for ${serviceName}:`, error);
      throw error;
    }
  };
};

// ========================================
// CIRCUIT BREAKER STATISTICS
// ========================================

export const getCircuitBreakerStats = (serviceName: string): CircuitBreakerStats | null => {
  const breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    return null;
  }

  const state: CircuitBreakerState = {
    status: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    failures: breaker.stats.failures,
    lastFailure: breaker.stats.lastFailure ? new Date(breaker.stats.lastFailure).toISOString() : '',
    nextAttempt: breaker.stats.nextAttempt ? new Date(breaker.stats.nextAttempt).toISOString() : '',
  };

  return {
    totalRequests: breaker.stats.totalRequests,
    successfulRequests: breaker.stats.successfulRequests,
    failedRequests: breaker.stats.failures,
    state,
  };
};

export const getAllCircuitBreakerStats = (): Record<string, CircuitBreakerStats> => {
  const stats: Record<string, CircuitBreakerStats> = {};
  
  for (const [serviceName, breaker] of circuitBreakers) {
    stats[serviceName] = getCircuitBreakerStats(serviceName)!;
  }
  
  return stats;
};

// ========================================
// CIRCUIT BREAKER HEALTH CHECK
// ========================================

export const checkCircuitBreakerHealth = (serviceName: string): boolean => {
  const breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    return false;
  }

  return !breaker.opened;
};

export const getAllCircuitBreakerHealth = (): Record<string, boolean> => {
  const health: Record<string, boolean> = {};
  
  for (const [serviceName, breaker] of circuitBreakers) {
    health[serviceName] = !breaker.opened;
  }
  
  return health;
};

// ========================================
// CIRCUIT BREAKER RESET
// ========================================

export const resetCircuitBreaker = (serviceName: string): boolean => {
  const breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    return false;
  }

  try {
    breaker.close();
    logger.info(`Circuit breaker reset for ${serviceName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to reset circuit breaker for ${serviceName}:`, error);
    return false;
  }
};

export const resetAllCircuitBreakers = (): Record<string, boolean> => {
  const results: Record<string, boolean> = {};
  
  for (const [serviceName, breaker] of circuitBreakers) {
    results[serviceName] = resetCircuitBreaker(serviceName);
  }
  
  return results;
};

// ========================================
// CIRCUIT BREAKER MONITORING
// ========================================

export const circuitBreakerMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  
  res.send = function (data: any) {
    if (res.statusCode >= 500) {
      const serviceName = (req as any).serviceName;
      if (serviceName) {
        const breaker = circuitBreakers.get(serviceName);
        if (breaker) {
          logger.warn(`Service error detected for ${serviceName}, circuit breaker may trip`, {
            statusCode: res.statusCode,
            path: req.path,
            method: req.method,
          });
        }
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// ========================================
// CIRCUIT BREAKER INITIALIZATION
// ========================================

export const initializeCircuitBreakers = (): void => {
  // สร้าง circuit breakers สำหรับ services หลัก
  circuitBreakers.set('auth-service', authServiceBreaker);

  logger.info('Circuit breakers initialized', {
    services: Array.from(circuitBreakers.keys()),
  });
};

// ========================================
// CIRCUIT BREAKER UTILITIES
// ========================================

export const isCircuitBreakerOpen = (serviceName: string): boolean => {
  const breaker = circuitBreakers.get(serviceName);
  return breaker ? breaker.opened : false;
};

export const getCircuitBreakerState = (serviceName: string): string => {
  const breaker = circuitBreakers.get(serviceName);
  
  if (!breaker) {
    return 'UNKNOWN';
  }
  
  if (breaker.opened) {
    return 'OPEN';
  } else if (breaker.halfOpen) {
    return 'HALF_OPEN';
  } else {
    return 'CLOSED';
  }
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  createCircuitBreaker,
  authServiceBreaker,
  circuitBreakerMiddleware,
  withCircuitBreaker,
  getCircuitBreakerStats,
  getAllCircuitBreakerStats,
  checkCircuitBreakerHealth,
  getAllCircuitBreakerHealth,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  circuitBreakerMonitor,
  initializeCircuitBreakers,
  isCircuitBreakerOpen,
  getCircuitBreakerState,
}; 
