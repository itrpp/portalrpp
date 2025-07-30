// Revenue Collection Types
export interface RevenueCollection {
  id: string;
  referenceNumber: string;
  category: RevenueCategory;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  payerName: string;
  payerId?: string;
  payerType: PayerType;
  description: string;
  collectionDate: Date;
  dueDate?: Date;
  status: RevenueStatus;
  receiptNumber?: string;
  attachments?: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface RevenueCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueReport {
  id: string;
  reportType: ReportType;
  title: string;
  description?: string;
  periodStart: Date;
  periodEnd: Date;
  filters: ReportFilters;
  data: RevenueReportData[];
  summary: RevenueSummary;
  generatedBy: string;
  generatedAt: Date;
  status: ReportStatus;
  fileUrl?: string;
}

export interface RevenueReportData {
  date: Date;
  category: string;
  amount: number;
  count: number;
  paymentMethod: string;
}

export interface RevenueSummary {
  totalAmount: number;
  totalCount: number;
  byCategory: Record<string, { amount: number; count: number }>;
  byPaymentMethod: Record<string, { amount: number; count: number }>;
  byDate: Record<string, { amount: number; count: number }>;
}

export interface ReportFilters {
  categories?: string[];
  paymentMethods?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  statuses?: RevenueStatus[];
  minAmount?: number;
  maxAmount?: number;
}

// Enums
export enum RevenueStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

export enum PayerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER',
}

export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// API Request/Response Types
export interface CreateRevenueRequest {
  category: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  payerName: string;
  payerId?: string;
  payerType: PayerType;
  description: string;
  collectionDate: Date;
  dueDate?: Date;
  receiptNumber?: string;
  attachments?: string[];
  notes?: string;
}

export interface UpdateRevenueRequest {
  category?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  payerName?: string;
  payerId?: string;
  payerType?: PayerType;
  description?: string;
  collectionDate?: Date;
  dueDate?: Date;
  status?: RevenueStatus;
  receiptNumber?: string;
  attachments?: string[];
  notes?: string;
}

export interface RevenueQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: RevenueStatus;
  paymentMethod?: PaymentMethod;
  payerType?: PayerType;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateReportRequest {
  reportType: ReportType;
  title: string;
  description?: string;
  periodStart: Date;
  periodEnd: Date;
  filters?: ReportFilters;
}

export interface ReportQueryParams {
  reportType?: ReportType;
  status?: ReportStatus;
  dateFrom?: string;
  dateTo?: string;
  generatedBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Database Types (สำหรับการเรียกใช้ผ่าน API Gateway)
export interface DatabaseRevenueCollection {
  id: string;
  reference_number: string;
  category: string;
  amount: number;
  currency: string;
  payment_method: string;
  payer_name: string;
  payer_id?: string;
  payer_type: string;
  description: string;
  collection_date: string;
  due_date?: string;
  status: string;
  receipt_number?: string;
  attachments?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface DatabaseRevenueCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRevenueReport {
  id: string;
  report_type: string;
  title: string;
  description?: string;
  period_start: string;
  period_end: string;
  filters: string;
  data: string;
  summary: string;
  generated_by: string;
  generated_at: string;
  status: string;
  file_url?: string;
}

// Utility Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: boolean;
    apiGateway: boolean;
  };
} 