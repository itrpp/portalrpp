// Revenue Service API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/revenue';

export interface Revenue {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'ADJUSTMENT';
  date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  userId: string;
  tags?: string;
  notes?: string;
  attachments?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  category?: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  };
}

export interface RevenueFilters {
  userId?: string;
  type?: string;
  categoryName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface RevenueStatistics {
  totalIncome: number;
  totalExpense: number;
  totalRevenue: number;
  netIncome: number;
}

export interface RevenueByCategory {
  category: string;
  type: string;
  totalAmount: number;
  count: number;
}

class RevenueService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * ดึงรายการรายได้/ค่าใช้จ่ายทั้งหมด
   */
  async getRevenues(filters: RevenueFilters = {}): Promise<Revenue[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await this.request<{
      message: string;
      data: Revenue[];
      count: number;
      timestamp: string;
    }>(`?${params.toString()}`);

    return response.data;
  }

  /**
   * ดึงรายการรายได้/ค่าใช้จ่ายตาม ID
   */
  async getRevenueById(id: string): Promise<Revenue> {
    const response = await this.request<{
      message: string;
      data: Revenue;
      timestamp: string;
    }>(`/${id}`);

    return response.data;
  }

  /**
   * สร้างรายการรายได้/ค่าใช้จ่ายใหม่
   */
  async createRevenue(data: Omit<Revenue, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'category'>): Promise<Revenue> {
    const response = await this.request<{
      message: string;
      data: Revenue;
      timestamp: string;
    }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response.data;
  }

  /**
   * อัปเดตรายการรายได้/ค่าใช้จ่าย
   */
  async updateRevenue(id: string, data: Partial<Revenue>): Promise<Revenue> {
    const response = await this.request<{
      message: string;
      data: Revenue;
      timestamp: string;
    }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return response.data;
  }

  /**
   * ลบรายการรายได้/ค่าใช้จ่าย
   */
  async deleteRevenue(id: string): Promise<void> {
    await this.request(`/${id}`, {
      method: 'DELETE',
    });
  }
}

export const revenueService = new RevenueService(); 