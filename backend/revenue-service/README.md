# Revenue Service

บริการจัดการข้อมูล DBF, REP, และ Statement สำหรับการเบิกจ่าย สปสช.

## 🚀 คุณสมบัติ

- **ตรวจสอบความพร้อม DBF File** ก่อนนำส่งเบิก สปสช.
- **จัดการข้อมูลผลการตรวจสอบ (REP)** สำหรับแสดงผลรายงาน
- **จัดการข้อมูลสรุปผลการเบิกจ่ายรายเดือน (Statement)** สำหรับแสดงผลรายงาน
- **รองรับไฟล์**: DBF, XLS, XLSX
- **เก็บสถิติต่างๆ**: อัปโหลด, ประมวลผล, ประวัติ
- **ใช้หลัก Clean Code และ SOLID principles**

## 📁 โครงสร้างโปรเจค

```
revenue-service/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/               # API routes
│   │   └── revenueRoutes.ts  # Revenue routes
│   ├── services/             # Business logic
│   │   ├── fileValidationService.ts # File validation
│   │   ├── fileProcessingService.ts # File processing
│   │   ├── fileStorageService.ts    # File storage
│   │   ├── statisticsService.ts     # Statistics
│   │   ├── databaseService.ts       # Database operations
│   │   ├── batchService.ts          # Batch management
│   │   └── validationService.ts     # Security validation
│   ├── config/               # Configuration files
│   │   └── index.ts         # Service configuration
│   ├── middleware/           # Express middleware
│   │   ├── rateLimitMiddleware.ts # Rate limiting
│   │   └── validationMiddleware.ts # Request validation
│   ├── utils/                # Utility functions
│   │   ├── errorHandler.ts   # Error handling
│   │   └── logger.ts         # Logging utilities
│   └── types/                # TypeScript type definitions
│       └── index.ts          # Type definitions
├── uploads/                  # ไฟล์ที่อัปโหลด
│   ├── dbf/                 # ไฟล์ DBF
│   │   ├── 20240115/        # วันที่อัปโหลด (yyyyMMdd)
│   │   │   ├── uuid-batch-1/     # Batch ID (UUID)
│   │   │   │   ├── PAT6805.DBF
│   │   │   │   ├── ADP6805.DBF
│   │   │   │   └── OPD6805.DBF
│   │   │   └── uuid-batch-2/
│   │   │       └── AER6805.DBF
│   │   └── 20240116/
│   │       └── uuid-batch-3/
│   │           └── CHA6805.DBF
│   ├── rep/                  # ไฟล์ REP (Excel)
│   │   ├── 20240115/
│   │   │   └── uuid-batch-1/
│   │   │       ├── 680600025.xls
│   │   │       └── 680600030.xls
│   │   └── 20240116/
│   │       └── uuid-batch-2/
│   │           └── 680600031.xls
│   └── stm/                  # ไฟล์ Statement (Excel)
│       ├── 20240115/
│       │   └── uuid-batch-1/
│       │       ├── STM_14641_OPUCS256806_01.xls
│       │       └── STM_14641_OPUCS256806_02.xls
│       └── 20240116/
│           └── uuid-batch-2/
│               └── STM_14641_OPUCS256806_03.xls
├── processed/                # ไฟล์ที่ประมวลผลแล้ว
├── backup/                   # ไฟล์ backup
├── temp/                     # ไฟล์ชั่วคราว
├── logs/                     # Log files
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── eslint.config.js          # ESLint configuration
├── .prettierrc              # Prettier configuration
├── env.example              # Environment variables template
└── README.md                # Service documentation
```

## 🛠️ การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env จาก env.example
cp env.example .env

# รัน development server
npm run dev
```

## 🌐 API Endpoints

### Health Check
- `GET /health` - ตรวจสอบสถานะ service

### Batch Management
- `GET /api/revenue/batches` - ดึงรายการ batches
- `POST /api/revenue/batches` - สร้าง batch ใหม่
- `GET /api/revenue/batches/:id` - ดึงข้อมูล batch
- `DELETE /api/revenue/batches/:id` - ลบ batch
- `GET /api/revenue/batches/:id/files` - ดึงไฟล์ใน batch
- `POST /api/revenue/batches/:id/process` - ประมวลผล batch

### File Upload
- `POST /api/revenue/upload` - อัปโหลดไฟล์เดี่ยว
- `POST /api/revenue/upload/batch` - อัปโหลดหลายไฟล์เป็น batch

### File Validation
- `POST /api/revenue/validate` - ตรวจสอบไฟล์

### File Processing
- `POST /api/revenue/process/:fileId` - ประมวลผลไฟล์

### Statistics
- `GET /api/revenue/statistics` - ดึงสถิติการอัปโหลด
- `GET /api/revenue/history` - ดึงประวัติการประมวลผล
- `GET /api/revenue/report` - สร้างรายงาน

## 📊 ประเภทไฟล์ที่รองรับ

### DBF Files
- ไฟล์ฐานข้อมูล DBF สำหรับข้อมูลผู้ป่วย
- รองรับ encoding: cp874 (Thai Windows)
- ตรวจสอบโครงสร้างและข้อมูล
- **จัดเก็บใน**: `/uploads/dbf/{date}/{batchId}/filename.dbf` (date format: yyyyMMdd, batchId คือ UUID)

### REP Files (Excel)
- ไฟล์ผลการตรวจสอบ (REP)
- รองรับ .xls และ .xlsx
- ตรวจสอบข้อมูลในแต่ละ sheet
- **จัดเก็บใน**: `/uploads/rep/{date}/{batchId}/filename.xls` (date format: yyyyMMdd, batchId คือ UUID)

### Statement Files (Excel)
- ไฟล์สรุปผลการเบิกจ่ายรายเดือน
- รองรับ .xls และ .xlsx
- ตรวจสอบข้อมูลในแต่ละ sheet
- **จัดเก็บใน**: `/uploads/stm/{date}/{batchId}/filename.xls` (date format: yyyyMMdd, batchId คือ UUID)

## 📁 โครงสร้างการจัดเก็บไฟล์

### รูปแบบการจัดเก็บ
```
/uploads/{fileType}/{date}/{batchId}/{filename}
```

### รายละเอียด
- **{fileType}**: ประเภทไฟล์ (dbf, rep, stm)
- **{date}**: วันที่อัปโหลด (yyyyMMdd)
- **{batchId}**: UUID ที่สร้างขึ้นสำหรับแต่ละ batch
- **{filename}**: ชื่อไฟล์ต้นฉบับ

### ตัวอย่าง
```
/uploads/dbf/20240115/clm8k0x0y0000f6qtszwb7001/PAT6805.DBF
/uploads/rep/20240115/clm8k0x0y0001f6qtszwb7002/680600025.xls
/uploads/stm/20240115/clm8k0x0y0002f6qtszwb7003/STM_14641_OPUCS256806_01.xls
```

### ประโยชน์
- **แยกประเภทไฟล์**: จัดเก็บตามประเภทไฟล์ (dbf, rep, stm)
- **แยกตามวันที่**: ง่ายต่อการค้นหาและจัดการ
- **Unique ID**: ป้องกันการซ้ำชื่อไฟล์
- **Traceability**: สามารถติดตามที่มาของไฟล์ได้

## 🔧 Scripts

```bash
# Development
npm run dev                  # รัน development server
npm run start:dev           # รันด้วย tsx

# Build & Production
npm run build               # Build TypeScript
npm run build:prod          # Build for production
npm run start               # รัน production server

# Code Quality
npm run lint                # ตรวจสอบ code style
npm run lint:fix            # แก้ไข code style อัตโนมัติ
npm run type-check          # ตรวจสอบ TypeScript types
npm run quality-check       # ตรวจสอบคุณภาพโค้ด
npm run format              # จัดรูปแบบโค้ดด้วย Prettier

# Testing
npm test                    # รัน unit tests
npm run test:watch          # รัน tests แบบ watch mode
```

## 📝 Environment Variables

```env
# Server Configuration
PORT=3003
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=50mb
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=.dbf,.xls,.xlsx

# Database Configuration
DATABASE_URL="file:./dev.db"

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=http://localhost:3000
TRUST_PROXY=false

# File Processing
TEMP_DIR=./temp
PROCESSED_DIR=./processed
BACKUP_DIR=./backup
```

## 🏗️ สถาปัตยกรรม

### Services
- **FileValidationService**: ตรวจสอบไฟล์และข้อมูล
- **FileProcessingService**: ประมวลผลไฟล์และข้อมูล
- **FileStorageService**: จัดการไฟล์และโฟลเดอร์ตามโครงสร้าง `/{fileType}/{date}/{uuid}/`
- **StatisticsService**: เก็บและดึงสถิติ
- **DatabaseService**: จัดการฐานข้อมูล

### Middleware
- **Rate Limiting**: จำกัดการเรียก API
- **Validation**: ตรวจสอบข้อมูลที่ส่งมา
- **Error Handling**: จัดการข้อผิดพลาด

### Types
- **FileValidationResult**: ผลการตรวจสอบไฟล์
- **FileProcessingResult**: ผลการประมวลผล
- **RevenueReport**: รายงานข้อมูล
- **UploadStatistics**: สถิติการอัปโหลด

## 🔐 ความปลอดภัย

- **Rate Limiting**: จำกัดการเรียก API
- **File Validation**: ตรวจสอบไฟล์ที่อัปโหลด
- **Error Handling**: จัดการข้อผิดพลาดอย่างปลอดภัย
- **Logging**: บันทึกการทำงานและข้อผิดพลาด

## 📊 การ Monitor

- **Health Check**: ตรวจสอบสถานะ service
- **Logging**: บันทึกการทำงานและข้อผิดพลาด
- **Statistics**: เก็บสถิติการใช้งาน
- **Error Tracking**: ติดตามข้อผิดพลาด

## 🤝 การทำงานร่วมกับ Services อื่น

- **API Gateway**: รับคำขอผ่าน port 3001
- **Auth Service**: ตรวจสอบ authentication
- **Frontend**: แสดงผลผ่าน port 3000

## 📈 การพัฒนา

### การเพิ่ม Feature ใหม่
1. สร้าง service ใหม่ใน `src/services/`
2. เพิ่ม types ใน `src/types/index.ts`
3. สร้าง routes ใน `src/routes/`
4. เพิ่ม middleware ถ้าจำเป็น
5. ทดสอบและอัปเดต documentation

### การจัดการไฟล์
1. **อัปโหลด**: ไฟล์จะถูกจัดเก็บใน `/uploads/{fileType}/{date}/{batchId}/` (date: yyyyMMdd, batchId: UUID)
2. **ประมวลผล**: ไฟล์ที่ประมวลผลแล้วจะย้ายไป `/processed/{fileType}/{date}/{batchId}/`
3. **Backup**: ไฟล์สำรองจะเก็บใน `/backup/{fileType}/{date}/{batchId}/`
4. **Temp**: ไฟล์ชั่วคราวจะเก็บใน `/temp/{fileType}/{date}/{batchId}/`

### การแก้ไข Bug
1. ตรวจสอบ logs ใน `logs/`
2. ใช้ error handling ที่มีอยู่
3. ทดสอบก่อน deploy
4. อัปเดต documentation

## 📞 การติดต่อ

- **Developer**: RPP Portal Team
- **Email**: support@rpphosp.com
- **Documentation**: ดูในโค้ดและ comments

## 🔍 การติดตามไฟล์

### การค้นหาไฟล์
- **ตามประเภท**: `/uploads/dbf/`, `/uploads/rep/`, `/uploads/stm/`
- **ตามวันที่**: `/uploads/{type}/20240115/` (yyyyMMdd format)
- **ตาม Batch ID**: `/uploads/{type}/{date}/{batchId}/` (batchId คือ UUID)

### การจัดการไฟล์
- **อัปโหลด**: ไฟล์ใหม่จะถูกจัดเก็บในโครงสร้างที่กำหนด
- **ประมวลผล**: ไฟล์จะถูกย้ายไปโฟลเดอร์ processed
- **สำรอง**: ไฟล์สำรองจะเก็บในโฟลเดอร์ backup
- **ลบ**: ไฟล์ชั่วคราวจะถูกลบจากโฟลเดอร์ temp 