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
} from '@/types';
import { logInfo } from '@/utils/logger';
import config from '@/config';

export interface IStatisticsService {
  updateUploadStatistics(fileType: string, fileSize: number, success: boolean): Promise<void>;
  getUploadStatistics(): Promise<UploadStatistics>;
  saveProcessingResult(result: FileProcessingResult): Promise<void>;
  getProcessingHistory(): Promise<RevenueReport[]>;
  getProcessingStatistics(): Promise<ProcessingStatistics>;
  generateSystemReport(): Promise<any>;
}

export class StatisticsService implements IStatisticsService {
  private statisticsFile: string;
  private historyFile: string;
  private reportsFile: string;

  constructor() {
    this.statisticsFile = path.join(config.upload.backupPath, 'upload-statistics.json');
    this.historyFile = path.join(config.upload.backupPath, 'processing-history.json');
    this.reportsFile = path.join(config.upload.backupPath, 'reports.json');
  }

  /**
   * อัปเดตสถิติการอัปโหลด
   */
  async updateUploadStatistics(fileType: string, fileSize: number, success: boolean): Promise<void> {
    try {
      const stats = await this.getUploadStatistics();
      
      stats.totalUploads++;
      stats.totalFileSize += fileSize;
      stats.lastUploadDate = new Date();
      
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
      logInfo('Failed to update upload statistics', { error: error.message });
    }
  }

  /**
   * ดึงสถิติการอัปโหลด
   */
  async getUploadStatistics(): Promise<UploadStatistics> {
    try {
      if (await fs.pathExists(this.statisticsFile)) {
        const data = await fs.readJson(this.statisticsFile);
        return {
          totalUploads: data.totalUploads || 0,
          successfulUploads: data.successfulUploads || 0,
          failedUploads: data.failedUploads || 0,
          totalFileSize: data.totalFileSize || 0,
          averageProcessingTime: data.averageProcessingTime || 0,
          lastUploadDate: data.lastUploadDate ? new Date(data.lastUploadDate) : undefined,
          fileTypeBreakdown: {
            dbf: data.fileTypeBreakdown?.dbf || 0,
            rep: data.fileTypeBreakdown?.rep || 0,
            statement: data.fileTypeBreakdown?.statement || 0,
          },
        };
      }
    } catch (error) {
      logInfo('Failed to read upload statistics', { error: error.message });
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
        status: result.success ? 'completed' : 'failed',
        statistics: result.statistics,
        errors: result.errors,
        fileSize: result.statistics.totalRecords, // ใช้จำนวน records เป็น fileSize ชั่วคราว
        filePath: path.join(config.upload.processedPath, result.fileId),
      };
      
      history.push(report);
      
      // เก็บเฉพาะ 100 รายการล่าสุด
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await this.saveHistory(history);
      logInfo('Processing result saved', { fileId: result.fileId, success: result.success });
      
    } catch (error) {
      logInfo('Failed to save processing result', { error: error.message });
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
          uploadDate: new Date(item.uploadDate),
          processedDate: item.processedDate ? new Date(item.processedDate) : undefined,
        }));
      }
    } catch (error) {
      logInfo('Failed to read processing history', { error: error.message });
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
      logInfo('Failed to get processing statistics', { error: error.message });
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
   * สร้างรายงานระบบ
   */
  async generateSystemReport(): Promise<any> {
    try {
      const uploadStats = await this.getUploadStatistics();
      const processingStats = await this.getProcessingStatistics();
      const history = await this.getProcessingHistory();
      
      const report = {
        generatedAt: new Date(),
        uploadStatistics: uploadStats,
        processingStatistics: processingStats,
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
        },
      };
      
      // บันทึกรายงาน
      await this.saveReport(report);
      logInfo('System report generated', { reportId: uuidv4() });
      
      return report;
      
    } catch (error) {
      logInfo('Failed to generate system report', { error: error.message });
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
      logInfo('Failed to read reports', { error: error.message });
    }
    return [];
  }

  private determineFileType(fileId: string): 'dbf' | 'rep' | 'statement' {
    // ใช้ fileId หรือข้อมูลอื่นๆ ในการระบุประเภทไฟล์
    // ตัวอย่างง่ายๆ ใช้การสุ่ม
    const types: ('dbf' | 'rep' | 'statement')[] = ['dbf', 'rep', 'statement'];
    return types[Math.floor(Math.random() * types.length)];
  }
}

export default StatisticsService; 