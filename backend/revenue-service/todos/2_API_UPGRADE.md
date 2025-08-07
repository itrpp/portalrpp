# API Endpoints Upgrade - Revenue Service

## 📊 การปรับปรุง API Endpoints

### 🔄 การเปลี่ยนแปลงที่ทำ

#### **1. เพิ่ม Batch Management Endpoints**

##### **GET /api/revenue/batches**
```typescript
// ดึงรายการ batches
GET /api/revenue/batches?page=1&limit=20&status=processing&userId=user123

// Response
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "batch-123",
        "batchName": "Monthly Upload - January 2024",
        "uploadDate": "2024-01-15T10:30:00Z",
        "totalFiles": 5,
        "successFiles": 3,
        "errorFiles": 1,
        "processingFiles": 1,
        "totalRecords": 15000,
        "totalSize": 5120000,
        "status": "partial",
        "userId": "user123",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "ดึงรายการ batches สำเร็จ",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

##### **POST /api/revenue/batches**
```typescript
// สร้าง batch ใหม่
POST /api/revenue/batches
Content-Type: application/json

{
  "batchName": "Monthly Upload - January 2024",
  "userId": "user123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}

// Response
{
  "success": true,
  "data": {
    "id": "batch-123",
    "batchName": "Monthly Upload - January 2024",
    "uploadDate": "2024-01-15T10:30:00Z",
    "totalFiles": 0,
    "successFiles": 0,
    "errorFiles": 0,
    "processingFiles": 0,
    "totalRecords": 0,
    "totalSize": 0,
    "status": "processing",
    "userId": "user123",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "สร้าง batch สำเร็จ",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

##### **GET /api/revenue/batches/:id**
```typescript
// ดึงข้อมูล batch
GET /api/revenue/batches/batch-123

// Response
{
  "success": true,
  "data": {
    "id": "batch-123",
    "batchName": "Monthly Upload - January 2024",
    "uploadDate": "2024-01-15T10:30:00Z",
    "totalFiles": 5,
    "successFiles": 3,
    "errorFiles": 1,
    "processingFiles": 1,
    "totalRecords": 15000,
    "totalSize": 5120000,
    "status": "partial",
    "userId": "user123",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z",
    "files": [
      {
        "id": "file-123",
        "filename": "PAT6805.DBF",
        "originalName": "PAT6805.DBF",
        "fileType": "DBF",
        "fileSize": 1024000,
        "filePath": "/uploads/dbf/2024-01-15/uuid-123/PAT6805.DBF",
        "uploadDate": "2024-01-15T10:30:00Z",
        "status": "completed",
        "batchId": "batch-123",
        "userId": "user123",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "isValid": true,
        "totalRecords": 5000,
        "validRecords": 4800,
        "invalidRecords": 200,
        "processedRecords": 4800,
        "skippedRecords": 0,
        "processingTime": 5000,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:05Z"
      }
    ]
  },
  "message": "ดึงข้อมูล batch สำเร็จ",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

##### **DELETE /api/revenue/batches/:id**
```typescript
// ลบ batch
DELETE /api/revenue/batches/batch-123

// Response
{
  "success": true,
  "data": { "id": "batch-123" },
  "message": "ลบ batch สำเร็จ",
  "timestamp": "2024-01-15T10:45:00Z"
}
```

##### **GET /api/revenue/batches/:id/files**
```typescript
// ดึงไฟล์ใน batch
GET /api/revenue/batches/batch-123/files?page=1&limit=20&status=completed&fileType=DBF

// Response
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-123",
      "batchName": "Monthly Upload - January 2024",
      "uploadDate": "2024-01-15T10:30:00Z",
      "totalFiles": 5,
      "successFiles": 3,
      "errorFiles": 1,
      "processingFiles": 1,
      "totalRecords": 15000,
      "totalSize": 5120000,
      "status": "partial",
      "userId": "user123",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    },
    "files": [
      {
        "id": "file-123",
        "filename": "PAT6805.DBF",
        "originalName": "PAT6805.DBF",
        "fileType": "DBF",
        "fileSize": 1024000,
        "filePath": "/uploads/dbf/2024-01-15/uuid-123/PAT6805.DBF",
        "uploadDate": "2024-01-15T10:30:00Z",
        "status": "completed",
        "batchId": "batch-123",
        "userId": "user123",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "isValid": true,
        "totalRecords": 5000,
        "validRecords": 4800,
        "invalidRecords": 200,
        "processedRecords": 4800,
        "skippedRecords": 0,
        "processingTime": 5000,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:05Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "ดึงไฟล์ใน batch สำเร็จ",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

#### **2. ปรับปรุง Upload Endpoint**

##### **POST /api/revenue/upload**
```typescript
// อัปโหลดไฟล์พร้อม batch support
POST /api/revenue/upload
Content-Type: multipart/form-data

// Form Data
file: [ไฟล์]
batchId: batch-123 (optional)

// Response
{
  "success": true,
  "data": {
    "success": true,
    "message": "ประมวลผลไฟล์สำเร็จ",
    "filename": "PAT6805.DBF",
    "fileId": "file-123",
    "fileSize": 1024000,
    "uploadDate": "2024-01-15T10:30:00Z",
    "errors": []
  },
  "message": "อัปโหลดไฟล์สำเร็จ",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_1234567890_abc123"
}
```

#### **3. เพิ่ม Batch Upload Endpoint**

##### **POST /api/revenue/upload/batch**
```typescript
// อัปโหลดหลายไฟล์เป็น batch
POST /api/revenue/upload/batch
Content-Type: multipart/form-data

// Form Data
files: [ไฟล์1, ไฟล์2, ไฟล์3, ...] (สูงสุด 10 ไฟล์)
batchName: "Monthly Upload - January 2024" (optional)

// Response
{
  "success": true,
  "data": {
    "batchId": "batch-123",
    "batchName": "Monthly Upload - January 2024",
    "totalFiles": 5,
    "successFiles": 3,
    "errorFiles": 1,
    "results": [
      {
        "filename": "PAT6805.DBF",
        "success": true,
        "message": "ประมวลผลไฟล์สำเร็จ",
        "fileId": "file-123",
        "fileSize": 1024000,
        "errors": []
      },
      {
        "filename": "ADP6805.DBF",
        "success": false,
        "message": "ไฟล์ไม่ผ่านการตรวจสอบ",
        "errors": ["Invalid file format", "Missing required fields"]
      }
    ]
  },
  "message": "อัปโหลด batch สำเร็จ (3/5 ไฟล์)",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### 🔧 การเปลี่ยนแปลงที่สำคัญ

#### **1. Batch Management**
- **GET /batches**: ดึงรายการ batches พร้อม pagination และ filtering
- **POST /batches**: สร้าง batch ใหม่
- **GET /batches/:id**: ดึงข้อมูล batch พร้อมไฟล์ที่เกี่ยวข้อง
- **DELETE /batches/:id**: ลบ batch และไฟล์ที่เกี่ยวข้อง
- **GET /batches/:id/files**: ดึงไฟล์ใน batch พร้อม filtering

#### **2. Upload Enhancement**
- **POST /upload**: รองรับ batch ID เพื่อเชื่อมโยงกับ batch
- **POST /upload/batch**: อัปโหลดหลายไฟล์พร้อมกันเป็น batch
- **Batch Statistics**: อัปเดตสถิติของ batch อัตโนมัติ
- **Error Handling**: จัดการข้อผิดพลาดระดับ batch

#### **3. Response Enhancement**
- **Consistent Format**: ใช้รูปแบบ response เดียวกัน
- **Error Messages**: แสดงข้อผิดพลาดที่ชัดเจน
- **Request ID**: เพิ่ม request ID สำหรับ tracking
- **Timestamps**: เพิ่ม timestamp ในทุก response

### 📊 ประโยชน์ของการปรับปรุง

#### **1. Batch Processing**
- **จัดการไฟล์หลายไฟล์**: อัปโหลดและประมวลผลไฟล์หลายไฟล์พร้อมกัน
- **ติดตามสถานะ**: ดูสถานะของ batch ทั้งหมด
- **สถิติแบบ batch**: เก็บสถิติของ batch แยกจากไฟล์เดี่ยว

#### **2. User Experience**
- **Batch Progress**: แสดงความคืบหน้าของ batch
- **Batch History**: ดูประวัติการอัปโหลดแบบ batch
- **Batch Report**: สร้างรายงานของ batch
- **Error Details**: แสดงรายละเอียดข้อผิดพลาด

#### **3. System Management**
- **Batch Organization**: จัดระเบียบไฟล์ตาม batch
- **Resource Management**: จัดการทรัพยากรอย่างมีประสิทธิภาพ
- **Monitoring**: ติดตามการทำงานของระบบ
- **Audit Trail**: เก็บประวัติการทำงาน

### 🛠️ การใช้งาน

#### **1. สร้าง Batch และอัปโหลดไฟล์**
```typescript
// 1. สร้าง batch
const batchResponse = await fetch('/api/revenue/batches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchName: 'Monthly Upload - January 2024',
    userId: 'user123'
  })
});

const batch = await batchResponse.json();

// 2. อัปโหลดไฟล์ใน batch
const formData = new FormData();
formData.append('file', file);
formData.append('batchId', batch.data.id);

const uploadResponse = await fetch('/api/revenue/upload', {
  method: 'POST',
  body: formData
});
```

#### **2. อัปโหลดหลายไฟล์พร้อมกัน**
```typescript
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('batchName', 'Monthly Upload - January 2024');

const batchUploadResponse = await fetch('/api/revenue/upload/batch', {
  method: 'POST',
  body: formData
});
```

#### **3. ติดตามสถานะ Batch**
```typescript
// ดึงรายการ batches
const batchesResponse = await fetch('/api/revenue/batches?status=processing');

// ดึงข้อมูล batch เฉพาะ
const batchResponse = await fetch('/api/revenue/batches/batch-123');

// ดึงไฟล์ใน batch
const filesResponse = await fetch('/api/revenue/batches/batch-123/files?status=completed');
```

### 📈 การ Monitor

#### **1. Batch Statistics**
- **Total Files**: จำนวนไฟล์ทั้งหมดใน batch
- **Success Files**: จำนวนไฟล์ที่สำเร็จ
- **Error Files**: จำนวนไฟล์ที่ล้มเหลว
- **Processing Files**: จำนวนไฟล์ที่กำลังประมวลผล

#### **2. Batch Status**
- **SUCCESS**: ทุกไฟล์สำเร็จ
- **ERROR**: ทุกไฟล์ล้มเหลว
- **PROCESSING**: กำลังประมวลผล
- **PARTIAL**: บางไฟล์สำเร็จ บางไฟล์ล้มเหลว

### 🔄 Migration Steps

#### **1. อัปเดต Frontend**
- เพิ่ม batch management UI
- รองรับ batch upload
- แสดง batch progress
- จัดการ batch errors

#### **2. อัปเดต API Gateway**
- เพิ่ม batch endpoints
- รองรับ batch routing
- จัดการ batch authentication

#### **3. อัปเดต Documentation**
- อัปเดต API documentation
- เพิ่ม batch examples
- อธิบาย batch workflow

### ✅ ผลลัพธ์

- ✅ **Batch Management Endpoints**: เพิ่มสำเร็จ
- ✅ **Upload Enhancement**: ปรับปรุงสำเร็จ
- ✅ **Batch Upload**: เพิ่มสำเร็จ
- ✅ **Error Handling**: ปรับปรุงสำเร็จ
- ✅ **Response Format**: ปรับปรุงสำเร็จ

### 📝 หมายเหตุ

- **Rate Limiting**: ใช้ rate limiting สำหรับ batch upload
- **File Validation**: ตรวจสอบไฟล์ก่อนประมวลผล
- **Error Recovery**: รองรับการกู้คืนจากข้อผิดพลาด
- **Progress Tracking**: ติดตามความคืบหน้าของ batch

### 🔗 การเชื่อมโยง

- **Frontend**: รองรับการแสดงผล batch
- **API Gateway**: รองรับ batch endpoints
- **Auth Service**: ตรวจสอบสิทธิ์การเข้าถึง batch
- **Statistics**: รวมสถิติของ batch 