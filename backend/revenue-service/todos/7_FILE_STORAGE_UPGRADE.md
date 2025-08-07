# File Storage Structure Upgrade - Revenue Service

## 📊 การปรับปรุง File Storage Structure

### 🔄 การเปลี่ยนแปลงที่ทำ

#### **1. เพิ่ม Batch-based Storage Structure**

##### **โครงสร้างใหม่**
```
/uploads/
├── dbf/
│   ├── 2024-01-15/
│   │   ├── batch-1/
│   │   │   ├── uuid-1/
│   │   │   │   └── PAT6805.DBF
│   │   │   └── uuid-2/
│   │   │       └── ADP6805.DBF
│   │   └── batch-2/
│   │       └── uuid-3/
│   │           └── AER6805.DBF
│   └── 2024-01-16/
│       └── batch-3/
│           └── uuid-4/
│               └── CHA6805.DBF
├── rep/
│   ├── 2024-01-15/
│   │   └── batch-1/
│   │       └── uuid-5/
│   │           └── 680600025.xls
│   └── 2024-01-16/
│       └── batch-2/
│           └── uuid-6/
│               └── 680600030.xls
├── stm/
│   ├── 2024-01-15/
│   │   └── batch-1/
│   │       └── uuid-7/
│   │           └── STM_14641_OPUCS256806_01.xls
│   └── 2024-01-16/
│       └── batch-2/
│           └── uuid-8/
│               └── STM_14641_OPUCS256806_02.xls
├── processed/
│   ├── dbf/
│   │   ├── 2024-01-15/
│   │   │   ├── batch-1/
│   │   │   │   ├── uuid-1/
│   │   │   │   │   └── PAT6805.DBF
│   │   │   │   └── uuid-2/
│   │   │   │       └── ADP6805.DBF
│   │   │   └── batch-2/
│   │   │       └── uuid-3/
│   │   │           └── AER6805.DBF
│   │   └── 2024-01-16/
│   │       └── batch-3/
│   │           └── uuid-4/
│   │               └── CHA6805.DBF
│   ├── rep/
│   └── stm/
├── backup/
│   ├── dbf/
│   │   ├── 2024-01-15/
│   │   │   ├── batch-1/
│   │   │   │   ├── uuid-1/
│   │   │   │   │   └── PAT6805.DBF
│   │   │   │   └── uuid-2/
│   │   │   │       └── ADP6805.DBF
│   │   │   └── batch-2/
│   │   │       └── uuid-3/
│   │   │           └── AER6805.DBF
│   │   └── 2024-01-16/
│   │       └── batch-3/
│   │           └── uuid-4/
│   │               └── CHA6805.DBF
│   ├── rep/
│   └── stm/
└── temp/
    ├── dbf/
    ├── rep/
    └── stm/
```

#### **2. เพิ่ม Batch Storage Methods**

##### **createBatchFolder**
```typescript
/**
 * สร้างโฟลเดอร์ตาม Batch ID
 * /uploads/{fileType}/{date}/{batchId}/
 */
async createBatchFolder(fileType: FileType, batchId: string, date: Date = new Date()): Promise<string>
```

##### **createUuidFolderInBatch**
```typescript
/**
 * สร้างโฟลเดอร์ตาม UUID ใน batch
 * /uploads/{fileType}/{date}/{batchId}/{uuid}/
 */
async createUuidFolderInBatch(fileType: FileType, batchId: string, date: Date = new Date()): Promise<{ uuid: string; folderPath: string }>
```

##### **saveFileInBatch**
```typescript
/**
 * บันทึกไฟล์ใน batch
 * /uploads/{fileType}/{date}/{batchId}/{uuid}/{filename}
 */
async saveFileInBatch(
  fileType: FileType,
  originalName: string,
  fileBuffer: Buffer,
  batchId: string,
  date: Date = new Date(),
): Promise<IBatchStorageResult>
```

##### **moveToProcessedInBatch**
```typescript
/**
 * ย้ายไฟล์ไปยัง processed directory ใน batch
 * /uploads/processed/{fileType}/{date}/{batchId}/{uuid}/{filename}
 */
async moveToProcessedInBatch(
  fileType: FileType,
  batchId: string,
  uuid: string,
  date: Date,
  originalName: string,
): Promise<IBatchStorageResult>
```

##### **createBackupInBatch**
```typescript
/**
 * สร้าง backup ใน batch
 * /uploads/backup/{fileType}/{date}/{batchId}/{uuid}/{filename}
 */
async createBackupInBatch(
  fileType: FileType,
  batchId: string,
  uuid: string,
  date: Date,
  originalName: string,
): Promise<IBatchStorageResult>
```

#### **3. เพิ่ม Batch Storage Interfaces**

##### **IBatchStorageResult**
```typescript
export interface IBatchStorageResult extends IFileStorageResult {
  batchId: string;
  batchFolder: string;
}
```

##### **FileType Enum**
```typescript
export enum FileType {
  DBF = 'DBF',
  REP = 'REP',
  STM = 'STM',
}
```

### 🔧 การเปลี่ยนแปลงที่สำคัญ

#### **1. Batch-based Organization**
- **Batch ID**: เพิ่ม batch ID ในโครงสร้างโฟลเดอร์
- **Date-based**: ยังคงใช้วันที่เป็นหลักในการจัดระเบียบ
- **UUID-based**: ยังคงใช้ UUID สำหรับไฟล์แต่ละไฟล์
- **Type-based**: แยกตามประเภทไฟล์ (DBF, REP, STM)

#### **2. Legacy Support**
- **Backward Compatibility**: รองรับโครงสร้างเก่า
- **Legacy Methods**: ยังคงมี methods สำหรับไฟล์เดี่ยว
- **Migration Path**: เส้นทางในการย้ายข้อมูลเก่า

#### **3. Enhanced Storage Operations**
- **Batch Operations**: การทำงานกับไฟล์ใน batch
- **Batch Backup**: สร้าง backup ของ batch
- **Batch Processing**: ย้ายไฟล์ใน batch ไป processed
- **Batch Cleanup**: ลบไฟล์ใน batch

### 📊 ประโยชน์ของการปรับปรุง

#### **1. Batch Management**
- **Organized Storage**: จัดระเบียบไฟล์ตาม batch
- **Easy Tracking**: ติดตามไฟล์ใน batch ได้ง่าย
- **Batch Operations**: ดำเนินการกับไฟล์ใน batch พร้อมกัน
- **Batch Cleanup**: ลบไฟล์ใน batch พร้อมกัน

#### **2. File Organization**
- **Logical Structure**: โครงสร้างที่เข้าใจง่าย
- **Scalable**: รองรับการขยายตัว
- **Maintainable**: ดูแลรักษาง่าย
- **Searchable**: ค้นหาไฟล์ได้ง่าย

#### **3. System Management**
- **Resource Management**: จัดการทรัพยากรอย่างมีประสิทธิภาพ
- **Storage Optimization**: ใช้พื้นที่จัดเก็บอย่างเหมาะสม
- **Backup Strategy**: กลยุทธ์การ backup ที่ดีขึ้น
- **Recovery Process**: กระบวนการกู้คืนที่ง่ายขึ้น

### 🛠️ การใช้งาน

#### **1. สร้าง Batch และบันทึกไฟล์**
```typescript
// สร้าง batch
const batchId = 'batch-123';

// บันทึกไฟล์ใน batch
const result = await fileStorageService.saveFileInBatch(
  FileType.DBF,
  'PAT6805.DBF',
  fileBuffer,
  batchId,
  new Date()
);

console.log('File saved:', result.filePath);
// Output: /uploads/dbf/2024-01-15/batch-123/uuid-abc/PAT6805.DBF
```

#### **2. ย้ายไฟล์ใน Batch ไป Processed**
```typescript
// ย้ายไฟล์ใน batch ไป processed
const processedResult = await fileStorageService.moveToProcessedInBatch(
  FileType.DBF,
  'batch-123',
  'uuid-abc',
  new Date(),
  'PAT6805.DBF'
);

console.log('File moved:', processedResult.filePath);
// Output: /uploads/processed/dbf/2024-01-15/batch-123/uuid-abc/PAT6805.DBF
```

#### **3. สร้าง Backup ของ Batch**
```typescript
// สร้าง backup ของ batch
const backupResult = await fileStorageService.createBackupInBatch(
  FileType.DBF,
  'batch-123',
  'uuid-abc',
  new Date(),
  'PAT6805.DBF'
);

console.log('Backup created:', backupResult.filePath);
// Output: /uploads/backup/dbf/2024-01-15/batch-123/uuid-abc/PAT6805.DBF
```

#### **4. สร้างโฟลเดอร์ Batch**
```typescript
// สร้างโฟลเดอร์ batch
const batchFolder = await fileStorageService.createBatchFolder(
  FileType.DBF,
  'batch-123',
  new Date()
);

console.log('Batch folder:', batchFolder);
// Output: /uploads/dbf/2024-01-15/batch-123
```

### 📈 การ Monitor

#### **1. Storage Statistics**
- **Total Files**: จำนวนไฟล์ทั้งหมด
- **Files per Batch**: จำนวนไฟล์ต่อ batch
- **Storage Usage**: การใช้พื้นที่จัดเก็บ
- **Batch Distribution**: การกระจายของ batch

#### **2. Storage Health**
- **Directory Structure**: โครงสร้างโฟลเดอร์
- **File Permissions**: สิทธิ์การเข้าถึงไฟล์
- **Disk Space**: พื้นที่ว่างในดิสก์
- **Backup Status**: สถานะการ backup

#### **3. Performance Metrics**
- **File Access Time**: เวลาในการเข้าถึงไฟล์
- **Storage Operations**: การดำเนินการจัดเก็บ
- **Batch Processing Time**: เวลาในการประมวลผล batch
- **Cleanup Efficiency**: ประสิทธิภาพการทำความสะอาด

### 🔄 Migration Steps

#### **1. อัปเดต FileStorageService**
- เพิ่ม batch storage methods
- รองรับ batch-based operations
- เพิ่ม batch storage interfaces
- ปรับปรุง error handling

#### **2. อัปเดต Upload Process**
- รองรับ batch upload
- เพิ่ม batch ID ใน upload process
- ปรับปรุง file path generation
- เพิ่ม batch validation

#### **3. อัปเดต Processing Pipeline**
- รองรับ batch processing
- เพิ่ม batch cleanup
- ปรับปรุง batch backup
- เพิ่ม batch recovery

### ✅ ผลลัพธ์

- ✅ **Batch-based Structure**: เพิ่มสำเร็จ
- ✅ **Batch Storage Methods**: เพิ่มสำเร็จ
- ✅ **Batch Storage Interfaces**: เพิ่มสำเร็จ
- ✅ **Legacy Support**: รองรับสำเร็จ
- ✅ **Enhanced Operations**: ปรับปรุงสำเร็จ
- ✅ **Error Handling**: ปรับปรุงสำเร็จ

### 📝 หมายเหตุ

- **Backward Compatibility**: รองรับโครงสร้างเก่า
- **Migration Path**: เส้นทางในการย้ายข้อมูล
- **Performance Impact**: ผลกระทบต่อประสิทธิภาพ
- **Storage Optimization**: การปรับปรุงการจัดเก็บ

### 🔗 การเชื่อมโยง

- **BatchService**: ใช้ batch storage methods
- **Upload Process**: รองรับ batch upload
- **Processing Pipeline**: รองรับ batch processing
- **Backup System**: รองรับ batch backup 