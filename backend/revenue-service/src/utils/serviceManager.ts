// ========================================
// SERVICE MANAGER UTILITY
// ========================================

import { Request } from 'express';
import { DatabaseService } from '@/services/databaseService';
import { FileStorageService } from '@/services/fileStorageService';
import { BatchService } from '@/services/batchService';
import { FileProcessingService } from '@/services/fileProcessingService';
import { StatisticsService } from '@/services/statisticsService';
import { ValidationService } from '@/services/validationService';
import { DBFService, getAllDBFRecordsFromDatabaseForOPD, getAllDBFRecordsFromDatabaseForIPD } from '@/services/dbfService';
import { ServiceContainer } from '@/types';

// ========================================
// INTERFACES
// ========================================

// Interface moved to @/types

// ========================================
// SERVICE MANAGER CLASS
// ========================================

class ServiceManager {
  private static instance: ServiceManager;
  private services: ServiceContainer | null = null;

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * เริ่มต้น services ทั้งหมด
   */
  public initializeServices(): ServiceContainer {
    if (!this.services) {
      // สร้าง services ด้วย dependency injection
      const databaseService = new DatabaseService();
      const fileStorageService = new FileStorageService();
      const statisticsService = new StatisticsService(databaseService);
      const validationService = new ValidationService(databaseService);
      const dbfServiceInstance = new DBFService(databaseService.getPrismaClient());
      const dbfService = Object.assign(dbfServiceInstance, {
        getAllDBFRecordsFromDatabaseForOPD,
        getAllDBFRecordsFromDatabaseForIPD
      });
      const fileProcessingService = new FileProcessingService(databaseService, dbfService);
      const batchService = new BatchService(
        databaseService,
        fileProcessingService,
        fileStorageService,
        validationService,
        statisticsService
      );

      this.services = {
        databaseService,
        fileStorageService,
        batchService,
        fileProcessingService,
        statisticsService,
        validationService,
        dbfService
      };
    }

    return this.services;
  }

  /**
   * ดึง services ทั้งหมด
   */
  public getServices(): ServiceContainer {
    if (!this.services) {
      return this.initializeServices();
    }
    return this.services;
  }

  /**
   * รีเซ็ต services (สำหรับ testing)
   */
  public resetServices(): void {
    this.services = null;
  }

  /**
   * ปิด services ทั้งหมด
   */
  public async shutdownServices(): Promise<void> {
    if (this.services) {
      // ปิด database connection
      await this.services.databaseService.disconnect();
      this.services = null;
    }
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * ดึง services จาก request object
 */
export function getServices(req: Request): ServiceContainer {
  // ตรวจสอบว่ามี services ใน request หรือไม่
  if (!(req as any).services) {
    const serviceManager = ServiceManager.getInstance();
    (req as any).services = serviceManager.getServices();
  }
  return (req as any).services;
}

/**
 * เริ่มต้น services
 */
export function initializeServices(): ServiceContainer {
  const serviceManager = ServiceManager.getInstance();
  return serviceManager.initializeServices();
}

/**
 * ดึง services โดยตรง
 */
export function getServicesDirect(): ServiceContainer {
  const serviceManager = ServiceManager.getInstance();
  return serviceManager.getServices();
}

/**
 * รีเซ็ต services
 */
export function resetServices(): void {
  const serviceManager = ServiceManager.getInstance();
  serviceManager.resetServices();
}

/**
 * ปิด services
 */
export async function shutdownServices(): Promise<void> {
  const serviceManager = ServiceManager.getInstance();
  await serviceManager.shutdownServices();
}

// ========================================
// SERVICE FACTORY
// ========================================

/**
 * สร้าง service instance ใหม่
 */
export class ServiceFactory {
  /**
   * สร้าง DatabaseService
   */
  static createDatabaseService(): DatabaseService {
    return new DatabaseService();
  }

  /**
   * สร้าง FileStorageService
   */
  static createFileStorageService(): FileStorageService {
    return new FileStorageService();
  }

  /**
   * สร้าง BatchService
   */
  static createBatchService(): BatchService {
    return new BatchService();
  }

  /**
   * สร้าง FileProcessingService
   */
  static createFileProcessingService(): FileProcessingService {
    return new FileProcessingService();
  }

  /**
   * สร้าง StatisticsService
   */
  static createStatisticsService(): StatisticsService {
    return new StatisticsService();
  }

  /**
   * สร้าง ValidationService
   */
  static createValidationService(): ValidationService {
    return new ValidationService();
  }

  /**
   * สร้าง DBFService
   */
  static createDBFService(prismaClient?: any): DBFService {
    const databaseService = new DatabaseService();
    return new DBFService(prismaClient || databaseService.getPrismaClient());
  }
}

export default ServiceManager;
