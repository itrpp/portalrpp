# Monitoring & Logging Upgrade - Revenue Service

## 📊 การปรับปรุง Monitoring & Logging

### 🔄 การเปลี่ยนแปลงที่ทำ

#### **1. เพิ่ม Batch Logging Functions**
```typescript
// Batch Creation
export const logBatchCreation = (batchId: string, data: any) => {
  logger.info('Batch created', { 
    batchId, 
    batchName: data.batchName,
    userId: data.userId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString(),
  });
};

// Batch Processing
export const logBatchProcessing = (batchId: string, status: string, meta?: any) => {
  logger.info('Batch processing', { 
    batchId, 
    status,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Batch Completion
export const logBatchCompletion = (batchId: string, result: any) => {
  logger.info('Batch completed', {
    batchId,
    totalFiles: result.totalFiles,
    successFiles: result.successFiles,
    errorFiles: result.errorFiles,
    totalRecords: result.totalRecords,
    processingTime: result.processingTime,
    success: result.success,
    timestamp: new Date().toISOString(),
  });
};

// Batch Error
export const logBatchError = (batchId: string, error: Error, meta?: any) => {
  logger.error('Batch error', {
    batchId,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Batch Progress
export const logBatchProgress = (batchId: string, progress: any) => {
  logger.info('Batch progress', {
    batchId,
    currentFile: progress.currentFile,
    totalFiles: progress.totalFiles,
    progress: progress.progress,
    status: progress.status,
    timestamp: new Date().toISOString(),
  });
};

// Batch File Processing
export const logBatchFileProcessing = (batchId: string, filename: string, result: any) => {
  logger.info('Batch file processing', {
    batchId,
    filename,
    success: result.success,
    processingTime: result.processingTime,
    recordCount: result.recordCount,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  });
};
```

#### **2. เพิ่ม Database Operations Logging**
```typescript
// Database Operation
export const logDatabaseOperation = (operation: string, table: string, meta?: any) => {
  logger.info('Database operation', {
    operation,
    table,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Database Error
export const logDatabaseError = (operation: string, table: string, error: Error) => {
  logger.error('Database error', {
    operation,
    table,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
};

// Database Query
export const logDatabaseQuery = (query: string, params: any, duration: number) => {
  logger.debug('Database query', {
    query,
    params,
    duration,
    timestamp: new Date().toISOString(),
  });
};
```

#### **3. เพิ่ม Validation Logging**
```typescript
// Validation Start
export const logValidationStart = (filename: string, fileType: string) => {
  logger.info('Validation started', {
    filename,
    fileType,
    timestamp: new Date().toISOString(),
  });
};

// Validation Error
export const logValidationError = (filename: string, errors: any[]) => {
  logger.warn('Validation errors', {
    filename,
    errorCount: errors.length,
    errors,
    timestamp: new Date().toISOString(),
  });
};

// Validation Warning
export const logValidationWarning = (filename: string, warnings: string[]) => {
  logger.warn('Validation warnings', {
    filename,
    warningCount: warnings.length,
    warnings,
    timestamp: new Date().toISOString(),
  });
};
```

#### **4. เพิ่ม System Monitoring Logging**
```typescript
// System Metrics
export const logSystemMetrics = (metrics: any) => {
  logger.info('System metrics', {
    ...metrics,
    timestamp: new Date().toISOString(),
  });
};

// Memory Usage
export const logMemoryUsage = (usage: NodeJS.MemoryUsage) => {
  logger.info('Memory usage', {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    timestamp: new Date().toISOString(),
  });
};

// CPU Usage
export const logCpuUsage = (usage: number) => {
  logger.info('CPU usage', {
    usage,
    timestamp: new Date().toISOString(),
  });
};

// Disk Usage
export const logDiskUsage = (usage: any) => {
  logger.info('Disk usage', {
    ...usage,
    timestamp: new Date().toISOString(),
  });
};
```

#### **5. เพิ่ม API Request Logging**
```typescript
// API Response
export const logApiResponse = (method: string, url: string, statusCode: number, responseSize: number) => {
  logger.info('API Response', {
    method,
    url,
    statusCode,
    responseSize,
    timestamp: new Date().toISOString(),
  });
};
```

#### **6. เพิ่ม Security Logging**
```typescript
// Security Event
export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// Authentication Attempt
export const logAuthenticationAttempt = (userId: string, success: boolean, ipAddress: string) => {
  logger.info('Authentication attempt', {
    userId,
    success,
    ipAddress,
    timestamp: new Date().toISOString(),
  });
};

// Authorization Check
export const logAuthorizationCheck = (userId: string, resource: string, allowed: boolean) => {
  logger.info('Authorization check', {
    userId,
    resource,
    allowed,
    timestamp: new Date().toISOString(),
  });
};
```

#### **7. เพิ่ม File Storage Logging**
```typescript
// File Storage Operation
export const logFileStorage = (operation: string, filePath: string, meta?: any) => {
  logger.info('File storage operation', {
    operation,
    filePath,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// File Backup
export const logFileBackup = (sourcePath: string, backupPath: string) => {
  logger.info('File backup created', {
    sourcePath,
    backupPath,
    timestamp: new Date().toISOString(),
  });
};

// File Cleanup
export const logFileCleanup = (filePath: string, reason: string) => {
  logger.info('File cleanup', {
    filePath,
    reason,
    timestamp: new Date().toISOString(),
  });
};
```

#### **8. เพิ่ม Statistics Logging**
```typescript
// Statistics Update
export const logStatisticsUpdate = (type: string, data: any) => {
  logger.info('Statistics updated', {
    type,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Report Generation
export const logReportGeneration = (reportType: string, filename: string, meta?: any) => {
  logger.info('Report generated', {
    reportType,
    filename,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};
```

#### **9. เพิ่ม Error Tracking**
```typescript
// Error with Context
export const logErrorWithContext = (error: Error, context: any) => {
  logger.error('Error with context', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Performance Issue
export const logPerformanceIssue = (operation: string, duration: number, threshold: number) => {
  logger.warn('Performance issue detected', {
    operation,
    duration,
    threshold,
    timestamp: new Date().toISOString(),
  });
};

// Resource Usage
export const logResourceUsage = (resource: string, usage: number, limit: number) => {
  logger.info('Resource usage', {
    resource,
    usage,
    limit,
    percentage: (usage / limit) * 100,
    timestamp: new Date().toISOString(),
  });
};
```

### 🔧 การเปลี่ยนแปลงที่สำคัญ

#### **1. Comprehensive Logging**
- **Batch Operations**: Logging ทุกขั้นตอนของ batch processing
- **Database Operations**: Logging การทำงานกับ database
- **Validation**: Logging การตรวจสอบไฟล์
- **System Monitoring**: Logging สถานะระบบ
- **Security**: Logging การตรวจสอบสิทธิ์
- **File Operations**: Logging การจัดการไฟล์
- **Statistics**: Logging การอัปเดตสถิติ
- **Error Tracking**: Logging ข้อผิดพลาดพร้อม context

#### **2. Structured Logging**
- **Consistent Format**: ใช้รูปแบบ logging เดียวกัน
- **Timestamp**: เพิ่ม timestamp ในทุก log
- **Context**: เพิ่มข้อมูล context ที่เกี่ยวข้อง
- **Error Details**: เก็บรายละเอียดข้อผิดพลาด
- **Performance Metrics**: เก็บข้อมูลประสิทธิภาพ

#### **3. Log Levels**
- **INFO**: ข้อมูลทั่วไป การทำงานปกติ
- **WARN**: คำเตือน ข้อผิดพลาดที่ไม่ร้ายแรง
- **ERROR**: ข้อผิดพลาดที่ร้ายแรง
- **DEBUG**: ข้อมูลสำหรับ debugging

### 📊 ประโยชน์ของการปรับปรุง

#### **1. Monitoring & Debugging**
- **Real-time Monitoring**: ติดตามการทำงานแบบ real-time
- **Error Tracking**: ตรวจสอบข้อผิดพลาดได้ง่าย
- **Performance Analysis**: วิเคราะห์ประสิทธิภาพ
- **Audit Trail**: เก็บประวัติการทำงาน

#### **2. System Management**
- **Health Monitoring**: ติดตามสถานะระบบ
- **Resource Usage**: ติดตามการใช้ทรัพยากร
- **Security Monitoring**: ติดตามความปลอดภัย
- **Capacity Planning**: วางแผนขยายระบบ

#### **3. User Experience**
- **Error Reporting**: แสดงข้อผิดพลาดที่ชัดเจน
- **Progress Tracking**: ติดตามความคืบหน้า
- **Status Updates**: อัปเดตสถานะแบบ real-time
- **Performance Feedback**: แสดงประสิทธิภาพ

### 🛠️ การใช้งาน

#### **1. Batch Processing**
```typescript
// สร้าง batch
logBatchCreation(batchId, {
  batchName: 'Monthly Upload',
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
});

// ประมวลผล batch
logBatchProcessing(batchId, 'processing', {
  totalFiles: 5,
  currentFile: 2,
});

// เสร็จสิ้น batch
logBatchCompletion(batchId, {
  totalFiles: 5,
  successFiles: 4,
  errorFiles: 1,
  totalRecords: 15000,
  processingTime: 5000,
  success: true,
});
```

#### **2. Error Handling**
```typescript
try {
  // การทำงาน
} catch (error) {
  logBatchError(batchId, error, {
    operation: 'file_processing',
    filename: 'PAT6805.DBF',
  });
}
```

#### **3. System Monitoring**
```typescript
// ตรวจสอบ memory usage
logMemoryUsage(process.memoryUsage());

// ตรวจสอบ CPU usage
logCpuUsage(75.5);

// ตรวจสอบ disk usage
logDiskUsage({
  total: 1000000000,
  used: 500000000,
  free: 500000000,
});
```

#### **4. Security Monitoring**
```typescript
// ตรวจสอบ authentication
logAuthenticationAttempt('user123', true, '192.168.1.100');

// ตรวจสอบ authorization
logAuthorizationCheck('user123', '/api/revenue/batches', true);

// ตรวจสอบ security event
logSecurityEvent('suspicious_activity', {
  ipAddress: '192.168.1.100',
  action: 'multiple_failed_logins',
  count: 5,
});
```

### 📈 การ Monitor

#### **1. Log Analysis**
- **Error Patterns**: วิเคราะห์รูปแบบข้อผิดพลาด
- **Performance Trends**: วิเคราะห์แนวโน้มประสิทธิภาพ
- **Usage Patterns**: วิเคราะห์รูปแบบการใช้งาน
- **Security Incidents**: วิเคราะห์เหตุการณ์ความปลอดภัย

#### **2. Alerting**
- **Error Thresholds**: แจ้งเตือนเมื่อข้อผิดพลาดเกินขีดจำกัด
- **Performance Alerts**: แจ้งเตือนเมื่อประสิทธิภาพต่ำ
- **Security Alerts**: แจ้งเตือนเมื่อพบกิจกรรมที่น่าสงสัย
- **Resource Alerts**: แจ้งเตือนเมื่อทรัพยากรใกล้เต็ม

#### **3. Reporting**
- **Daily Reports**: รายงานประจำวัน
- **Weekly Reports**: รายงานประจำสัปดาห์
- **Monthly Reports**: รายงานประจำเดือน
- **Custom Reports**: รายงานตามต้องการ

### 🔄 Migration Steps

#### **1. อัปเดต Services**
- เพิ่ม logging functions ใน services
- ใช้ logging functions แทน console.log
- เพิ่ม error handling ที่ครอบคลุม
- เพิ่ม performance monitoring

#### **2. อัปเดต Middleware**
- เพิ่ม request logging
- เพิ่ม response logging
- เพิ่ม error logging
- เพิ่ม performance logging

#### **3. อัปเดต Configuration**
- ตั้งค่า log levels
- ตั้งค่า log rotation
- ตั้งค่า log storage
- ตั้งค่า log monitoring

### ✅ ผลลัพธ์

- ✅ **Batch Logging Functions**: เพิ่มสำเร็จ
- ✅ **Database Logging**: เพิ่มสำเร็จ
- ✅ **Validation Logging**: เพิ่มสำเร็จ
- ✅ **System Monitoring**: เพิ่มสำเร็จ
- ✅ **Security Logging**: เพิ่มสำเร็จ
- ✅ **File Storage Logging**: เพิ่มสำเร็จ
- ✅ **Statistics Logging**: เพิ่มสำเร็จ
- ✅ **Error Tracking**: เพิ่มสำเร็จ
- ✅ **Structured Logging**: ปรับปรุงสำเร็จ
- ✅ **Comprehensive Coverage**: ครอบคลุมทุกส่วน

### 📝 หมายเหตุ

- **Log Rotation**: ใช้ winston-daily-rotate-file สำหรับ log rotation
- **Log Levels**: ใช้ log levels ที่เหมาะสม
- **Performance Impact**: ระวังผลกระทบต่อประสิทธิภาพ
- **Storage Management**: จัดการพื้นที่จัดเก็บ logs

### 🔗 การเชื่อมโยง

- **Frontend**: ใช้ logs สำหรับ debugging
- **API Gateway**: ใช้ logs สำหรับ monitoring
- **Auth Service**: ใช้ logs สำหรับ security
- **Statistics**: ใช้ logs สำหรับ analysis 