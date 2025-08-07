# Error Handling & Validation Upgrade - Revenue Service

## 📊 การปรับปรุง Error Handling และ Validation

### 🔄 การเปลี่ยนแปลงที่ทำ

#### **1. ปรับปรุง Error Handler**

##### **เพิ่ม Error Types ใหม่**
```typescript
export class BatchError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'BATCH_ERROR', details);
  }
}

export class AuthenticationError extends RevenueServiceError {
  constructor(message: string = 'ไม่ได้รับอนุญาตให้เข้าถึง', details?: any) {
    super(message, 401, true, 'AUTHENTICATION_ERROR', details);
  }
}

export class AuthorizationError extends RevenueServiceError {
  constructor(message: string = 'ไม่มีสิทธิ์ในการเข้าถึง', details?: any) {
    super(message, 403, true, 'AUTHORIZATION_ERROR', details);
  }
}

export class RateLimitError extends RevenueServiceError {
  constructor(message: string = 'เกินขีดจำกัดการเรียก API', details?: any) {
    super(message, 429, true, 'RATE_LIMIT_ERROR', details);
  }
}

export class ResourceNotFoundError extends RevenueServiceError {
  constructor(resource: string, details?: any) {
    super(`ไม่พบ ${resource}`, 404, true, 'RESOURCE_NOT_FOUND', details);
  }
}

export class ConflictError extends RevenueServiceError {
  constructor(message: string, details?: any) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

export class ServiceUnavailableError extends RevenueServiceError {
  constructor(message: string = 'บริการไม่พร้อมใช้งาน', details?: any) {
    super(message, 503, true, 'SERVICE_UNAVAILABLE', details);
  }
}
```

##### **ปรับปรุง Error Handler Middleware**
```typescript
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // ตรวจสอบประเภทของ error
  if (error instanceof RevenueServiceError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ส่งมา';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
    code = 'UPLOAD_ERROR';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
    code = 'SYNTAX_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'รูปแบบข้อมูลไม่ถูกต้อง';
    code = 'CAST_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'PrismaClientKnownRequestError') {
    statusCode = 500;
    message = 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล';
    code = 'DATABASE_ERROR';
  }

  // Log error
  logError('Error occurred', error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
    code,
    details,
  });

  // สร้าง error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    error: config.server.nodeEnv === 'development' ? error.message : undefined,
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] as string,
  };

  res.status(statusCode).json(errorResponse);
};
```

##### **เพิ่ม Error Handler Functions**
```typescript
// Batch error handler
export const batchErrorHandler = (error: Error, batchId: string, operation: string) => {
  logError(`Batch error during ${operation} for batch: ${batchId}`, error);
  throw new BatchError(`เกิดข้อผิดพลาดในการจัดการ batch: ${operation}`, {
    batchId,
    operation,
    originalError: error.message
  });
};

// Rate limit error handler
export const rateLimitErrorHandler = (limit: number, windowMs: number) => {
  throw new RateLimitError(`เกินขีดจำกัดการเรียก API (${limit} requests per ${windowMs}ms)`, {
    limit,
    windowMs
  });
};

// Resource not found error handler
export const resourceNotFoundErrorHandler = (resource: string, id?: string) => {
  const message = id ? `ไม่พบ ${resource} ที่มี ID: ${id}` : `ไม่พบ ${resource}`;
  throw new ResourceNotFoundError(message, { resource, id });
};

// Conflict error handler
export const conflictErrorHandler = (message: string, details?: any) => {
  throw new ConflictError(message, details);
};

// Service unavailable error handler
export const serviceUnavailableErrorHandler = (service: string) => {
  throw new ServiceUnavailableError(`บริการ ${service} ไม่พร้อมใช้งาน`, { service });
};

// Create batch error summary
export const createBatchErrorSummary = (batchId: string, errors: ProcessingError[]): BatchErrorSummary => {
  const errorTypes = {
    validation: 0,
    processing: 0,
    system: 0,
    file: 0,
    database: 0,
  };

  let retryableErrors = 0;

  errors.forEach(error => {
    if (error.type in errorTypes) {
      errorTypes[error.type as keyof typeof errorTypes]++;
    }
    if (error.retryable) {
      retryableErrors++;
    }
  });

  return {
    batchId,
    totalErrors: errors.length,
    errors,
    errorTypes,
    canRetry: retryableErrors > 0,
    retryableErrors,
  };
};
```

#### **2. สร้าง Validation Service**

##### **Validation Service Interface**
```typescript
export interface IValidationService {
  validateFile(file: Express.Multer.File): Promise<ValidationResult>;
  validateBatch(batchId: string, files: Express.Multer.File[]): Promise<BatchValidationResult>;
  validateField(value: any, rule: FileValidationRule): ValidationResult;
  validateRequired(value: any, fieldName: string): ValidationError[];
  validateType(value: any, expectedType: string, fieldName: string): ValidationError[];
  validateLength(value: string, minLength?: number, maxLength?: number, fieldName?: string): ValidationError[];
  validateRange(value: number, minValue?: number, maxValue?: number, fieldName?: string): ValidationError[];
  validatePattern(value: string, pattern: string, fieldName?: string): ValidationError[];
  validateCustom(value: any, validator: (value: any) => boolean, fieldName?: string): ValidationError[];
}
```

##### **File Validation Rules**
```typescript
// File validation rules
this.rules.set('file', [
  {
    field: 'filename',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 255,
    errorMessage: 'ชื่อไฟล์ไม่ถูกต้อง',
  },
  {
    field: 'size',
    required: true,
    type: 'number',
    minValue: 1,
    maxValue: 52428800, // 50MB
    errorMessage: 'ขนาดไฟล์ไม่ถูกต้อง',
  },
  {
    field: 'mimetype',
    required: true,
    type: 'string',
    pattern: '^application/(octet-stream|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet)$',
    errorMessage: 'ประเภทไฟล์ไม่ถูกต้อง',
  },
]);
```

##### **Batch Validation Rules**
```typescript
// Batch validation rules
this.rules.set('batch', [
  {
    field: 'batchName',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 255,
    errorMessage: 'ชื่อ batch ไม่ถูกต้อง',
  },
  {
    field: 'files',
    required: true,
    type: 'array',
    minValue: 1,
    maxValue: 10,
    errorMessage: 'จำนวนไฟล์ไม่ถูกต้อง',
  },
]);
```

#### **3. ปรับปรุง Validation Middleware**

##### **File Upload Validation**
```typescript
export const validateUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new FileValidationError('ไม่พบไฟล์ที่อัปโหลด', { field: 'file' });
    }

    // ตรวจสอบขนาดไฟล์
    const maxSize = 52428800; // 50MB
    if (req.file.size > maxSize) {
      throw new FileValidationError(
        `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
        { filename: req.file.originalname, size: req.file.size, maxSize }
      );
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['.dbf', '.xls', '.xlsx'];
    const fileExtension = getFileExtension(req.file.originalname);
    if (!allowedTypes.includes(fileExtension.toLowerCase())) {
      throw new FileValidationError(
        `ประเภทไฟล์ไม่ถูกต้อง (${allowedTypes.join(', ')})`,
        { filename: req.file.originalname, extension: fileExtension, allowedTypes }
      );
    }

    next();
  } catch (error) {
    logError('File upload validation error', error as Error);
    next(error);
  }
};
```

##### **Batch Upload Validation**
```typescript
export const validateBatchUpload = (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw new BatchError('ไม่พบไฟล์ที่อัปโหลด', { field: 'files' });
    }

    if (files.length > 10) {
      throw new BatchError('จำนวนไฟล์เกินขีดจำกัด (สูงสุด 10 ไฟล์)', {
        fileCount: files.length,
        maxFiles: 10
      });
    }

    // ตรวจสอบไฟล์แต่ละไฟล์
    for (const file of files) {
      const maxSize = 52428800; // 50MB
      if (file.size > maxSize) {
        throw new BatchError(
          `ไฟล์ ${file.originalname} มีขนาดใหญ่เกินไป (สูงสุด ${maxSize} bytes)`,
          { filename: file.originalname, size: file.size, maxSize }
        );
      }

      const allowedTypes = ['.dbf', '.xls', '.xlsx'];
      const fileExtension = getFileExtension(file.originalname);
      if (!allowedTypes.includes(fileExtension.toLowerCase())) {
        throw new BatchError(
          `ไฟล์ ${file.originalname} ไม่ใช่ประเภทที่อนุญาต (${allowedTypes.join(', ')})`,
          { filename: file.originalname, extension: fileExtension, allowedTypes }
        );
      }
    }

    next();
  } catch (error) {
    logError('Batch upload validation error', error as Error);
    next(error);
  }
};
```

##### **Query Parameters Validation**
```typescript
export const validateQueryParams = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, userId, startDate, endDate } = req.query;

    // ตรวจสอบ page
    if (page !== undefined) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new FileValidationError('page ต้องเป็นตัวเลขที่มากกว่า 0', { field: 'page', value: page });
      }
    }

    // ตรวจสอบ limit
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new FileValidationError('limit ต้องเป็นตัวเลขระหว่าง 1-100', { field: 'limit', value: limit });
      }
    }

    // ตรวจสอบ status
    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'validation_failed', 'success', 'error', 'partial'];
      if (!validStatuses.includes(status as string)) {
        throw new FileValidationError(`status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`, { field: 'status', value: status });
      }
    }

    // ตรวจสอบ userId
    if (userId !== undefined && typeof userId !== 'string') {
      throw new FileValidationError('userId ต้องเป็นข้อความ', { field: 'userId', value: userId });
    }

    // ตรวจสอบ startDate
    if (startDate !== undefined) {
      const startDateObj = new Date(startDate as string);
      if (isNaN(startDateObj.getTime())) {
        throw new FileValidationError('startDate ต้องเป็นวันที่ที่ถูกต้อง', { field: 'startDate', value: startDate });
      }
    }

    // ตรวจสอบ endDate
    if (endDate !== undefined) {
      const endDateObj = new Date(endDate as string);
      if (isNaN(endDateObj.getTime())) {
        throw new FileValidationError('endDate ต้องเป็นวันที่ที่ถูกต้อง', { field: 'endDate', value: endDate });
      }
    }

    // ตรวจสอบ startDate และ endDate ร่วมกัน
    if (startDate && endDate) {
      const startDateObj = new Date(startDate as string);
      const endDateObj = new Date(endDate as string);
      if (startDateObj > endDateObj) {
        throw new FileValidationError('startDate ต้องไม่เกิน endDate', { startDate, endDate });
      }
    }

    next();
  } catch (error) {
    logError('Query parameters validation error', error as Error);
    next(error);
  }
};
```

##### **Request Body Validation**
```typescript
export const validateRequestBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchName, userId, ipAddress, userAgent } = req.body;

    // ตรวจสอบ batchName
    if (batchName !== undefined) {
      if (typeof batchName !== 'string') {
        throw new FileValidationError('batchName ต้องเป็นข้อความ', { field: 'batchName', value: batchName });
      }
      if (batchName.trim().length === 0) {
        throw new FileValidationError('batchName ต้องไม่เป็นค่าว่าง', { field: 'batchName', value: batchName });
      }
      if (batchName.length > 255) {
        throw new FileValidationError('batchName ต้องไม่เกิน 255 ตัวอักษร', { field: 'batchName', value: batchName });
      }
    }

    // ตรวจสอบ userId
    if (userId !== undefined && typeof userId !== 'string') {
      throw new FileValidationError('userId ต้องเป็นข้อความ', { field: 'userId', value: userId });
    }

    // ตรวจสอบ ipAddress
    if (ipAddress !== undefined && typeof ipAddress !== 'string') {
      throw new FileValidationError('ipAddress ต้องเป็นข้อความ', { field: 'ipAddress', value: ipAddress });
    }

    // ตรวจสอบ userAgent
    if (userAgent !== undefined && typeof userAgent !== 'string') {
      throw new FileValidationError('userAgent ต้องเป็นข้อความ', { field: 'userAgent', value: userAgent });
    }

    next();
  } catch (error) {
    logError('Request body validation error', error as Error);
    next(error);
  }
};
```

##### **ID Validation**
```typescript
export const validateFileId = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new FileValidationError('ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    if (id.trim().length === 0) {
      throw new FileValidationError('ID ต้องไม่เป็นค่าว่าง', { field: 'id', value: id });
    }

    // ตรวจสอบรูปแบบ ID (CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    if (!cuidPattern.test(id)) {
      throw new FileValidationError('รูปแบบ ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    next();
  } catch (error) {
    logError('File ID validation error', error as Error);
    next(error);
  }
};

export const validateBatchId = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new BatchError('Batch ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    if (id.trim().length === 0) {
      throw new BatchError('Batch ID ต้องไม่เป็นค่าว่าง', { field: 'id', value: id });
    }

    // ตรวจสอบรูปแบบ Batch ID (CUID format)
    const cuidPattern = /^c[a-z0-9]{24}$/;
    if (!cuidPattern.test(id)) {
      throw new BatchError('รูปแบบ Batch ID ไม่ถูกต้อง', { field: 'id', value: id });
    }

    next();
  } catch (error) {
    logError('Batch ID validation error', error as Error);
    next(error);
  }
};
```

##### **Validation Chains**
```typescript
export const validateBatchCreate = [
  body('batchName')
    .isString()
    .withMessage('batchName ต้องเป็นข้อความ')
    .isLength({ min: 1, max: 255 })
    .withMessage('batchName ต้องมีความยาว 1-255 ตัวอักษร'),
  body('userId')
    .optional()
    .isString()
    .withMessage('userId ต้องเป็นข้อความ'),
  body('ipAddress')
    .optional()
    .isString()
    .withMessage('ipAddress ต้องเป็นข้อความ'),
  body('userAgent')
    .optional()
    .isString()
    .withMessage('userAgent ต้องเป็นข้อความ'),
  validateRequest,
];

export const validateBatchUpdate = [
  body('batchName')
    .optional()
    .isString()
    .withMessage('batchName ต้องเป็นข้อความ')
    .isLength({ min: 1, max: 255 })
    .withMessage('batchName ต้องมีความยาว 1-255 ตัวอักษร'),
  body('totalFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('successFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('successFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('errorFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('errorFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('processingFiles')
    .optional()
    .isInt({ min: 0 })
    .withMessage('processingFiles ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('totalRecords')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalRecords ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('totalSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('totalSize ต้องเป็นตัวเลขที่ไม่ติดลบ'),
  body('status')
    .optional()
    .isIn(['success', 'error', 'processing', 'partial'])
    .withMessage('status ต้องเป็นหนึ่งใน: success, error, processing, partial'),
  validateRequest,
];

export const validateBatchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page ต้องเป็นตัวเลขที่มากกว่า 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit ต้องเป็นตัวเลขระหว่าง 1-100'),
  query('status')
    .optional()
    .isIn(['success', 'error', 'processing', 'partial'])
    .withMessage('status ต้องเป็นหนึ่งใน: success, error, processing, partial'),
  query('userId')
    .optional()
    .isString()
    .withMessage('userId ต้องเป็นข้อความ'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate ต้องเป็นวันที่ที่ถูกต้อง'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate ต้องเป็นวันที่ที่ถูกต้อง'),
  validateRequest,
];
```

### 🔧 การเปลี่ยนแปลงที่สำคัญ

#### **1. Error Handling**
- **Error Types**: เพิ่ม error types ใหม่สำหรับ batch, authentication, authorization, rate limiting, resource not found, conflict, service unavailable
- **Error Details**: เพิ่ม details field สำหรับเก็บข้อมูลเพิ่มเติมของ error
- **Error Codes**: เพิ่ม error codes สำหรับ categorizing errors
- **Error Logging**: ปรับปรุงการ log errors ให้มีข้อมูลครบถ้วน

#### **2. Validation**
- **Validation Service**: สร้าง Validation Service ใหม่สำหรับจัดการการตรวจสอบข้อมูล
- **Validation Rules**: กำหนด rules สำหรับการตรวจสอบไฟล์และ batch
- **Field Validation**: เพิ่ม field validation methods (required, type, length, range, pattern, custom)
- **Batch Validation**: เพิ่ม batch validation สำหรับตรวจสอบไฟล์หลายไฟล์

#### **3. Middleware**
- **File Upload Validation**: ปรับปรุงการตรวจสอบไฟล์ที่อัปโหลด
- **Batch Upload Validation**: เพิ่มการตรวจสอบ batch upload
- **Query Parameters Validation**: ปรับปรุงการตรวจสอบ query parameters
- **Request Body Validation**: เพิ่มการตรวจสอบ request body
- **ID Validation**: เพิ่มการตรวจสอบ ID format

### 📊 ประโยชน์ของการปรับปรุง

#### **1. Error Handling**
- **Better Error Messages**: ข้อความ error ที่ชัดเจนและเข้าใจง่าย
- **Error Categorization**: จัดหมวดหมู่ errors ตามประเภท
- **Error Details**: เก็บรายละเอียดของ error สำหรับ debugging
- **Error Recovery**: รองรับการกู้คืนจาก errors

#### **2. Validation**
- **Comprehensive Validation**: ตรวจสอบข้อมูลอย่างครอบคลุม
- **Custom Validation Rules**: กำหนด rules เองได้
- **Batch Validation**: ตรวจสอบไฟล์หลายไฟล์พร้อมกัน
- **Field-level Validation**: ตรวจสอบแต่ละ field แยกกัน

#### **3. Developer Experience**
- **Clear Error Messages**: ข้อความ error ที่ชัดเจน
- **Error Codes**: ใช้ error codes สำหรับ categorizing
- **Validation Feedback**: ให้ feedback ที่ชัดเจนเมื่อ validation fail
- **Debugging Support**: รองรับการ debugging

### 🛠️ การใช้งาน

#### **1. Error Handling**
```typescript
// จัดการ batch error
try {
  await processBatch(batchId);
} catch (error) {
  batchErrorHandler(error, batchId, 'processing');
}

// จัดการ rate limit error
if (requestCount > limit) {
  rateLimitErrorHandler(limit, windowMs);
}

// จัดการ resource not found error
if (!resource) {
  resourceNotFoundErrorHandler('batch', id);
}
```

#### **2. Validation**
```typescript
// ตรวจสอบไฟล์
const validationService = new ValidationService();
const fileValidation = await validationService.validateFile(file);

if (!fileValidation.isValid) {
  throw new FileValidationError('ไฟล์ไม่ผ่านการตรวจสอบ', {
    errors: fileValidation.errors
  });
}

// ตรวจสอบ batch
const batchValidation = await validationService.validateBatch(batchId, files);

if (!batchValidation.isValid) {
  throw new BatchError('Batch ไม่ผ่านการตรวจสอบ', {
    errors: batchValidation.errors
  });
}
```

#### **3. Middleware**
```typescript
// ใช้ validation middleware
router.post('/upload', validateUploadedFile, uploadHandler);
router.post('/upload/batch', validateBatchUpload, batchUploadHandler);
router.get('/batches', validateQueryParams, getBatchesHandler);
router.post('/batches', validateBatchCreate, createBatchHandler);
```

### 📈 การ Monitor

#### **1. Error Monitoring**
- **Error Types**: ติดตามประเภทของ errors
- **Error Frequency**: ติดตามความถี่ของ errors
- **Error Impact**: ติดตามผลกระทบของ errors
- **Error Recovery**: ติดตามการกู้คืนจาก errors

#### **2. Validation Monitoring**
- **Validation Success Rate**: ติดตามอัตราความสำเร็จของการ validation
- **Validation Errors**: ติดตาม validation errors
- **Field-level Errors**: ติดตาม errors ในแต่ละ field
- **Batch Validation**: ติดตาม batch validation results

### 🔄 Migration Steps

#### **1. อัปเดต Existing Code**
- แทนที่ error handling เดิมด้วย error types ใหม่
- เพิ่ม validation rules ที่จำเป็น
- อัปเดต middleware ให้ใช้ validation ใหม่
- เพิ่ม error logging ที่ครอบคลุม

#### **2. เพิ่ม New Features**
- เพิ่ม validation service
- เพิ่ม error types ใหม่
- เพิ่ม validation middleware
- เพิ่ม error handler functions

#### **3. อัปเดต Documentation**
- อัปเดต error handling documentation
- เพิ่ม validation examples
- อธิบาย error types และ codes
- เพิ่ม troubleshooting guide

### ✅ ผลลัพธ์

- ✅ **Error Types**: เพิ่มสำเร็จ
- ✅ **Error Handler**: ปรับปรุงสำเร็จ
- ✅ **Validation Service**: สร้างสำเร็จ
- ✅ **Validation Middleware**: ปรับปรุงสำเร็จ
- ✅ **Error Logging**: ปรับปรุงสำเร็จ
- ✅ **Error Recovery**: เพิ่มสำเร็จ
- ✅ **Validation Rules**: เพิ่มสำเร็จ
- ✅ **Error Messages**: ปรับปรุงสำเร็จ

### 📝 หมายเหตุ

- **Backward Compatibility**: รองรับ existing error handling
- **Error Categorization**: ใช้ error codes สำหรับ categorizing
- **Validation Rules**: กำหนด rules ตามความต้องการ
- **Error Details**: เก็บรายละเอียดสำหรับ debugging

### 🔗 การเชื่อมโยง

- **Frontend**: ใช้ error messages และ codes
- **API Gateway**: ใช้ validation rules
- **Database**: ใช้ error handling สำหรับ database errors
- **Logging**: ใช้ error logging สำหรับ monitoring 