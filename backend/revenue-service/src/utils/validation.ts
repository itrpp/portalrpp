import Joi from 'joi';
import { ValidationError } from './errorHandler';
import { 
  RevenueStatus, 
  PaymentMethod, 
  PayerType, 
  ReportType, 
  ReportStatus 
} from '../types';

// Revenue Collection Validation Schema
export const createRevenueSchema = Joi.object({
  category: Joi.string().required().messages({
    'string.empty': 'หมวดหมู่รายได้ไม่สามารถเป็นค่าว่างได้',
    'any.required': 'กรุณาระบุหมวดหมู่รายได้',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'จำนวนเงินต้องเป็นตัวเลข',
    'number.positive': 'จำนวนเงินต้องมากกว่า 0',
    'any.required': 'กรุณาระบุจำนวนเงิน',
  }),
  currency: Joi.string().default('THB').messages({
    'string.base': 'สกุลเงินต้องเป็นข้อความ',
  }),
  paymentMethod: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .required()
    .messages({
      'any.only': 'วิธีการชำระเงินไม่ถูกต้อง',
      'any.required': 'กรุณาระบุวิธีการชำระเงิน',
    }),
  payerName: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'ชื่อผู้ชำระไม่สามารถเป็นค่าว่างได้',
    'string.min': 'ชื่อผู้ชำระต้องมีอย่างน้อย 1 ตัวอักษร',
    'string.max': 'ชื่อผู้ชำระต้องไม่เกิน 200 ตัวอักษร',
    'any.required': 'กรุณาระบุชื่อผู้ชำระ',
  }),
  payerId: Joi.string().optional().messages({
    'string.base': 'รหัสผู้ชำระต้องเป็นข้อความ',
  }),
  payerType: Joi.string()
    .valid(...Object.values(PayerType))
    .required()
    .messages({
      'any.only': 'ประเภทผู้ชำระไม่ถูกต้อง',
      'any.required': 'กรุณาระบุประเภทผู้ชำระ',
    }),
  description: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'รายละเอียดไม่สามารถเป็นค่าว่างได้',
    'string.min': 'รายละเอียดต้องมีอย่างน้อย 1 ตัวอักษร',
    'string.max': 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร',
    'any.required': 'กรุณาระบุรายละเอียด',
  }),
  collectionDate: Joi.date().max('now').required().messages({
    'date.base': 'วันที่จัดเก็บต้องเป็นวันที่ที่ถูกต้อง',
    'date.max': 'วันที่จัดเก็บไม่สามารถเป็นวันที่ในอนาคตได้',
    'any.required': 'กรุณาระบุวันที่จัดเก็บ',
  }),
  dueDate: Joi.date().min(Joi.ref('collectionDate')).optional().messages({
    'date.base': 'วันครบกำหนดต้องเป็นวันที่ที่ถูกต้อง',
    'date.min': 'วันครบกำหนดต้องไม่น้อยกว่าวันที่จัดเก็บ',
  }),
  receiptNumber: Joi.string().optional().messages({
    'string.base': 'เลขที่ใบเสร็จต้องเป็นข้อความ',
  }),
  attachments: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'ไฟล์แนบต้องเป็นรายการ',
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'หมายเหตุต้องไม่เกิน 1000 ตัวอักษร',
  }),
});

export const updateRevenueSchema = Joi.object({
  category: Joi.string().optional().messages({
    'string.empty': 'หมวดหมู่รายได้ไม่สามารถเป็นค่าว่างได้',
  }),
  amount: Joi.number().positive().optional().messages({
    'number.base': 'จำนวนเงินต้องเป็นตัวเลข',
    'number.positive': 'จำนวนเงินต้องมากกว่า 0',
  }),
  currency: Joi.string().optional().messages({
    'string.base': 'สกุลเงินต้องเป็นข้อความ',
  }),
  paymentMethod: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .optional()
    .messages({
      'any.only': 'วิธีการชำระเงินไม่ถูกต้อง',
    }),
  payerName: Joi.string().min(1).max(200).optional().messages({
    'string.empty': 'ชื่อผู้ชำระไม่สามารถเป็นค่าว่างได้',
    'string.min': 'ชื่อผู้ชำระต้องมีอย่างน้อย 1 ตัวอักษร',
    'string.max': 'ชื่อผู้ชำระต้องไม่เกิน 200 ตัวอักษร',
  }),
  payerId: Joi.string().optional().messages({
    'string.base': 'รหัสผู้ชำระต้องเป็นข้อความ',
  }),
  payerType: Joi.string()
    .valid(...Object.values(PayerType))
    .optional()
    .messages({
      'any.only': 'ประเภทผู้ชำระไม่ถูกต้อง',
    }),
  description: Joi.string().min(1).max(500).optional().messages({
    'string.empty': 'รายละเอียดไม่สามารถเป็นค่าว่างได้',
    'string.min': 'รายละเอียดต้องมีอย่างน้อย 1 ตัวอักษร',
    'string.max': 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร',
  }),
  collectionDate: Joi.date().max('now').optional().messages({
    'date.base': 'วันที่จัดเก็บต้องเป็นวันที่ที่ถูกต้อง',
    'date.max': 'วันที่จัดเก็บไม่สามารถเป็นวันที่ในอนาคตได้',
  }),
  dueDate: Joi.date().optional().messages({
    'date.base': 'วันครบกำหนดต้องเป็นวันที่ที่ถูกต้อง',
  }),
  status: Joi.string()
    .valid(...Object.values(RevenueStatus))
    .optional()
    .messages({
      'any.only': 'สถานะไม่ถูกต้อง',
    }),
  receiptNumber: Joi.string().optional().messages({
    'string.base': 'เลขที่ใบเสร็จต้องเป็นข้อความ',
  }),
  attachments: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'ไฟล์แนบต้องเป็นรายการ',
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'หมายเหตุต้องไม่เกิน 1000 ตัวอักษร',
  }),
});

// Query Parameters Validation Schema
export const revenueQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'หมายเลขหน้าต้องเป็นตัวเลข',
    'number.integer': 'หมายเลขหน้าต้องเป็นจำนวนเต็ม',
    'number.min': 'หมายเลขหน้าต้องมากกว่า 0',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'จำนวนรายการต่อหน้าต้องเป็นตัวเลข',
    'number.integer': 'จำนวนรายการต่อหน้าต้องเป็นจำนวนเต็ม',
    'number.min': 'จำนวนรายการต่อหน้าต้องมากกว่า 0',
    'number.max': 'จำนวนรายการต่อหน้าต้องไม่เกิน 100',
  }),
  category: Joi.string().optional().messages({
    'string.base': 'หมวดหมู่ต้องเป็นข้อความ',
  }),
  status: Joi.string()
    .valid(...Object.values(RevenueStatus))
    .optional()
    .messages({
      'any.only': 'สถานะไม่ถูกต้อง',
    }),
  paymentMethod: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .optional()
    .messages({
      'any.only': 'วิธีการชำระเงินไม่ถูกต้อง',
    }),
  payerType: Joi.string()
    .valid(...Object.values(PayerType))
    .optional()
    .messages({
      'any.only': 'ประเภทผู้ชำระไม่ถูกต้อง',
    }),
  dateFrom: Joi.date().optional().messages({
    'date.base': 'วันที่เริ่มต้นต้องเป็นวันที่ที่ถูกต้อง',
  }),
  dateTo: Joi.date().min(Joi.ref('dateFrom')).optional().messages({
    'date.base': 'วันที่สิ้นสุดต้องเป็นวันที่ที่ถูกต้อง',
    'date.min': 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น',
  }),
  minAmount: Joi.number().positive().optional().messages({
    'number.base': 'จำนวนเงินขั้นต่ำต้องเป็นตัวเลข',
    'number.positive': 'จำนวนเงินขั้นต่ำต้องมากกว่า 0',
  }),
  maxAmount: Joi.number().positive().min(Joi.ref('minAmount')).optional().messages({
    'number.base': 'จำนวนเงินสูงสุดต้องเป็นตัวเลข',
    'number.positive': 'จำนวนเงินสูงสุดต้องมากกว่า 0',
    'number.min': 'จำนวนเงินสูงสุดต้องไม่น้อยกว่าจำนวนเงินขั้นต่ำ',
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'คำค้นหาต้องไม่เกิน 100 ตัวอักษร',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'collectionDate', 'amount', 'payerName', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'ฟิลด์ที่ใช้เรียงลำดับไม่ถูกต้อง',
    }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'ลำดับการเรียงไม่ถูกต้อง',
  }),
});

// Report Validation Schema
export const createReportSchema = Joi.object({
  reportType: Joi.string()
    .valid(...Object.values(ReportType))
    .required()
    .messages({
      'any.only': 'ประเภทรายงานไม่ถูกต้อง',
      'any.required': 'กรุณาระบุประเภทรายงาน',
    }),
  title: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'ชื่อรายงานไม่สามารถเป็นค่าว่างได้',
    'string.min': 'ชื่อรายงานต้องมีอย่างน้อย 1 ตัวอักษร',
    'string.max': 'ชื่อรายงานต้องไม่เกิน 200 ตัวอักษร',
    'any.required': 'กรุณาระบุชื่อรายงาน',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'รายละเอียดรายงานต้องไม่เกิน 500 ตัวอักษร',
  }),
  periodStart: Joi.date().required().messages({
    'date.base': 'วันที่เริ่มต้นต้องเป็นวันที่ที่ถูกต้อง',
    'any.required': 'กรุณาระบุวันที่เริ่มต้น',
  }),
  periodEnd: Joi.date().min(Joi.ref('periodStart')).required().messages({
    'date.base': 'วันที่สิ้นสุดต้องเป็นวันที่ที่ถูกต้อง',
    'date.min': 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น',
    'any.required': 'กรุณาระบุวันที่สิ้นสุด',
  }),
  filters: Joi.object({
    categories: Joi.array().items(Joi.string()).optional(),
    paymentMethods: Joi.array().items(Joi.string()).optional(),
    dateRange: Joi.object({
      start: Joi.date().optional(),
      end: Joi.date().min(Joi.ref('start')).optional(),
    }).optional(),
    statuses: Joi.array().items(Joi.string()).optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().min(Joi.ref('minAmount')).optional(),
  }).optional(),
});

export const reportQuerySchema = Joi.object({
  reportType: Joi.string()
    .valid(...Object.values(ReportType))
    .optional()
    .messages({
      'any.only': 'ประเภทรายงานไม่ถูกต้อง',
    }),
  status: Joi.string()
    .valid(...Object.values(ReportStatus))
    .optional()
    .messages({
      'any.only': 'สถานะรายงานไม่ถูกต้อง',
    }),
  dateFrom: Joi.date().optional().messages({
    'date.base': 'วันที่เริ่มต้นต้องเป็นวันที่ที่ถูกต้อง',
  }),
  dateTo: Joi.date().min(Joi.ref('dateFrom')).optional().messages({
    'date.base': 'วันที่สิ้นสุดต้องเป็นวันที่ที่ถูกต้อง',
    'date.min': 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น',
  }),
  generatedBy: Joi.string().optional().messages({
    'string.base': 'ผู้สร้างรายงานต้องเป็นข้อความ',
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'หมายเลขหน้าต้องเป็นตัวเลข',
    'number.integer': 'หมายเลขหน้าต้องเป็นจำนวนเต็ม',
    'number.min': 'หมายเลขหน้าต้องมากกว่า 0',
  }),
  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    'number.base': 'จำนวนรายการต่อหน้าต้องเป็นตัวเลข',
    'number.integer': 'จำนวนรายการต่อหน้าต้องเป็นจำนวนเต็ม',
    'number.min': 'จำนวนรายการต่อหน้าต้องมากกว่า 0',
    'number.max': 'จำนวนรายการต่อหน้าต้องไม่เกิน 50',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'generatedAt', 'title', 'reportType', 'status')
    .default('generatedAt')
    .messages({
      'any.only': 'ฟิลด์ที่ใช้เรียงลำดับไม่ถูกต้อง',
    }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'ลำดับการเรียงไม่ถูกต้อง',
  }),
});

// Validation helper functions
export const validateSchema = (schema: Joi.Schema, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(errorMessages.join(', '));
  }

  return value;
};

export const validateRevenueData = (data: any) => {
  return validateSchema(createRevenueSchema, data);
};

export const validateRevenueUpdate = (data: any) => {
  return validateSchema(updateRevenueSchema, data);
};

export const validateRevenueQuery = (data: any) => {
  return validateSchema(revenueQuerySchema, data);
};

export const validateReportData = (data: any) => {
  return validateSchema(createReportSchema, data);
};

export const validateReportQuery = (data: any) => {
  return validateSchema(reportQuerySchema, data);
};

// Custom validation functions
export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 1000000000; // 1 พันล้านบาท
};

export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate;
};

export const validatePeriodDays = (startDate: Date, endDate: Date): boolean => {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff <= 365; // ไม่เกิน 1 ปี
};

export const validateReferenceNumber = (referenceNumber: string): boolean => {
  // รูปแบบ: REV-YYYYMMDD-XXXXX
  const pattern = /^REV-\d{8}-\d{5}$/;
  return pattern.test(referenceNumber);
};

export const generateReferenceNumber = (): string => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  const randomStr = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `REV-${dateStr}-${randomStr}`;
}; 