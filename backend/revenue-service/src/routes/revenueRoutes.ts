import { Router } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { 
  validateQueryParams, 
  validateDateParams, 
  validateAmountParams, 
  validateSearchParam, 
  validateIdParam 
} from '../middleware/validationMiddleware';
import { 
  rateLimitMiddleware, 
  revenueCreateLimiter, 
  searchLimiter 
} from '../middleware/rateLimitMiddleware';
import { RevenueService } from '../services/revenueService';
import { logger } from '../utils/logger';

const router = Router();
const revenueService = new RevenueService();

// GET /api/revenue - ดึงรายการรายได้ทั้งหมด
router.get('/', 
  rateLimitMiddleware,
  validateQueryParams,
  validateDateParams,
  validateAmountParams,
  validateSearchParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const queryParams = req.query;
    
    logger.info('Fetching revenue collections', {
      query: queryParams,
      ip: req.ip,
    });

    const result = await revenueService.getRevenueCollections(queryParams);
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/revenue', 200, duration, { query: queryParams });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/revenue/:id - ดึงรายการรายได้ตาม ID
router.get('/:id',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    logger.info('Fetching revenue collection by ID', { id, ip: req.ip });

    const revenue = await revenueService.getRevenueCollectionById(id);
    
    const duration = Date.now() - startTime;
    logger.api('GET', `/api/revenue/${id}`, 200, duration);

    res.json({
      success: true,
      data: revenue,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/revenue - สร้างรายการรายได้ใหม่
router.post('/',
  revenueCreateLimiter,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const revenueData = req.body;
    
    logger.info('Creating new revenue collection', {
      data: { ...revenueData, amount: revenueData.amount },
      ip: req.ip,
    });

    const newRevenue = await revenueService.createRevenueCollection(revenueData);
    
    const duration = Date.now() - startTime;
    logger.revenue('created', newRevenue.id, newRevenue.amount, { duration });

    res.status(201).json({
      success: true,
      data: newRevenue,
      message: 'สร้างรายการรายได้สำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// PUT /api/revenue/:id - อัปเดตรายการรายได้
router.put('/:id',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Updating revenue collection', { id, data: updateData, ip: req.ip });

    const updatedRevenue = await revenueService.updateRevenueCollection(id, updateData);
    
    const duration = Date.now() - startTime;
    logger.revenue('updated', id, updatedRevenue.amount, { duration });

    res.json({
      success: true,
      data: updatedRevenue,
      message: 'อัปเดตรายการรายได้สำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// DELETE /api/revenue/:id - ลบรายการรายได้
router.delete('/:id',
  rateLimitMiddleware,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    logger.info('Deleting revenue collection', { id, ip: req.ip });

    await revenueService.deleteRevenueCollection(id);
    
    const duration = Date.now() - startTime;
    logger.revenue('deleted', id, 0, { duration });

    res.json({
      success: true,
      message: 'ลบรายการรายได้สำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/revenue/summary - สรุปข้อมูลรายได้
router.get('/summary',
  rateLimitMiddleware,
  validateDateParams,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const queryParams = req.query;
    
    logger.info('Fetching revenue summary', { query: queryParams, ip: req.ip });

    const summary = await revenueService.getRevenueSummary(queryParams);
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/revenue/summary', 200, duration);

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/revenue/categories - ดึงหมวดหมู่รายได้
router.get('/categories',
  rateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    logger.info('Fetching revenue categories', { ip: req.ip });

    const categories = await revenueService.getRevenueCategories();
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/revenue/categories', 200, duration);

    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/revenue/categories - สร้างหมวดหมู่รายได้ใหม่
router.post('/categories',
  rateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const categoryData = req.body;
    
    logger.info('Creating new revenue category', { data: categoryData, ip: req.ip });

    const newCategory = await revenueService.createRevenueCategory(categoryData);
    
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/revenue/categories', 201, duration);

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'สร้างหมวดหมู่รายได้สำเร็จ',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/revenue/search - ค้นหารายการรายได้
router.get('/search',
  searchLimiter,
  validateSearchParam,
  validateQueryParams,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { search, ...queryParams } = req.query;
    
    logger.info('Searching revenue collections', { 
      search, 
      query: queryParams, 
      ip: req.ip 
    });

    const result = await revenueService.searchRevenueCollections(search as string, queryParams);
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/revenue/search', 200, duration);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /api/revenue/bulk - สร้างรายการรายได้หลายรายการ
router.post('/bulk',
  revenueCreateLimiter,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { revenues } = req.body;
    
    logger.info('Creating bulk revenue collections', { 
      count: revenues?.length || 0, 
      ip: req.ip 
    });

    const result = await revenueService.createBulkRevenueCollections(revenues);
    
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/revenue/bulk', 201, duration);

    res.status(201).json({
      success: true,
      data: result,
      message: `สร้างรายการรายได้สำเร็จ ${result.created} รายการ`,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/revenue/export - ส่งออกรายการรายได้
router.get('/export',
  rateLimitMiddleware,
  validateDateParams,
  validateAmountParams,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const queryParams = req.query;
    const { format = 'csv' } = req.query;
    
    logger.info('Exporting revenue collections', { 
      format, 
      query: queryParams, 
      ip: req.ip 
    });

    const exportData = await revenueService.exportRevenueCollections(queryParams, format as string);
    
    const duration = Date.now() - startTime;
    logger.api('GET', '/api/revenue/export', 200, duration);

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-export-${new Date().toISOString().split('T')[0]}.${format}`);
    
    res.send(exportData);
  })
);

export default router; 