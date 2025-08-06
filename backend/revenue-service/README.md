# Revenue Service

## 📋 คำอธิบาย

Revenue Service เป็น microservice ที่จัดการข้อมูลสำหรับการเบิกจ่าย สปสช. โดยมีหน้าที่หลักดังนี้:

### 🎯 หน้าที่หลัก

1. **จัดการตรวจสอบความพร้อม DBF File** ก่อนนำส่งเบิก สปสช.
2. **จัดการข้อมูลผลการตรวจสอบ (REP)** สำหรับแสดงผลรายงาน
3. **จัดการข้อมูลสรุปผลการเบิกจ่ายรายเดือน (Statement)** สำหรับแสดงผลรายงาน

### 📁 ประเภทไฟล์ที่รองรับ

- **DBF Files** - ไฟล์ฐานข้อมูลสำหรับการเบิกจ่าย
- **REP Files** - ไฟล์ผลการตรวจสอบ (Excel format)
- **Statement Files** - ไฟล์สรุปผลการเบิกจ่ายรายเดือน (Excel format)

## 🏗️ สถาปัตยกรรม

### SOLID Principles
- **Single Responsibility Principle (SRP)** - แต่ละ service มีหน้าที่เดียว
- **Open/Closed Principle (OCP)** - เปิดให้ขยายได้ ปิดให้แก้ไข
- **Liskov Substitution Principle (LSP)** - ใช้ interface แทน implementation
- **Interface Segregation Principle (ISP)** - แยก interface ตามความต้องการ
- **Dependency Inversion Principle (DIP)** - ขึ้นต่อ abstraction ไม่ใช่ concrete

### Clean Code
- **Meaningful Names** - ใช้ชื่อที่มีความหมาย
- **Small Functions** - ฟังก์ชันขนาดเล็ก ทำงานเดียว
- **Comments** - ใช้ comments อธิบาย business logic
- **Error Handling** - จัดการ error อย่างเหมาะสม
- **Testing** - รองรับการเขียน test

## 🚀 การติดตั้ง

### Prerequisites
- Node.js >= 18.0.0
- npm หรือ yarn

### การติดตั้ง Dependencies
```bash
npm install
```

### การตั้งค่า Environment
```bash
cp env.example .env
# แก้ไข .env ตามต้องการ
```

### การรัน Development
```bash
npm run dev
```

### การ Build
```bash
npm run build
npm run start
```

## 📊 API Endpoints

### Health Check
```
GET /health
```

### File Upload
```
POST /api/revenue/upload
Content-Type: multipart/form-data
Body: file (DBF, XLS, XLSX)
```

### File Validation
```
POST /api/revenue/validate
Content-Type: multipart/form-data
Body: file (DBF, XLS, XLSX)
```

### File Processing
```
POST /api/revenue/process/:fileId
```

### Statistics
```
GET /api/revenue/statistics
```

### History
```
GET /api/revenue/history?page=1&limit=20&type=dbf&status=completed
```

### System Report
```
GET /api/revenue/report
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Port ที่ใช้รัน service (default: 3003)
- `NODE_ENV` - Environment (development/production)
- `MAX_FILE_SIZE` - ขนาดไฟล์สูงสุด (default: 50mb)
- `UPLOAD_PATH` - Path สำหรับเก็บไฟล์อัปโหลด
- `ALLOWED_FILE_TYPES` - ประเภทไฟล์ที่อนุญาต

### File Processing Rules
- **DBF Files**: ขนาดสูงสุด 50MB, encoding CP874
- **REP Files**: ขนาดสูงสุด 10MB, Excel format
- **Statement Files**: ขนาดสูงสุด 10MB, Excel format

## 📁 โครงสร้างไฟล์

```
revenue-service/
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Main entry point
├── uploads/              # ไฟล์ที่อัปโหลด
├── processed/            # ไฟล์ที่ประมวลผลแล้ว
├── backup/               # ไฟล์ backup
├── temp/                 # ไฟล์ชั่วคราว
└── logs/                 # Log files
```

## 🔍 การตรวจสอบไฟล์

### DBF Validation
- ตรวจสอบโครงสร้างไฟล์
- ตรวจสอบ encoding (CP874)
- ตรวจสอบ fields ที่จำเป็น (HN, AN, DATE, DIAG)
- ตรวจสอบจำนวน records

### REP/Statement Validation
- ตรวจสอบ Excel format
- ตรวจสอบ sheets และ headers
- ตรวจสอบข้อมูลที่จำเป็น
- ตรวจสอบจำนวน rows

## 📈 สถิติและการ Monitor

### Upload Statistics
- จำนวนไฟล์ที่อัปโหลด
- อัตราความสำเร็จ
- ขนาดไฟล์เฉลี่ย
- เวลาประมวลผลเฉลี่ย

### Processing Statistics
- จำนวน records ที่ประมวลผล
- จำนวน records ที่ถูกต้อง/ไม่ถูกต้อง
- เวลาประมวลผล
- ประวัติการประมวลผล

## 🛡️ ความปลอดภัย

### Rate Limiting
- API requests: 100 requests/15 minutes
- File uploads: 10 files/15 minutes
- File validation: 50 requests/5 minutes

### File Validation
- ตรวจสอบประเภทไฟล์
- ตรวจสอบขนาดไฟล์
- ตรวจสอบ content
- ป้องกัน malicious files

### Error Handling
- Comprehensive error handling
- Detailed error messages
- Error logging
- Graceful degradation

## 📝 Logging

### Log Levels
- `info` - ข้อมูลทั่วไป
- `warn` - คำเตือน
- `error` - ข้อผิดพลาด
- `debug` - ข้อมูล debug

### Log Files
- `combined-YYYY-MM-DD.log` - Log ทั้งหมด
- `error-YYYY-MM-DD.log` - Error logs เท่านั้น

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Code Quality
```bash
npm run lint
npm run type-check
npm run quality-check
```

## 🔄 การพัฒนา

### Code Style
- ใช้ TypeScript
- ใช้ ESLint + Prettier
- ใช้ภาษาไทยใน comments
- ใช้ semantic commit messages

### Best Practices
- ใช้ SOLID principles
- ใช้ Clean Code
- ใช้ Error handling ที่เหมาะสม
- ใช้ Logging ที่ครอบคลุม
- ใช้ Rate limiting
- ใช้ File validation

## 📚 Dependencies

### Production Dependencies
- `express` - Web framework
- `multer` - File upload handling
- `xlsx` - Excel file processing
- `dbf` - DBF file processing
- `iconv-lite` - Character encoding
- `winston` - Logging
- `uuid` - Unique ID generation

### Development Dependencies
- `typescript` - TypeScript compiler
- `eslint` - Code linting
- `prettier` - Code formatting
- `jest` - Testing framework

## 🚀 Deployment

### Production Build
```bash
npm run build:prod
npm run start
```

### Docker (ถ้ามี)
```bash
docker build -t revenue-service .
docker run -p 3003:3003 revenue-service
```

## 📞 Support

หากมีปัญหาในการใช้งาน กรุณาติดต่อทีมพัฒนา หรือสร้าง issue ใน repository

---

**หมายเหตุ**: Service นี้พัฒนาจากต้นฉบับ `temp-dbf-study` โดยใช้หลัก Clean Code และ SOLID principles เพื่อให้เป็น microservice ที่มีคุณภาพสูง ง่ายต่อการบำรุงรักษา และขยายตัวได้ 