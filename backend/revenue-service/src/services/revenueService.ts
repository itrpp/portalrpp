import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  RevenueCollection, 
  RevenueCategory, 
  RevenueQueryParams, 
  PaginatedResponse,
  CreateRevenueRequest,
  UpdateRevenueRequest,
  RevenueSummary,
  DatabaseRevenueCollection,
  DatabaseRevenueCategory
} from '../types';
import { 
  validateRevenueData, 
  validateRevenueUpdate, 
  validateRevenueQuery,
  generateReferenceNumber 
} from '../utils/validation';
import { 
  createDatabaseError, 
  createNotFoundError, 
  createConflictError 
} from '../utils/errorHandler';

export class RevenueService {
  private apiGatewayUrl: string;
  private databaseServiceUrl: string;

  constructor() {
    this.apiGatewayUrl = config.apiGatewayUrl;
    this.databaseServiceUrl = config.databaseServiceUrl;
  }

  // ดึงรายการรายได้ทั้งหมด
  async getRevenueCollections(queryParams: any): Promise<PaginatedResponse<RevenueCollection>> {
    try {
      const validatedParams = validateRevenueQuery(queryParams);
      const startTime = Date.now();

      // เรียกใช้ Database Service ผ่าน API Gateway
      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections`, {
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
      
      logger.database('select', 'revenue_collections', duration, { 
        query: validatedParams,
        count: data.data?.length || 0 
      });

      return this.transformDatabaseResponse(data);
    } catch (error) {
      logger.error('Failed to get revenue collections', { error: error.message, query: queryParams });
      throw error;
    }
  }

  // ดึงรายการรายได้ตาม ID
  async getRevenueCollectionById(id: string): Promise<RevenueCollection> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Revenue collection', id);
        }
        throw createDatabaseError('fetch', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('select', 'revenue_collections', duration, { id });

      return this.transformRevenueCollection(data);
    } catch (error) {
      logger.error('Failed to get revenue collection by ID', { error: error.message, id });
      throw error;
    }
  }

  // สร้างรายการรายได้ใหม่
  async createRevenueCollection(revenueData: CreateRevenueRequest): Promise<RevenueCollection> {
    try {
      const validatedData = validateRevenueData(revenueData);
      const startTime = Date.now();

      // สร้าง reference number
      const referenceNumber = generateReferenceNumber();
      
      const newRevenue: Partial<DatabaseRevenueCollection> = {
        id: uuidv4(),
        reference_number: referenceNumber,
        category: validatedData.category,
        amount: validatedData.amount,
        currency: validatedData.currency || 'THB',
        payment_method: validatedData.paymentMethod,
        payer_name: validatedData.payerName,
        payer_id: validatedData.payerId,
        payer_type: validatedData.payerType,
        description: validatedData.description,
        collection_date: validatedData.collectionDate.toISOString(),
        due_date: validatedData.dueDate?.toISOString(),
        status: 'PENDING',
        receipt_number: validatedData.receiptNumber,
        attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
        notes: validatedData.notes,
        created_by: 'system', // TODO: Get from auth context
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRevenue),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw createConflictError('Revenue collection', 'reference_number', referenceNumber);
        }
        throw createDatabaseError('create', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('insert', 'revenue_collections', duration, { 
        id: newRevenue.id,
        amount: newRevenue.amount 
      });

      return this.transformRevenueCollection(data);
    } catch (error) {
      logger.error('Failed to create revenue collection', { error: error.message, data: revenueData });
      throw error;
    }
  }

  // อัปเดตรายการรายได้
  async updateRevenueCollection(id: string, updateData: UpdateRevenueRequest): Promise<RevenueCollection> {
    try {
      const validatedData = validateRevenueUpdate(updateData);
      const startTime = Date.now();

      const updatePayload: Partial<DatabaseRevenueCollection> = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.category) updatePayload.category = validatedData.category;
      if (validatedData.amount) updatePayload.amount = validatedData.amount;
      if (validatedData.currency) updatePayload.currency = validatedData.currency;
      if (validatedData.paymentMethod) updatePayload.payment_method = validatedData.paymentMethod;
      if (validatedData.payerName) updatePayload.payer_name = validatedData.payerName;
      if (validatedData.payerId) updatePayload.payer_id = validatedData.payerId;
      if (validatedData.payerType) updatePayload.payer_type = validatedData.payerType;
      if (validatedData.description) updatePayload.description = validatedData.description;
      if (validatedData.collectionDate) updatePayload.collection_date = validatedData.collectionDate.toISOString();
      if (validatedData.dueDate) updatePayload.due_date = validatedData.dueDate.toISOString();
      if (validatedData.status) updatePayload.status = validatedData.status;
      if (validatedData.receiptNumber) updatePayload.receipt_number = validatedData.receiptNumber;
      if (validatedData.attachments) updatePayload.attachments = JSON.stringify(validatedData.attachments);
      if (validatedData.notes) updatePayload.notes = validatedData.notes;

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Revenue collection', id);
        }
        throw createDatabaseError('update', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('update', 'revenue_collections', duration, { id });

      return this.transformRevenueCollection(data);
    } catch (error) {
      logger.error('Failed to update revenue collection', { error: error.message, id, data: updateData });
      throw error;
    }
  }

  // ลบรายการรายได้
  async deleteRevenueCollection(id: string): Promise<void> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createNotFoundError('Revenue collection', id);
        }
        throw createDatabaseError('delete', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const duration = Date.now() - startTime;
      logger.database('delete', 'revenue_collections', duration, { id });
    } catch (error) {
      logger.error('Failed to delete revenue collection', { error: error.message, id });
      throw error;
    }
  }

  // ดึงสรุปข้อมูลรายได้
  async getRevenueSummary(queryParams: any): Promise<RevenueSummary> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryParams }),
      });

      if (!response.ok) {
        throw createDatabaseError('summary', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('summary', 'revenue_collections', duration);

      return data;
    } catch (error) {
      logger.error('Failed to get revenue summary', { error: error.message, query: queryParams });
      throw error;
    }
  }

  // ดึงหมวดหมู่รายได้
  async getRevenueCategories(): Promise<RevenueCategory[]> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw createDatabaseError('fetch', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('select', 'revenue_categories', duration, { count: data.length });

      return data.map((category: DatabaseRevenueCategory) => this.transformRevenueCategory(category));
    } catch (error) {
      logger.error('Failed to get revenue categories', { error: error.message });
      throw error;
    }
  }

  // สร้างหมวดหมู่รายได้ใหม่
  async createRevenueCategory(categoryData: any): Promise<RevenueCategory> {
    try {
      const startTime = Date.now();

      const newCategory: Partial<DatabaseRevenueCategory> = {
        id: uuidv4(),
        name: categoryData.name,
        code: categoryData.code,
        description: categoryData.description,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(`${this.databaseServiceUrl}/revenue_categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw createConflictError('Revenue category', 'code', categoryData.code);
        }
        throw createDatabaseError('create', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('insert', 'revenue_categories', duration, { id: newCategory.id });

      return this.transformRevenueCategory(data);
    } catch (error) {
      logger.error('Failed to create revenue category', { error: error.message, data: categoryData });
      throw error;
    }
  }

  // ค้นหารายการรายได้
  async searchRevenueCollections(search: string, queryParams: any): Promise<PaginatedResponse<RevenueCollection>> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/search`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ search, query: queryParams }),
      });

      if (!response.ok) {
        throw createDatabaseError('search', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      logger.database('search', 'revenue_collections', duration, { 
        search,
        count: data.data?.length || 0 
      });

      return this.transformDatabaseResponse(data);
    } catch (error) {
      logger.error('Failed to search revenue collections', { error: error.message, search, query: queryParams });
      throw error;
    }
  }

  // สร้างรายการรายได้หลายรายการ
  async createBulkRevenueCollections(revenues: CreateRevenueRequest[]): Promise<{ created: number; failed: number; errors: any[] }> {
    try {
      const startTime = Date.now();
      const results = { created: 0, failed: 0, errors: [] };

      for (const revenueData of revenues) {
        try {
          await this.createRevenueCollection(revenueData);
          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            data: revenueData,
            error: error.message,
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.database('bulk_insert', 'revenue_collections', duration, { 
        total: revenues.length,
        created: results.created,
        failed: results.failed 
      });

      return results;
    } catch (error) {
      logger.error('Failed to create bulk revenue collections', { error: error.message });
      throw error;
    }
  }

  // ส่งออกรายการรายได้
  async exportRevenueCollections(queryParams: any, format: string): Promise<string> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.databaseServiceUrl}/revenue_collections/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryParams, format }),
      });

      if (!response.ok) {
        throw createDatabaseError('export', new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.text();
      const duration = Date.now() - startTime;
      
      logger.database('export', 'revenue_collections', duration, { format });

      return data;
    } catch (error) {
      logger.error('Failed to export revenue collections', { error: error.message, format, query: queryParams });
      throw error;
    }
  }

  // Transform database response to API response
  private transformDatabaseResponse(data: any): PaginatedResponse<RevenueCollection> {
    return {
      data: data.data?.map((item: DatabaseRevenueCollection) => this.transformRevenueCollection(item)) || [],
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

  // Transform database revenue collection to API revenue collection
  private transformRevenueCollection(dbRevenue: DatabaseRevenueCollection): RevenueCollection {
    return {
      id: dbRevenue.id,
      referenceNumber: dbRevenue.reference_number,
      category: {
        id: dbRevenue.category,
        name: dbRevenue.category,
        code: dbRevenue.category,
        description: '',
        isActive: true,
        createdAt: new Date(dbRevenue.created_at),
        updatedAt: new Date(dbRevenue.updated_at),
      },
      amount: dbRevenue.amount,
      currency: dbRevenue.currency,
      paymentMethod: dbRevenue.payment_method as any,
      payerName: dbRevenue.payer_name,
      payerId: dbRevenue.payer_id,
      payerType: dbRevenue.payer_type as any,
      description: dbRevenue.description,
      collectionDate: new Date(dbRevenue.collection_date),
      dueDate: dbRevenue.due_date ? new Date(dbRevenue.due_date) : undefined,
      status: dbRevenue.status as any,
      receiptNumber: dbRevenue.receipt_number,
      attachments: dbRevenue.attachments ? JSON.parse(dbRevenue.attachments) : undefined,
      notes: dbRevenue.notes,
      createdBy: dbRevenue.created_by,
      createdAt: new Date(dbRevenue.created_at),
      updatedAt: new Date(dbRevenue.updated_at),
      approvedBy: dbRevenue.approved_by,
      approvedAt: dbRevenue.approved_at ? new Date(dbRevenue.approved_at) : undefined,
    };
  }

  // Transform database revenue category to API revenue category
  private transformRevenueCategory(dbCategory: DatabaseRevenueCategory): RevenueCategory {
    return {
      id: dbCategory.id,
      name: dbCategory.name,
      code: dbCategory.code,
      description: dbCategory.description,
      isActive: dbCategory.is_active,
      createdAt: new Date(dbCategory.created_at),
      updatedAt: new Date(dbCategory.updated_at),
    };
  }
} 