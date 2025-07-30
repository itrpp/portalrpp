import { Router } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { 
  validateQueryParams, 
  validateDateParams, 
  validateIdParam 
} from '../middleware/validationMiddleware';
import { 
  rateLimitMiddleware, 
  reportGenerationLimiter 
} from '../middleware/rateLimitMiddleware';
import { ReportService } from '../services/reportService';
import { logger } from '../utils/logger';

const router = Router();
const reportService = new ReportService();

// GET /api/reports - ดึงรายงานทั้งหมด
router.get('/', 
  rateLimitMiddleware,
  validateQueryParams,
  validateDateParams,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const queryParams = req.query;
    
    logger.info('Fetching reports', {
      query: queryParams,
      ip: req.ip,
    });

    const result = await reportService.getReports(queryParams);
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/reports', 200, duration, { query: queryParams });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/reports/:id - ดึงรายงานตาม ID
router.get('/:id',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    logger.info('Fetching report by ID', { id, ip: req.ip });

    const report = await reportService.getReportById(id);
    
    const duration = Date.now() - startTime;
    logger.api('GET', `/api/reports/${id}`, 200, duration);

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/reports - สร้างรายงานใหม่
router.post('/',
  reportGenerationLimiter,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const reportData = req.body;
    
    logger.info('Creating new report', {
      data: { ...reportData, reportType: reportData.reportType },
      ip: req.ip,
    });

    const newReport = await reportService.createReport(reportData);
    
    const duration = Date.now() - startTime;
    logger.report('created', newReport.id, newReport.reportType, { duration });

    res.status(201).json({
      success: true,
      data: newReport,
      message: 'สร้างรายงานสำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// DELETE /api/reports/:id - ลบรายงาน
router.delete('/:id',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    logger.info('Deleting report', { id, ip: req.ip });

    await reportService.deleteReport(id);
    
    const duration = Date.now() - startTime;
    logger.report('deleted', id, 'unknown', { duration });

    res.json({
      success: true,
      message: 'ลบรายงานสำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/reports/:id/download - ดาวน์โหลดรายงาน
router.get('/:id/download',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { format = 'pdf' } = req.query;
    
    logger.info('Downloading report', { id, format, ip: req.ip });

    const reportFile = await reportService.downloadReport(id, format as string);
    
    const duration = Date.now() - startTime;
    logger.api('GET', `/api/reports/${id}/download`, 200, duration);

    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.${format}`);
    
    res.send(reportFile);
  })
);

// POST /api/reports/generate - สร้างรายงานแบบกำหนดเอง
router.post('/generate',
  reportGenerationLimiter,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { reportType, filters, periodStart, periodEnd } = req.body;
    
    logger.info('Generating custom report', {
      reportType,
      periodStart,
      periodEnd,
      ip: req.ip,
    });

    const report = await reportService.generateCustomReport({
      reportType,
      filters,
      periodStart,
      periodEnd,
    });
    
    const duration = Date.now() - startTime;
    logger.report('generated', report.id, report.reportType, { duration });

    res.status(201).json({
      success: true,
      data: report,
      message: 'สร้างรายงานสำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/reports/templates - ดึงเทมเพลตรายงาน
router.get('/templates',
  rateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    logger.info('Fetching report templates', { ip: req.ip });

    const templates = await reportService.getReportTemplates();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/reports/templates', 200, duration);

    res.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/reports/schedule - กำหนดเวลาสร้างรายงาน
router.post('/schedule',
  rateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { reportType, schedule, filters } = req.body;
    
    logger.info('Scheduling report generation', {
      reportType,
      schedule,
      ip: req.ip,
    });

    const scheduledReport = await reportService.scheduleReport({
      reportType,
      schedule,
      filters,
    });
    
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/reports/schedule', 201, duration);

    res.status(201).json({
      success: true,
      data: scheduledReport,
      message: 'กำหนดเวลาสร้างรายงานสำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router; 