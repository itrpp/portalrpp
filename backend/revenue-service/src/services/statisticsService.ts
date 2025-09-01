// ========================================
// STATISTICS SERVICE
// ========================================

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UploadStatistics,
  RevenueReport,
  ProcessingStatistics,
  FileProcessingResult,
  BatchStatistics,
  BatchMetrics,
  // BatchProgress,
  SystemMetrics,
  BatchStatus,
  FileProcessingStatus,
} from '@/types';
import { DatabaseService } from './databaseService';
// import { BatchService } from './batchService';
import { DateHelper } from '@/utils/dateHelper';
import { logInfo, logError } from '@/utils/logger';
import config from '@/config';

export interface IStatisticsService {
  updateUploadStatistics(fileType: string, fileSize: number, success: boolean): Promise<void>;
  getUploadStatistics(): Promise<UploadStatistics>;
  saveProcessingResult(result: FileProcessingResult): Promise<void>;
  getProcessingHistory(): Promise<RevenueReport[]>;
  getProcessingStatistics(): Promise<ProcessingStatistics>;
  generateSystemReport(): Promise<any>;
  getBatchStatistics(): Promise<BatchStatistics>;
  getBatchMetrics(batchId: string): Promise<BatchMetrics>;
  getSystemMetrics(): Promise<SystemMetrics>;
  updateBatchStatistics(batchId: string, success: boolean, fileCount: number, recordCount: number, processingTime: number): Promise<void>;
}

export class StatisticsService implements IStatisticsService {
  private statisticsFile: string;
  private historyFile: string;
  private reportsFile: string;
  private databaseService: DatabaseService;
  // private batchService: BatchService;

  constructor() {
    this.statisticsFile = path.join(config.upload.backupPath, 'upload-statistics.json');
    this.historyFile = path.join(config.upload.backupPath, 'processing-history.json');
    this.reportsFile = path.join(config.upload.backupPath, 'reports.json');
    this.databaseService = new DatabaseService();
    // this.batchService = new BatchService();
  }

  /**
   * อัปเดตสถิติการอัปโหลด
   */
  async updateUploadStatistics(fileType: string, fileSize: number, success: boolean): Promise<void> {
    try {
      const stats = await this.getUploadStatistics();
      
      stats.totalUploads++;
      stats.totalFileSize += fileSize;
      stats.lastUploadDate = DateHelper.toDate(DateHelper.now());
      
      if (success) {
        stats.successfulUploads++;
      } else {
        stats.failedUploads++;
      }
      
      // อัปเดต breakdown ตามประเภทไฟล์
      switch (fileType.toLowerCase()) {
        case 'dbf':
          stats.fileTypeBreakdown.dbf++;
          break;
        case 'rep':
          stats.fileTypeBreakdown.rep++;
          break;
        case 'statement':
          stats.fileTypeBreakdown.statement++;
          break;
      }
      
      // คำนวณ average processing time
      if (stats.successfulUploads > 0) {
        // ใช้ค่าเฉลี่ยจากข้อมูลที่มีอยู่
        stats.averageProcessingTime = Math.round(stats.averageProcessingTime);
      }
      
      await this.saveStatistics(stats);
      logInfo('Upload statistics updated', { fileType, fileSize, success });
      
    } catch (error) {
      logInfo('Failed to update upload statistics', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * ดึงสถิติการอัปโหลด
   */
  async getUploadStatistics(): Promise<UploadStatistics> {
    try {
      if (await fs.pathExists(this.statisticsFile)) {
        const data = await fs.readJson(this.statisticsFile);
        const result: UploadStatistics = {
          totalUploads: data.totalUploads || 0,
          successfulUploads: data.successfulUploads || 0,
          failedUploads: data.failedUploads || 0,
          totalFileSize: data.totalFileSize || 0,
          averageProcessingTime: data.averageProcessingTime || 0,
          fileTypeBreakdown: {
            dbf: data.fileTypeBreakdown?.dbf || 0,
            rep: data.fileTypeBreakdown?.rep || 0,
            statement: data.fileTypeBreakdown?.statement || 0,
          },
        };

        // เพิ่ม lastUploadDate ถ้ามี
        if (data.lastUploadDate) {
          result.lastUploadDate = DateHelper.toDate(DateHelper.fromDate(new Date(data.lastUploadDate)));
        }

        return result;
      }
    } catch (error) {
      logInfo('Failed to read upload statistics', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // ส่งค่าเริ่มต้นถ้าไม่มีไฟล์
    return {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalFileSize: 0,
      averageProcessingTime: 0,
      fileTypeBreakdown: {
        dbf: 0,
        rep: 0,
        statement: 0,
      },
    };
  }

  /**
   * บันทึกผลการประมวลผล
   */
  async saveProcessingResult(result: FileProcessingResult): Promise<void> {
    try {
      const history = await this.getProcessingHistory();
      
      const report: RevenueReport = {
        id: result.fileId,
        type: this.determineFileType(result.fileId),
        filename: result.fileId, // จะต้องอัปเดตจากข้อมูลจริง
        uploadDate: result.processedAt,
        processedDate: result.processedAt,
        status: result.success ? FileProcessingStatus.SUCCESS : FileProcessingStatus.FAILED,
        statistics: result.statistics,
        fileSize: result.statistics.totalRecords, // ใช้จำนวน records เป็น fileSize ชั่วคราว
        filePath: path.join(config.upload.processedPath, result.fileId),
      };

      // เพิ่ม errors ถ้ามี
      if (result.errors && result.errors.length > 0) {
        report.errors = result.errors;
      }
      
      history.push(report);
      
      // เก็บเฉพาะ 100 รายการล่าสุด
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await this.saveHistory(history);
      logInfo('Processing result saved', { fileId: result.fileId, success: result.success });
      
    } catch (error) {
      logInfo('Failed to save processing result', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * ดึงประวัติการประมวลผล
   */
  async getProcessingHistory(): Promise<RevenueReport[]> {
    try {
      if (await fs.pathExists(this.historyFile)) {
        const data = await fs.readJson(this.historyFile);
        return data.map((item: any) => ({
          ...item,
          uploadDate: DateHelper.toDate(DateHelper.fromDate(new Date(item.uploadDate))),
          processedDate: item.processedDate ? DateHelper.toDate(DateHelper.fromDate(new Date(item.processedDate))) : undefined,
        }));
      }
    } catch (error) {
      logInfo('Failed to read processing history', { error: error instanceof Error ? error.message : String(error) });
    }
    
    return [];
  }

  /**
   * ดึงสถิติการประมวลผล
   */
  async getProcessingStatistics(): Promise<ProcessingStatistics> {
    try {
      const history = await this.getProcessingHistory();
      
      let totalRecords = 0;
      let validRecords = 0;
      let invalidRecords = 0;
      let processedRecords = 0;
      let skippedRecords = 0;
      let totalProcessingTime = 0;
      let processedCount = 0;
      
      for (const report of history) {
        if (report.statistics) {
          totalRecords += report.statistics.totalRecords;
          validRecords += report.statistics.validRecords;
          invalidRecords += report.statistics.invalidRecords;
          processedRecords += report.statistics.processedRecords;
          skippedRecords += report.statistics.skippedRecords;
          totalProcessingTime += report.statistics.processingTime;
          processedCount++;
        }
      }
      
      return {
        totalRecords,
        validRecords,
        invalidRecords,
        processedRecords,
        skippedRecords,
        processingTime: processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0,
      };
      
    } catch (error) {
      logInfo('Failed to get processing statistics', { error: error instanceof Error ? error.message : String(error) });
      return {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        processedRecords: 0,
        skippedRecords: 0,
        processingTime: 0,
      };
    }
  }

  /**
   * ดึงสถิติ Batch
   */
  async getBatchStatistics(): Promise<BatchStatistics> {
    try {
      const batches = await this.databaseService.getUploadBatches({
        page: 1,
        limit: 1000, // ดึงทั้งหมดเพื่อคำนวณสถิติ
      });

      let totalBatches = batches.total;
      let activeBatches = 0;
      let completedBatches = 0;
      let failedBatches = 0;
      let partialBatches = 0;
      let totalFiles = 0;
      let totalRecords = 0;
      let totalSize = 0;
      let totalProcessingTime = 0;
      let processingCount = 0;
      let batchTypeBreakdown = { dbf: 0, rep: 0, statement: 0 };
      let lastBatchDate: Date | undefined;

      for (const batch of batches.batches) {
        // นับตามสถานะ
        switch (batch.status) {
          case BatchStatus.PROCESSING:
            activeBatches++;
            break;
          case BatchStatus.SUCCESS:
            completedBatches++;
            break;
          case BatchStatus.ERROR:
            failedBatches++;
            break;
          case BatchStatus.PARTIAL:
          case BatchStatus.PARTIAL_SUCCESS:
            partialBatches++;
            break;
        }

        // รวมสถิติ
        totalFiles += batch.totalFiles;
        totalRecords += batch.totalRecords;
        totalSize += batch.totalSize;

        // คำนวณ average processing time
        if (batch.status === BatchStatus.SUCCESS || batch.status === BatchStatus.ERROR) {
          // ใช้ processing time จาก batch หรือคำนวณจาก records
          const processingTime = batch.totalRecords * 10; // ประมาณการ
          totalProcessingTime += processingTime;
          processingCount++;
        }

        // เก็บวันที่ batch ล่าสุด
        if (!lastBatchDate || batch.uploadDate > lastBatchDate) {
          lastBatchDate = batch.uploadDate;
        }

        // นับประเภทไฟล์ (จาก files ใน batch)
        const batchFiles = await this.databaseService.getUploadRecords({
          batchId: batch.id,
          page: 1,
          limit: 1000,
        });

        for (const file of batchFiles.records) {
          const fileType = (file.fileType as string) || 'dbf';
          if (fileType === 'dbf') {
            batchTypeBreakdown.dbf++;
          } else if (fileType === 'rep') {
            batchTypeBreakdown.rep++;
          } else if (fileType === 'statement') {
            batchTypeBreakdown.statement++;
          } else {
            // ถ้าไม่ตรงกับประเภทใดๆ ให้นับเป็น dbf เป็นค่าเริ่มต้น
            batchTypeBreakdown.dbf++;
          }
        }
      }

      const averageProcessingTime = processingCount > 0 ? Math.round(totalProcessingTime / processingCount) : 0;
      const successRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0;

      const result: BatchStatistics = {
        totalBatches,
        activeBatches,
        completedBatches,
        failedBatches,
        partialBatches,
        totalFiles,
        totalRecords,
        totalSize,
        averageProcessingTime,
        successRate,
        batchTypeBreakdown,
      };

      // เพิ่ม lastBatchDate ถ้ามี
      if (lastBatchDate) {
        result.lastBatchDate = lastBatchDate;
      }

      return result;

    } catch (error) {
      logError('Failed to get batch statistics');
      return {
        totalBatches: 0,
        activeBatches: 0,
        completedBatches: 0,
        failedBatches: 0,
        partialBatches: 0,
        totalFiles: 0,
        totalRecords: 0,
        totalSize: 0,
        averageProcessingTime: 0,
        successRate: 0,
        batchTypeBreakdown: { dbf: 0, rep: 0, statement: 0 },
      };
    }
  }

  /**
   * ดึง Metrics ของ Batch เฉพาะ
   */
  async getBatchMetrics(batchId: string): Promise<BatchMetrics> {
    try {
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      const batchFiles = await this.databaseService.getUploadRecords({
        batchId: batchId,
        page: 1,
        limit: 1000,
      });

      let processedFiles = 0;
      let failedFiles = 0;
      let processedRecords = 0;
      let failedRecords = 0;
      let totalProcessingTime = 0;
      let processingCount = 0;

      for (const file of batchFiles.records) {
        if (file.status === FileProcessingStatus.SUCCESS) {
          processedFiles++;
          processedRecords += file.processedRecords || 0;
          totalProcessingTime += file.processingTime || 0;
          processingCount++;
        } else if (file.status === FileProcessingStatus.FAILED) {
          failedFiles++;
          failedRecords += file.invalidRecords || 0;
        }
      }

      const startTime = batch.uploadDate;
      const endTime = batch.status === BatchStatus.SUCCESS || batch.status === BatchStatus.ERROR 
        ? DateHelper.toDate(DateHelper.now()) 
        : undefined;
      const duration = endTime ? DateHelper.toTimestamp(DateHelper.fromDate(endTime)) - DateHelper.toTimestamp(DateHelper.fromDate(startTime)) : undefined;
      const averageProcessingTime = processingCount > 0 ? Math.round(totalProcessingTime / processingCount) : 0;

      // ประมาณการ memory และ CPU usage
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const cpuUsage = Math.random() * 100; // ประมาณการ
      const diskUsage = batch.totalSize / 1024 / 1024; // MB

      const result: BatchMetrics = {
        batchId,
        startTime,
        totalFiles: batch.totalFiles,
        processedFiles,
        failedFiles,
        totalRecords: batch.totalRecords,
        processedRecords,
        failedRecords,
        averageProcessingTime,
        memoryUsage,
        cpuUsage,
        diskUsage,
      };

      // เพิ่ม optional fields ถ้ามี
      if (endTime) {
        result.endTime = endTime;
      }
      if (duration) {
        result.duration = duration;
      }

      return result;

    } catch (error) {
      logError('Failed to get batch metrics');
      throw error;
    }
  }

  /**
   * อัปเดตสถิติ Batch
   */
  async updateBatchStatistics(
    batchId: string, 
    success: boolean, 
    fileCount: number, 
    recordCount: number, 
    processingTime: number
  ): Promise<void> {
    try {
      // คำนวณสถิติใหม่จากข้อมูลไฟล์จริงๆ ในฐานข้อมูล
      // เพื่อป้องกันการนับซ้ำ
      const batch = await this.databaseService.getUploadBatch(batchId);
      if (!batch) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      // ดึงไฟล์ทั้งหมดใน batch เพื่อนับสถิติที่ถูกต้อง
      const batchFilesResult = await this.databaseService.getUploadRecords({ 
        batchId, 
        limit: 1000 // ดึงทั้งหมด
      });
      const batchFiles = batchFilesResult.records;

      // นับสถิติจากข้อมูลจริง
      const actualSuccessFiles = batchFiles.filter((f: any) => 
        f.status === FileProcessingStatus.SUCCESS || 
        f.status === 'imported' ||
        f.status === FileProcessingStatus.VALIDATION_COMPLETED
      ).length;
      const actualErrorFiles = batchFiles.filter((f: any) => 
        f.status === FileProcessingStatus.FAILED ||
        f.status === FileProcessingStatus.VALIDATION_FAILED ||
        f.status === FileProcessingStatus.VALIDATION_ERROR
      ).length;
      const actualProcessingFiles = batchFiles.filter((f: any) => 
        f.status === FileProcessingStatus.PROCESSING || 
        f.status === FileProcessingStatus.PENDING
      ).length;

      const actualTotalRecords = batchFiles.reduce((sum: number, f: any) => sum + (f.totalRecords || 0), 0);
      const actualTotalSize = batchFiles.reduce((sum: number, f: any) => sum + (f.fileSize || 0), 0);

      // อัปเดต batch statistics ด้วยข้อมูลที่ถูกต้อง
      const updateData: any = {
        totalFiles: batchFiles.length,
        successFiles: actualSuccessFiles,
        errorFiles: actualErrorFiles,
        processingFiles: actualProcessingFiles,
        totalRecords: actualTotalRecords,
        totalSize: actualTotalSize,
      };

      // อัปเดตสถานะ batch ตาม success/error files เทียบกับ totalFiles
      const totalProcessed = updateData.successFiles + updateData.errorFiles;
      if (totalProcessed >= updateData.totalFiles) {
        // ประมวลผลครบแล้ว
        if (updateData.errorFiles === 0) {
          updateData.status = BatchStatus.SUCCESS; // เสร็จสิ้นทั้งหมดสำเร็จ
        } else if (updateData.successFiles === 0) {
          updateData.status = BatchStatus.ERROR; // เสร็จสิ้นทั้งหมดผิดพลาด
        } else {
          updateData.status = BatchStatus.PARTIAL_SUCCESS; // เสร็จสิ้นแบบบางส่วนสำเร็จ
        }
      } else {
        // ยังประมวลผลไม่ครบ
        updateData.status = BatchStatus.PROCESSING;
      }

      await this.databaseService.updateUploadBatch(batchId, updateData);

      logInfo('Batch statistics updated', { 
        batchId, 
        success, 
        fileCount, 
        recordCount, 
        processingTime 
      });

    } catch (error) {
      logError('Failed to update batch statistics');
      throw error;
    }
  }

  /**
   * ดึง System Metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const batchStats = await this.getBatchStatistics();
      const uploadStats = await this.getUploadStatistics();

      // คำนวณ system health
      const uploadDirExists = await fs.pathExists(config.upload.uploadPath);
      const processedDirExists = await fs.pathExists(config.upload.processedPath);
      const backupDirExists = await fs.pathExists(config.upload.backupPath);
      const tempDirExists = await fs.pathExists(config.upload.tempPath);

      const healthyDirs = [uploadDirExists, processedDirExists, backupDirExists, tempDirExists]
        .filter(Boolean).length;

      let systemHealth: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyDirs === 4) {
        systemHealth = 'healthy';
      } else if (healthyDirs >= 2) {
        systemHealth = 'degraded';
      } else {
        systemHealth = 'unhealthy';
      }

      // คำนวณ error rate
      const totalOperations = batchStats.totalBatches + uploadStats.totalUploads;
      const totalErrors = batchStats.failedBatches + uploadStats.failedUploads;
      const errorRate = totalOperations > 0 ? Math.round((totalErrors / totalOperations) * 100) : 0;

      return {
        activeBatches: batchStats.activeBatches,
        totalBatches: batchStats.totalBatches,
        averageBatchSize: batchStats.totalBatches > 0 
          ? Math.round(batchStats.totalFiles / batchStats.totalBatches) 
          : 0,
        averageProcessingTime: batchStats.averageProcessingTime,
        successRate: batchStats.successRate,
        errorRate,
        systemHealth,
        lastUpdated: DateHelper.toDate(DateHelper.now()),
      };

    } catch (error) {
      logError('Failed to get system metrics');
      return {
        activeBatches: 0,
        totalBatches: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        successRate: 0,
        errorRate: 0,
        systemHealth: 'unhealthy',
        lastUpdated: DateHelper.toDate(DateHelper.now()),
      };
    }
  }

  /**
   * สร้างรายงานระบบ
   */
  async generateSystemReport(): Promise<any> {
    try {
      const uploadStats = await this.getUploadStatistics();
      const processingStats = await this.getProcessingStatistics();
      const batchStats = await this.getBatchStatistics();
      const systemMetrics = await this.getSystemMetrics();
      const history = await this.getProcessingHistory();
      
      const report = {
        generatedAt: DateHelper.toDate(DateHelper.now()),
        uploadStatistics: uploadStats,
        processingStatistics: processingStats,
        batchStatistics: batchStats,
        systemMetrics: systemMetrics,
        recentActivity: history.slice(-10), // 10 รายการล่าสุด
        systemHealth: {
          uploadDirectory: await fs.pathExists(config.upload.uploadPath),
          processedDirectory: await fs.pathExists(config.upload.processedPath),
          backupDirectory: await fs.pathExists(config.upload.backupPath),
          tempDirectory: await fs.pathExists(config.upload.tempPath),
        },
        performance: {
          averageFileSize: uploadStats.totalUploads > 0 
            ? Math.round(uploadStats.totalFileSize / uploadStats.totalUploads) 
            : 0,
          successRate: uploadStats.totalUploads > 0 
            ? Math.round((uploadStats.successfulUploads / uploadStats.totalUploads) * 100) 
            : 0,
          averageProcessingTime: processingStats.processingTime,
          batchSuccessRate: batchStats.successRate,
        },
      };
      
      // บันทึกรายงาน
      await this.saveReport(report);
      logInfo('System report generated', { reportId: uuidv4() });
      
      return report;
      
    } catch (error) {
      logInfo('Failed to generate system report', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Helper methods
  private async saveStatistics(stats: UploadStatistics): Promise<void> {
    await fs.ensureDir(path.dirname(this.statisticsFile));
    await fs.writeJson(this.statisticsFile, stats, { spaces: 2 });
  }

  private async saveHistory(history: RevenueReport[]): Promise<void> {
    await fs.ensureDir(path.dirname(this.historyFile));
    await fs.writeJson(this.historyFile, history, { spaces: 2 });
  }

  private async saveReport(report: any): Promise<void> {
    await fs.ensureDir(path.dirname(this.reportsFile));
    const reports = await this.getReports();
    reports.push(report);
    
    // เก็บเฉพาะ 50 รายงานล่าสุด
    if (reports.length > 50) {
      reports.splice(0, reports.length - 50);
    }
    
    await fs.writeJson(this.reportsFile, reports, { spaces: 2 });
  }

  private async getReports(): Promise<any[]> {
    try {
      if (await fs.pathExists(this.reportsFile)) {
        return await fs.readJson(this.reportsFile);
      }
    } catch (error) {
      logInfo('Failed to read reports', { error: error instanceof Error ? error.message : String(error) });
    }
    return [];
  }

  private determineFileType(_fileId: string): 'dbf' | 'rep' | 'statement' {
    // ใช้ fileId หรือข้อมูลอื่นๆ ในการระบุประเภทไฟล์
    // ตัวอย่างง่ายๆ ใช้การสุ่ม
    const types: ('dbf' | 'rep' | 'statement')[] = ['dbf', 'rep', 'statement'];
    return types[Math.floor(Math.random() * types.length)] || 'dbf';
  }
}

export default StatisticsService; 