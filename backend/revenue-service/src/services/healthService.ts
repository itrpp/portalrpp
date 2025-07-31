import { config } from '../config';
import { logger } from '../utils/logger';
import { HealthCheckResponse } from '../types';

export class HealthService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  // ดึงสถานะสุขภาพของ service
  async getHealthStatus(): Promise<HealthCheckResponse> {
    try {
      const uptime = Date.now() - this.startTime;
      
      // ตรวจสอบสถานะพื้นฐานของ service
      const checks = await this.performBasicHealthChecks();
      
      const status = checks.memory && checks.cpu ? 'healthy' : 'unhealthy';
      
      return {
        service: 'Revenue Collection Service',
        status,
        timestamp: new Date().toISOString(),
        uptime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Health check failed', { error: errorMessage });
      
      return {
        service: 'Revenue Collection Service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks: {
          memory: false,
          cpu: false,
        },
      };
    }
  }

  // ดึงสถานะ readiness
  async getReadinessStatus(): Promise<{ ready: boolean; timestamp: string; checks: { memory: boolean; cpu: boolean } }> {
    try {
      const checks = await this.performBasicHealthChecks();
      const ready = checks.memory && checks.cpu;
      
      return {
        ready,
        timestamp: new Date().toISOString(),
        checks,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Readiness check failed', { error: errorMessage });
      
      return {
        ready: false,
        timestamp: new Date().toISOString(),
        checks: {
          memory: false,
          cpu: false,
        },
      };
    }
  }

  // ดึงสถานะ liveness
  async getLivenessStatus(): Promise<{ alive: boolean; timestamp: string }> {
    try {
      // ตรวจสอบว่า service ยังทำงานอยู่หรือไม่
      const alive = true; // Service ยังทำงานอยู่
      
      return {
        alive,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Liveness check failed', { error: errorMessage });
      
      return {
        alive: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ดึงข้อมูลสุขภาพแบบละเอียด
  async getDetailedHealthStatus(): Promise<{
    service: string;
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: { memory: boolean; cpu: boolean };
    details: {
      memory: { rss: number; heapTotal: number; heapUsed: number; external: number } | null;
      cpu: { user: number; system: number } | null;
      disk: { available: string; total: string; used: string } | null;
    };
    error?: string;
  }> {
    try {
      const uptime = Date.now() - this.startTime;
      const checks = await this.performBasicHealthChecks();
      
      return {
        service: 'Revenue Collection Service',
        status: checks.memory && checks.cpu ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks,
        details: {
          memory: this.getMemoryUsage(),
          cpu: this.getCpuUsage(),
          disk: this.getDiskUsage(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Detailed health check failed', { error: errorMessage });
      
      return {
        service: 'Revenue Collection Service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks: {
          memory: false,
          cpu: false,
        },
        details: {
          memory: null,
          cpu: null,
          disk: null,
        },
        error: errorMessage,
      };
    }
  }

  // ตรวจสอบสถานะพื้นฐานของ service
  private async performBasicHealthChecks(): Promise<{ memory: boolean; cpu: boolean }> {
    const checks = {
      memory: false,
      cpu: false,
    };

    try {
      // ตรวจสอบ memory usage
      const memoryUsage = this.getMemoryUsage();
      checks.memory = memoryUsage !== null && memoryUsage.heapUsed < 1024; // ตรวจสอบว่าใช้ memory น้อยกว่า 1GB
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Memory health check failed', { error: errorMessage });
    }

    try {
      // ตรวจสอบ CPU usage
      const cpuUsage = this.getCpuUsage();
      checks.cpu = cpuUsage !== null; // ตรวจสอบว่า CPU ทำงานได้
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('CPU health check failed', { error: errorMessage });
    }

    return checks;
  }

  // รับข้อมูลการใช้ memory
  private getMemoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number } | null {
    try {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to get memory usage', { error: errorMessage });
      return null;
    }
  }

  // รับข้อมูลการใช้ CPU
  private getCpuUsage(): { user: number; system: number } | null {
    try {
      const usage = process.cpuUsage();
      return {
        user: Math.round(usage.user / 1000), // ms
        system: Math.round(usage.system / 1000), // ms
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to get CPU usage', { error: errorMessage });
      return null;
    }
  }

  // รับข้อมูลการใช้ disk
  private getDiskUsage(): { available: string; total: string; used: string } {
    // ใน Node.js ไม่มี API มาตรฐานสำหรับ disk usage
    // ต้องใช้ library เพิ่มเติม เช่น node-disk-info
    return {
      available: 'N/A',
      total: 'N/A',
      used: 'N/A',
    };
  }
} 
