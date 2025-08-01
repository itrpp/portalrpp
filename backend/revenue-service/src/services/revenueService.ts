import { PrismaClient, Revenue, RevenueType, RevenueStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface CreateRevenueData {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  categoryName: string;
  type: RevenueType;
  date: Date;
  userId: string;
  tags?: string[];
  notes?: string;
  attachments?: string[];
}

export interface UpdateRevenueData {
  title?: string;
  description?: string;
  amount?: number;
  currency?: string;
  categoryName?: string;
  type?: RevenueType;
  date?: Date;
  tags?: string[];
  notes?: string;
  attachments?: string[];
}

export interface RevenueFilters {
  userId?: string;
  type?: RevenueType;
  categoryName?: string;
  status?: RevenueStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export class RevenueService {
  /**
   * สร้างรายการรายได้/ค่าใช้จ่ายใหม่
   */
  async createRevenue(data: CreateRevenueData): Promise<Revenue> {
    try {
      logger.info('Creating new revenue record', { userId: data.userId, amount: data.amount });

      const revenue = await prisma.revenue.create({
        data: {
          ...data,
          tags: data.tags ? JSON.stringify(data.tags) : null,
          attachments: data.attachments ? JSON.stringify(data.attachments) : null,
        },
        include: {
          user: true,
          category: true,
        },
      });

      logger.info('Revenue record created successfully', { id: revenue.id });
      return revenue;
    } catch (error) {
      logger.error('Error creating revenue record:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการรายได้/ค่าใช้จ่ายทั้งหมด
   */
  async getAllRevenues(filters: RevenueFilters = {}): Promise<Revenue[]> {
    try {
      logger.info('Fetching all revenue records', { filters });

      const where: any = {};

      if (filters.userId) where.userId = filters.userId;
      if (filters.type) where.type = filters.type;
      if (filters.categoryName) where.categoryName = filters.categoryName;
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }
      if (filters.minAmount || filters.maxAmount) {
        where.amount = {};
        if (filters.minAmount) where.amount.gte = filters.minAmount;
        if (filters.maxAmount) where.amount.lte = filters.maxAmount;
      }

      const revenues = await prisma.revenue.findMany({
        where,
        include: {
          user: true,
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      logger.info(`Found ${revenues.length} revenue records`);
      return revenues;
    } catch (error) {
      logger.error('Error fetching revenue records:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการรายได้/ค่าใช้จ่ายตาม ID
   */
  async getRevenueById(id: string): Promise<Revenue | null> {
    try {
      logger.info('Fetching revenue record by ID', { id });

      const revenue = await prisma.revenue.findUnique({
        where: { id },
        include: {
          user: true,
          category: true,
        },
      });

      if (!revenue) {
        logger.warn('Revenue record not found', { id });
        return null;
      }

      logger.info('Revenue record found', { id });
      return revenue;
    } catch (error) {
      logger.error('Error fetching revenue record by ID:', error);
      throw error;
    }
  }

  /**
   * อัปเดตรายการรายได้/ค่าใช้จ่าย
   */
  async updateRevenue(id: string, data: UpdateRevenueData): Promise<Revenue> {
    try {
      logger.info('Updating revenue record', { id });

      const updateData: any = { ...data };
      if (data.tags) updateData.tags = JSON.stringify(data.tags);
      if (data.attachments) updateData.attachments = JSON.stringify(data.attachments);

      const revenue = await prisma.revenue.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          category: true,
        },
      });

      logger.info('Revenue record updated successfully', { id });
      return revenue;
    } catch (error) {
      logger.error('Error updating revenue record:', error);
      throw error;
    }
  }

  /**
   * ลบรายการรายได้/ค่าใช้จ่าย
   */
  async deleteRevenue(id: string): Promise<void> {
    try {
      logger.info('Deleting revenue record', { id });

      await prisma.revenue.delete({
        where: { id },
      });

      logger.info('Revenue record deleted successfully', { id });
    } catch (error) {
      logger.error('Error deleting revenue record:', error);
      throw error;
    }
  }

  /**
   * คำนวณสถิติรายได้/ค่าใช้จ่าย
   */
  async getRevenueStatistics(userId?: string, startDate?: Date, endDate?: Date) {
    try {
      logger.info('Calculating revenue statistics', { userId, startDate, endDate });

      const where: any = {};
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      const [totalIncome, totalExpense, totalRevenue] = await Promise.all([
        prisma.revenue.aggregate({
          where: { ...where, type: 'INCOME' },
          _sum: { amount: true },
        }),
        prisma.revenue.aggregate({
          where: { ...where, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
        prisma.revenue.aggregate({
          where,
          _sum: { amount: true },
        }),
      ]);

      const statistics = {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        totalRevenue: totalRevenue._sum.amount || 0,
        netIncome: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
      };

      logger.info('Revenue statistics calculated', statistics);
      return statistics;
    } catch (error) {
      logger.error('Error calculating revenue statistics:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการตามหมวดหมู่
   */
  async getRevenuesByCategory(userId?: string, startDate?: Date, endDate?: Date) {
    try {
      logger.info('Fetching revenues by category', { userId, startDate, endDate });

      const where: any = {};
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      const revenues = await prisma.revenue.groupBy({
        by: ['categoryName', 'type'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      });

      const result = revenues.map(item => ({
        category: item.categoryName,
        type: item.type,
        totalAmount: item._sum.amount || 0,
        count: item._count.id,
      }));

      logger.info(`Found ${result.length} revenue categories`);
      return result;
    } catch (error) {
      logger.error('Error fetching revenues by category:', error);
      throw error;
    }
  }
}

export const revenueService = new RevenueService(); 
