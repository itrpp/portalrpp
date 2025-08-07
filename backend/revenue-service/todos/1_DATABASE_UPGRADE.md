# Database Schema Upgrade - Revenue Service

## 📊 การปรับปรุง Database Schema

### 🔄 การเปลี่ยนแปลงที่ทำ

#### **1. เพิ่ม UploadBatch Model**
```prisma
model UploadBatch {
  id          String   @id @default(cuid())
  batchName   String
  uploadDate  DateTime @default(now())
  
  // File counts
  totalFiles      Int @default(0)
  successFiles    Int @default(0)
  errorFiles      Int @default(0)
  processingFiles Int @default(0)
  
  // Statistics
  totalRecords    Int @default(0)
  totalSize       Int @default(0) // bytes
  
  // Status
  status          String @default("processing") // SUCCESS, ERROR, PROCESSING, PARTIAL
  
  // Relations
  files           UploadRecord[]
  userId          String?
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("upload_batches")
}
```

#### **2. ปรับปรุง UploadRecord Model**
```prisma
model UploadRecord {
  id          String   @id @default(cuid())
  filename    String
  originalName String
  fileType    String   // DBF, REP, STM
  fileSize    Int
  filePath    String
  uploadDate  DateTime @default(now())
  processedAt DateTime?
  status      String   @default("pending") // PENDING, PROCESSING, COMPLETED, FAILED, VALIDATION_FAILED
  
  // Batch relation
  batchId     String?
  batch       UploadBatch? @relation(fields: [batchId], references: [id], onDelete: Cascade)
  
  // User info
  userId      String?
  ipAddress   String?
  userAgent   String?
  
  // Validation results
  isValid     Boolean?
  errors      String? // JSON string of errors
  warnings    String? // JSON string of warnings
  
  // Processing results
  totalRecords    Int?
  validRecords    Int?
  invalidRecords  Int?
  processedRecords Int?
  skippedRecords  Int?
  processingTime   Int? // milliseconds
  
  // Error message for frontend
  errorMessage String?
  
  // Metadata
  metadata    String? // JSON string of additional data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  processingHistory ProcessingHistory[]
  
  @@map("upload_records")
}
```

### 🔧 การเปลี่ยนแปลงที่สำคัญ

#### **1. เพิ่ม Batch Management**
- **UploadBatch Model**: จัดการกลุ่มไฟล์ที่อัปโหลดพร้อมกัน
- **Batch Status**: ติดตามสถานะของ batch (SUCCESS, ERROR, PROCESSING, PARTIAL)
- **Batch Statistics**: เก็บสถิติของ batch (จำนวนไฟล์, ขนาดไฟล์, จำนวน records)

#### **2. ปรับปรุง UploadRecord**
- **Batch Relation**: เชื่อมโยงกับ UploadBatch
- **Error Message**: เพิ่ม field สำหรับแสดงข้อผิดพลาดให้ frontend
- **String Fields**: เปลี่ยนจาก enum เป็น String เพื่อรองรับ SQLite

#### **3. ปรับปรุง ProcessingHistory**
- **String Fields**: เปลี่ยนจาก enum เป็น String
- **Action Types**: VALIDATE, PROCESS, BACKUP, CLEANUP
- **Status Types**: STARTED, COMPLETED, FAILED, CANCELLED

### 📊 ประโยชน์ของการปรับปรุง

#### **1. Batch Processing**
- **จัดการไฟล์หลายไฟล์**: อัปโหลดและประมวลผลไฟล์หลายไฟล์พร้อมกัน
- **ติดตามสถานะ**: ดูสถานะของ batch ทั้งหมด
- **สถิติแบบ batch**: เก็บสถิติของ batch แยกจากไฟล์เดี่ยว

#### **2. Error Handling**
- **Error Message**: แสดงข้อผิดพลาดให้ frontend ได้ชัดเจน
- **Batch Error**: จัดการข้อผิดพลาดระดับ batch
- **Partial Success**: รองรับกรณีที่บางไฟล์สำเร็จ บางไฟล์ล้มเหลว

#### **3. User Experience**
- **Batch Progress**: แสดงความคืบหน้าของ batch
- **Batch History**: ดูประวัติการอัปโหลดแบบ batch
- **Batch Report**: สร้างรายงานของ batch

### 🛠️ การใช้งาน

#### **1. สร้าง Batch**
```typescript
const batch = await databaseService.createUploadBatch({
  batchName: 'Monthly Upload - January 2024',
  totalFiles: 5,
  successFiles: 0,
  errorFiles: 0,
  processingFiles: 0,
  totalRecords: 0,
  totalSize: 0,
  status: 'processing',
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
});
```

#### **2. เพิ่มไฟล์ใน Batch**
```typescript
const record = await databaseService.createUploadRecord({
  filename: 'PAT6805.DBF',
  originalName: 'PAT6805.DBF',
  fileType: 'DBF',
  fileSize: 1024000,
  filePath: '/uploads/dbf/2024-01-15/uuid-123/PAT6805.DBF',
  status: 'pending',
  batchId: batch.id, // เชื่อมโยงกับ batch
  userId: 'user123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
});
```

#### **3. อัปเดต Batch Status**
```typescript
await databaseService.updateUploadBatch(batch.id, {
  successFiles: 3,
  errorFiles: 1,
  processingFiles: 1,
  totalRecords: 15000,
  totalSize: 5120000,
  status: 'partial', // บางไฟล์สำเร็จ บางไฟล์ล้มเหลว
});
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

#### **1. Generate Prisma Client**
```bash
npm run db:generate
```

#### **2. Push Schema to Database**
```bash
npm run db:push
```

#### **3. Seed Database**
```bash
npm run db:seed
```

### ✅ ผลลัพธ์

- ✅ **UploadBatch Model**: เพิ่มสำเร็จ
- ✅ **UploadRecord Relations**: เชื่อมโยงกับ batch สำเร็จ
- ✅ **Error Message Field**: เพิ่มสำเร็จ
- ✅ **Database Migration**: รันสำเร็จ
- ✅ **Sample Data**: สร้างสำเร็จ

### 📝 หมายเหตุ

- **SQLite Limitation**: เปลี่ยนจาก enum เป็น String เนื่องจาก SQLite ไม่รองรับ enums
- **Backward Compatibility**: รองรับข้อมูลเก่า
- **Type Safety**: ใช้ TypeScript enums ใน application layer
- **Validation**: ตรวจสอบค่า String ใน application layer

### 🔗 การเชื่อมโยง

- **Frontend**: รองรับการแสดงผล batch
- **API Gateway**: รองรับ batch endpoints
- **Auth Service**: ตรวจสอบสิทธิ์การเข้าถึง batch
- **Statistics**: รวมสถิติของ batch 