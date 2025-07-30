import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  RevenueReport, 
  ReportQueryParams, 
  PaginatedResponse,
  CreateReportRequest,
  ReportType,
  ReportStatus,
  DatabaseRevenueReport
} from '../types';
import { 
  validateReportData, 
  validateReportQuery 
} from '../utils/validation';
import { 
  createDatabaseError, 
  createNotFoundError 
} from '../utils/errorHandler';

export class ReportService {
  private apiGatewayUrl: string;
  private databaseServiceUrl: string;

  constructor() {
    this.apiGatewayUrl = config.apiGatewayUrl;
    this.databaseServiceUrl = config.databaseServiceUrl;
  }

  // ดึงรายงานทั้งหมด
  async getReports(queryParams: any): Promise<PaginatedResponse<RevenueReport>> {
    try {
      const validatedParams = validateReportQuery(queryParams);
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: validatedParams }),
      });

      if (!response.ok) {
        throw createDatabaseError('fetch', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('select', 'revenue_reports', duration, { 
        query: validatedParams,
        count: data.data?.length || 0 
      });

      return this.transformDatabaseResponse(data);
    } catch (error) {
      logger.error('Failed to get reports', { error: error.message, query: queryParams });
      throw error;
    }
  }

  // ดึงรายงานตาม ID
  async getReportById(id: string): Promise<RevenueReport> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Report', id);
        }
        throw createDatabaseError('fetch', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('select', 'revenue_reports', duration, { id });

      return this.transformRevenueReport(data);
    } catch (error) {
      logger.error('Failed to get report by ID', { error: error.message, id });
      throw error;
    }
  }

  // สร้างรายงานใหม่
  async createReport(reportData: CreateReportRequest): Promise<RevenueReport> {
    try {
      const validatedData = validateReportData(reportData);
      const startTime = Date.now();

      const newReport: Partial<DatabaseRevenueReport> = {
        id: uuidv4(),
        report_type: validatedData.reportType,
        title: validatedData.title,
        description: validatedData.description,
        period_start: validatedData.periodStart.toISOString(),
        period_end: validatedData.periodEnd.toISOString(),
        filters: JSON.stringify(validatedData.filters || {}),
        data: JSON.stringify([]),
        summary: JSON.stringify({
          totalAmount: 0,
          totalCount: 0,
          byCategory: {},
          byPaymentMethod: {},
          byDate: {},
        }),
        generated_by: 'system', // TODO: Get from auth context
        generated_at: new Date().toISOString(),
        status: 'GENERATING',
      };

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReport),
      });

      if (!response.ok) {
        throw createDatabaseError('create', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('insert', 'revenue_reports', duration, { 
        id: newReport.id,
        reportType: newReport.report_type 
      });

      // เริ่มต้นการสร้างรายงานในพื้นหลัง
      this.generateReportInBackground(newReport.id, validatedData);

      return this.transformRevenueReport(data);
    } catch (error) {
      logger.error('Failed to create report', { error: error.message, data: reportData });
      throw error;
    }
  }

  // ลบรายงาน
  async deleteReport(id: string): Promise<void> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Report', id);
        }
        throw createDatabaseError('delete', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const duration = Date.now() - startTime;
      logger.database('delete', 'revenue_reports', duration, { id });
    } catch (error) {
      logger.error('Failed to delete report', { error: error.message, id });
      throw error;
    }
  }

  // ดาวน์โหลดรายงาน
  async downloadReport(id: string, format: string): Promise<string> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports/${id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Report', id);
        }
        throw createDatabaseError('download', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.text();
      const duration = Date.now() - startTime;
      
      logger.database('download', 'revenue_reports', duration, { id, format });

      return data;
    } catch (error) {
      logger.error('Failed to download report', { error: error.message, id, format });
      throw error;
    }
  }

  // สร้างรายงานแบบกำหนดเอง
  async generateCustomReport(params: {
    reportType: ReportType;
    filters?: any;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<RevenueReport> {
    try {
      const startTime = Date.now();

      const reportData: CreateReportRequest = {
        reportType: params.reportType,
        title: `รายงาน${this.getReportTypeName(params.reportType)} - ${params.periodStart.toLocaleDateString('th-TH')} ถึง ${params.periodEnd.toLocaleDateString('th-TH')}`,
        description: `รายงาน${this.getReportTypeName(params.reportType)} ระหว่างวันที่ ${params.periodStart.toLocaleDateString('th-TH')} ถึง ${params.periodEnd.toLocaleDateString('th-TH')}`,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        filters: params.filters,
      };

      const report = await this.createReport(reportData);
      
      const duration = Date.now() - startTime;
      logger.report('custom_generated', report.id, report.reportType, { duration });

      return report;
    } catch (error) {
      logger.error('Failed to generate custom report', { error: error.message, params });
      throw error;
    }
  }

  // ดึงเทมเพลตรายงาน
  async getReportTemplates(): Promise<any[]> {
    try {
      const startTime = Date.now();

      const templates = [
        {
          id: 'daily-summary',
          name: 'รายงานสรุปประจำวัน',
          description: 'สรุปรายได้ประจำวัน',
          reportType: 'DAILY',
          category: 'summary',
        },
        {
          id: 'monthly-summary',
          name: 'รายงานสรุปประจำเดือน',
          description: 'สรุปรายได้ประจำเดือน',
          reportType: 'MONTHLY',
          category: 'summary',
        },
        {
          id: 'category-breakdown',
          name: 'รายงานแยกตามหมวดหมู่',
          description: 'รายงานรายได้แยกตามหมวดหมู่',
          reportType: 'CUSTOM',
          category: 'analysis',
        },
        {
          id: 'payment-method-analysis',
          name: 'รายงานวิธีการชำระเงิน',
          description: 'วิเคราะห์วิธีการชำระเงิน',
          reportType: 'CUSTOM',
          category: 'analysis',
        },
        {
          id: 'payer-analysis',
          name: 'รายงานผู้ชำระเงิน',
          description: 'วิเคราะห์ผู้ชำระเงิน',
          reportType: 'CUSTOM',
          category: 'analysis',
        },
      ];

      const duration = Date.now() - startTime;
      logger.api('GET', '/api/reports/templates', 200, duration);

      return templates;
    } catch (error) {
      logger.error('Failed to get report templates', { error: error.message });
      throw error;
    }
  }

  // กำหนดเวลาสร้างรายงาน
  async scheduleReport(params: {
    reportType: ReportType;
    schedule: any;
    filters?: any;
  }): Promise<any> {
    try {
      const startTime = Date.now();

      const scheduledReport = {
        id: uuidv4(),
        reportType: params.reportType,
        schedule: params.schedule,
        filters: params.filters,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.api('POST', '/api/reports/schedule', 201, duration);

      return scheduledReport;
    } catch (error) {
      logger.error('Failed to schedule report', { error: error.message, params });
      throw error;
    }
  }

  // สร้างรายงานในพื้นหลัง
  private async generateReportInBackground(reportId: string, reportData: CreateReportRequest): Promise<void> {
    try {
      logger.info('Starting background report generation', { reportId, reportType: reportData.reportType });

      // จำลองการสร้างรายงาน
      await new Promise(resolve => setTimeout(resolve, 5000));

      // อัปเดตสถานะรายงาน
      const updatePayload = {
        status: 'COMPLETED',
        data: JSON.stringify(this.generateMockReportData(reportData)),
        summary: JSON.stringify(this.generateMockSummary(reportData)),
        file_url: `/reports/${reportId}.pdf`,
      };

      const response = await fetch(`${this.databaseServiceUrl}/revenue_reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        logger.error('Failed to update report status', { reportId, status: response.status });
        return;
      }

      logger.report('completed', reportId, reportData.reportType, { duration: 5000 });
    } catch (error) {
      logger.error('Failed to generate report in background', { error: error.message, reportId });
      
      // อัปเดตสถานะเป็น FAILED
      try {
        await fetch(`${this.databaseServiceUrl}/revenue_reports/${reportId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'FAILED' }),
        });
      } catch (updateError) {
        logger.error('Failed to update report status to FAILED', { reportId, error: updateError.message });
      }
    }
  }

  // สร้างข้อมูลรายงานจำลอง
  private generateMockReportData(reportData: CreateReportRequest): any[] {
    const data = [];
    const startDate = new Date(reportData.periodStart);
    const endDate = new Date(reportData.periodEnd);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      data.push({
        date: date.toISOString(),
        category: 'TAX',
        amount: Math.floor(Math.random() * 10000) + 1000,
        count: Math.floor(Math.random() * 10) + 1,
        paymentMethod: 'CASH',
      });
    }
    
    return data;
  }

  // สร้างสรุปรายงานจำลอง
  private generateMockSummary(reportData: CreateReportRequest): any {
    return {
      totalAmount: Math.floor(Math.random() * 1000000) + 100000,
      totalCount: Math.floor(Math.random() * 1000) + 100,
      byCategory: {
        TAX: { amount: 500000, count: 500 },
        FEE: { amount: 300000, count: 300 },
        FINE: { amount: 200000, count: 200 },
      },
      byPaymentMethod: {
        CASH: { amount: 400000, count: 400 },
        TRANSFER: { amount: 300000, count: 300 },
        CREDIT_CARD: { amount: 300000, count: 300 },
      },
      byDate: {},
    };
  }

  // รับชื่อประเภทรายงาน
  private getReportTypeName(reportType: ReportType): string {
    const names = {
      DAILY: 'ประจำวัน',
      WEEKLY: 'ประจำสัปดาห์',
      MONTHLY: 'ประจำเดือน',
      QUARTERLY: 'ประจำไตรมาส',
      YEARLY: 'ประจำปี',
      CUSTOM: 'แบบกำหนดเอง',
    };
    return names[reportType] || 'ไม่ระบุ';
  }

  // Transform database response to API response
  private transformDatabaseResponse(data: any): PaginatedResponse<RevenueReport> {
    return {
      data: data.data?.map((item: DatabaseRevenueReport) => this.transformRevenueReport(item)) || [],
      pagination: data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  // Transform database revenue report to API revenue report
  private transformRevenueReport(dbReport: DatabaseRevenueReport): RevenueReport {
    return {
      id: dbReport.id,
      reportType: dbReport.report_type as ReportType,
      title: dbReport.title,
      description: dbReport.description,
      periodStart: new Date(dbReport.period_start),
      periodEnd: new Date(dbReport.period_end),
      filters: JSON.parse(dbReport.filters),
      data: JSON.parse(dbReport.data),
      summary: JSON.parse(dbReport.summary),
      generatedBy: dbReport.generated_by,
      generatedAt: new Date(dbReport.generated_at),
      status: dbReport.status as ReportStatus,
      fileUrl: dbReport.file_url,
    };
  }
} 