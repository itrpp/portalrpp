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
      
      // ตรวจสอบการเชื่อมต่อกับ services อื่น
      const checks = await this.performHealthChecks();
      
      const status = checks.database && checks.apiGateway ? 'healthy' : 'unhealthy';
      
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
      logger.error('Health check failed', { error: error.message });
      
      return {
        service: 'Revenue Collection Service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks: {
          database: false,
          apiGateway: false,
        },
      };
    }
  }

  // ดึงสถานะ readiness
  async getReadinessStatus(): Promise<{ ready: boolean; timestamp: string; checks: any }> {
    try {
      const checks = await this.performHealthChecks();
      const ready = checks.database && checks.apiGateway;
      
      return {
        ready,
        timestamp: new Date().toISOString(),
        checks,
      };
    } catch (error) {
      logger.error('Readiness check failed', { error: error.message });
      
      return {
        ready: false,
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          apiGateway: false,
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
      logger.error('Liveness check failed', { error: error.message });
      
      return {
        alive: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ดึงข้อมูลสุขภาพแบบละเอียด
  async getDetailedHealthStatus(): Promise<any> {
    try {
      const uptime = Date.now() - this.startTime;
      const checks = await this.performHealthChecks();
      
      return {
        service: 'Revenue Collection Service',
        status: checks.database && checks.apiGateway ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime,
        version: '1.0.0',
        environment: config.nodeEnv,
        checks,
        details: {
          memory: this.getMemoryUsage(),
          cpu: this.getCpuUsage(),
          disk: this.getDiskUsage(),
          network: await this.getNetworkStatus(),
        },
      };
    } catch (error) {
      logger.error('Detailed health check failed', { error: error.message });
      
      return {
        service: 'Revenue Collection Service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: '1.0.0',
        environment: config.nodeEnv,
        error: error.message,
      };
    }
  }

  // ตรวจสอบการเชื่อมต่อกับ services อื่น
  private async performHealthChecks(): Promise<{ database: boolean; apiGateway: boolean }> {
    const checks = {
      database: false,
      apiGateway: false,
    };

    try {
      // ตรวจสอบ API Gateway
      const apiGatewayResponse = await fetch(`${config.apiGatewayUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // Timeout 5 วินาที
      });

      checks.apiGateway = apiGatewayResponse.ok;
    } catch (error) {
      logger.warn('API Gateway health check failed', { error: error.message });
    }

    try {
      // ตรวจสอบ Database Service ผ่าน API Gateway
      const databaseResponse = await fetch(`${config.databaseServiceUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // Timeout 5 วินาที
      });

      checks.database = databaseResponse.ok;
    } catch (error) {
      logger.warn('Database Service health check failed', { error: error.message });
    }

    return checks;
  }

  // รับข้อมูลการใช้ memory
  private getMemoryUsage(): any {
    try {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
      };
    } catch (error) {
      logger.warn('Failed to get memory usage', { error: error.message });
      return null;
    }
  }

  // รับข้อมูลการใช้ CPU
  private getCpuUsage(): any {
    try {
      const usage = process.cpuUsage();
      return {
        user: Math.round(usage.user / 1000), // ms
        system: Math.round(usage.system / 1000), // ms
      };
    } catch (error) {
      logger.warn('Failed to get CPU usage', { error: error.message });
      return null;
    }
  }

  // รับข้อมูลการใช้ disk
  private getDiskUsage(): any {
    try {
      // ใน Node.js ไม่มี API มาตรฐานสำหรับ disk usage
      // ต้องใช้ library เพิ่มเติม เช่น node-disk-info
      return {
        available: 'N/A',
        total: 'N/A',
        used: 'N/A',
      };
    } catch (error) {
      logger.warn('Failed to get disk usage', { error: error.message });
      return null;
    }
  }

  // รับสถานะ network
  private async getNetworkStatus(): Promise<any> {
    try {
      // ตรวจสอบการเชื่อมต่อ network
      const networkChecks = {
        apiGateway: false,
        database: false,
        internet: false,
      };

      // ตรวจสอบ API Gateway
      try {
        const apiGatewayResponse = await fetch(`${config.apiGatewayUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        networkChecks.apiGateway = apiGatewayResponse.ok;
      } catch (error) {
        // API Gateway ไม่สามารถเชื่อมต่อได้
      }

      // ตรวจสอบ Database Service
      try {
        const databaseResponse = await fetch(`${config.databaseServiceUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        networkChecks.database = databaseResponse.ok;
      } catch (error) {
        // Database Service ไม่สามารถเชื่อมต่อได้
      }

      // ตรวจสอบการเชื่อมต่อ internet (จำลอง)
      try {
        const internetResponse = await fetch('https://httpbin.org/get', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        networkChecks.internet = internetResponse.ok;
      } catch (error) {
        // ไม่สามารถเชื่อมต่อ internet ได้
      }

      return networkChecks;
    } catch (error) {
      logger.warn('Failed to get network status', { error: error.message });
      return {
        apiGateway: false,
        database: false,
        internet: false,
      };
    }
  }
} 