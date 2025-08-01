import { Router } from 'express';
import { revenueService } from '../services/revenueService';
import { errorHandler } from '../utils/errorHandler';
import { RevenueType } from '@prisma/client';

const router = Router();

// GET /revenues - ดึงรายการรายได้ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const { type, categoryName, status, startDate, endDate, minAmount, maxAmount } = req.query;
    
    const filters = {
      userId: '1', // จำลอง user ID
      type: type as RevenueType | undefined,
      categoryName: categoryName as string,
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
    };

    const revenues = await revenueService.getAllRevenues(filters);
    return res.json(revenues);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// GET /revenues/:id - ดึงรายได้ตาม ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const revenue = await revenueService.getRevenueById(id);
    
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue not found' });
    }
    
    return res.json(revenue);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// POST /revenues - สร้างรายได้ใหม่
router.post('/', async (req, res) => {
  try {
    const { amount, type, categoryName, description, date, status } = req.body;
    
    const revenue = await revenueService.createRevenue({
      amount: parseFloat(amount),
      type,
      categoryName,
      description,
      date: new Date(date),
      status,
      userId: '1', // จำลอง user ID
    });
    
    return res.status(201).json(revenue);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// PUT /revenues/:id - อัปเดตรายได้
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, categoryName, description, date, status } = req.body;
    
    const revenue = await revenueService.updateRevenue(id, {
      amount: parseFloat(amount),
      type,
      categoryName,
      description,
      date: new Date(date),
      status,
    });
    
    if (!revenue) {
      return res.status(404).json({ error: 'Revenue not found' });
    }
    
    return res.json(revenue);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// DELETE /revenues/:id - ลบรายได้
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await revenueService.deleteRevenue(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Revenue not found' });
    }
    
    return res.status(204).send();
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

export default router; 
