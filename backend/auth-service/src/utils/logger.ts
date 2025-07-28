import { LogEntry, LogLevel } from '../types';
import express from 'express';

/**
 * Logger Utility
 * จัดการ logging อย่างเป็นระบบและมีประสิทธิภาพ
 */

export class Logger {
  private static readonly LOG_LEVELS: LogLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  };

  private static readonly COLORS = {
    ERROR: '\x1b[31m', // แดง
    WARN: '\x1b[33m', // เหลือง
    INFO: '\x1b[36m', // ฟ้า
    DEBUG: '\x1b[35m', // ม่วง
    RESET: '\x1b[0m', // รีเซ็ต
  };

  /**
   * Log error message
   */
  static error(message: string, metadata?: Record<string, unknown>): void {
    this.log('ERROR', message, metadata);
  }

  /**
   * Log warning message
   */
  static warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * Log info message
   */
  static info(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * Log debug message
   */
  static debug(message: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, metadata);
    }
  }

  /**
   * Log authentication events
   */
  static auth(message: string, userId?: string, sessionId?: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', `🔐 AUTH: ${message}`, {
      userId,
      sessionId,
      ...metadata,
    });
  }

  /**
   * Log database operations
   */
  static db(message: string, operation?: string, table?: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', `💾 DB: ${message}`, {
      operation,
      table,
      ...metadata,
    });
  }

  /**
   * Log API requests
   */
  static api(
    message: string,
    method?: string,
    path?: string,
    statusCode?: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.log('INFO', `🌐 API: ${message}`, {
      method,
      path,
      statusCode,
      ...metadata,
    });
  }

  /**
   * Log security events
   */
  static security(message: string, event?: string, ip?: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', `🔒 SECURITY: ${message}`, {
      event,
      ip,
      ...metadata,
    });
  }

  /**
   * Log performance metrics
   */
  static performance(message: string, duration?: number, operation?: string, metadata?: Record<string, unknown>): void {
    // ตรวจสอบ Performance Targets ตาม .cursorrules
    let level: keyof LogLevel = 'INFO';
    let performanceMessage = `⚡ PERFORMANCE: ${message}`;

    if (duration) {
      const performanceTargets = {
        authentication: 500, // < 500ms
        tokenValidation: 100, // < 100ms
        sessionCreation: 200, // < 200ms
        ldapAuthentication: 2000, // < 2000ms
        databaseQueries: 100, // < 100ms
      };

      if (operation === 'authentication' && duration > performanceTargets.authentication) {
        level = 'WARN';
        performanceMessage = `⚠️ PERFORMANCE WARNING: Authentication took ${duration}ms (target: <${performanceTargets.authentication}ms)`;
      } else if (operation === 'tokenValidation' && duration > performanceTargets.tokenValidation) {
        level = 'WARN';
        performanceMessage = `⚠️ PERFORMANCE WARNING: Token validation took ${duration}ms (target: <${performanceTargets.tokenValidation}ms)`;
      } else if (operation === 'sessionCreation' && duration > performanceTargets.sessionCreation) {
        level = 'WARN';
        performanceMessage = `⚠️ PERFORMANCE WARNING: Session creation took ${duration}ms (target: <${performanceTargets.sessionCreation}ms)`;
      } else if (operation === 'ldapAuthentication' && duration > performanceTargets.ldapAuthentication) {
        level = 'WARN';
        performanceMessage = `⚠️ PERFORMANCE WARNING: LDAP authentication took ${duration}ms (target: <${performanceTargets.ldapAuthentication}ms)`;
      } else if (operation === 'databaseQueries' && duration > performanceTargets.databaseQueries) {
        level = 'WARN';
        performanceMessage = `⚠️ PERFORMANCE WARNING: Database query took ${duration}ms (target: <${performanceTargets.databaseQueries}ms)`;
      }
    }

    this.log(level, performanceMessage, {
      duration: `${duration}ms`,
      operation,
      ...metadata,
    });
  }

  /**
   * Log admin operations
   */
  static admin(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', `👑 ADMIN: ${message}`, metadata);
  }

  /**
   * Main logging function
   */
  private static log(level: keyof LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(timestamp),
      metadata,
    };

    // สร้าง log message
    const logMessage = this.formatLogMessage(logEntry);

    // แสดงผลใน console
    console.log(logMessage);

    // ในอนาคตสามารถเพิ่มการบันทึกลงไฟล์หรือส่งไปยัง logging service ได้
    this.persistLog(logEntry);
  }

  /**
   * จัดรูปแบบ log message
   */
  private static formatLogMessage(logEntry: LogEntry): string {
    const { level, message, timestamp, metadata } = logEntry;
    const color = this.COLORS[level as keyof typeof this.COLORS];
    const reset = this.COLORS.RESET;

    let formattedMessage = `${color}[${timestamp.toISOString()}] ${level}: ${message}${reset}`;

    if (metadata && Object.keys(metadata).length > 0) {
      formattedMessage += ` ${color}${JSON.stringify(metadata)}${reset}`;
    }

    return formattedMessage;
  }

  // eslint-disable-next-line no-unused-vars
  private static persistLog(_logEntry: LogEntry): void {
    // TODO: Implement log persistence
    // เช่น บันทึกลง database หรือ file
  }

  /**
   * สร้าง log entry สำหรับ request
   */
  static createRequestLog(req: express.Request, res: express.Response, duration: number): LogEntry {
    return {
      level: 'INFO',
      message: `${req.method} ${req.path} - ${res.statusCode}`,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      },
    };
  }

  /**
   * สร้าง log entry สำหรับ error
   */
  static createErrorLog(error: Error, req?: express.Request): LogEntry {
    return {
      level: 'ERROR',
      message: error.message,
      timestamp: new Date(),
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      metadata: {
        stack: error.stack,
        name: error.name,
        userId: req?.user?.id,
      },
    };
  }

  /**
   * สร้าง log entry สำหรับ authentication
   */
  static createAuthLog(event: string, userId?: string, sessionId?: string, ip?: string): LogEntry {
    return {
      level: 'INFO',
      message: `Authentication: ${event}`,
      timestamp: new Date(),
      userId,
      sessionId,
      ip,
      metadata: {
        event,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Export singleton instance
export const logger = Logger;
