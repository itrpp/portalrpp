# Revenue Collection Service

ระบบงานจัดเก็บรายได้สำหรับ Portal RPP

## 🚀 การเริ่มต้นใช้งาน

### การติดตั้ง Dependencies

```cmd
npm install
```

### การรัน Development Server

```cmd
npm run dev
```

### การรัน Production Server

```cmd
npm run build
npm start
```

## 📊 URLs สำหรับการพัฒนา

- **Revenue Service**: http://localhost:3005
- **Health Check**: http://localhost:3005/health
- **API Documentation**: http://localhost:3005/api-docs

## 🏗️ สถาปัตยกรรม

### โครงสร้างโปรเจค

```
revenue-service/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/               # Configuration files
│   │   └── index.ts         # Service configuration
│   ├── routes/              # API routes
│   │   ├── revenueRoutes.ts # Revenue collection routes
│   │   ├── reportRoutes.ts  # Report generation routes
│   │   └── healthRoutes.ts  # Health check routes
│   ├── services/            # Business logic
│   │   ├── revenueService.ts # Revenue management
│   │   ├── reportService.ts  # Report generation
│   │   └── healthService.ts  # Health monitoring
│   ├── middleware/          # Express middleware
│   │   ├── rateLimitMiddleware.ts # Rate limiting
│   │   └── validationMiddleware.ts # Request validation
│   ├── utils/               # Utility functions
│   │   ├── logger.ts        # Logging utilities
│   │   ├── errorHandler.ts  # Error handling
│   │   └── validation.ts    # Data validation
│   └── types/               # TypeScript type definitions
│       └── index.ts         # Type definitions
├── logs/                    # Log files
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── eslint.config.js         # ESLint configuration
├── .prettierrc             # Prettier configuration
├── env.example             # Environment variables template
└── README.md               # Service documentation
```

## 🔧 Configuration

### Environment Variables

สร้างไฟล์ `.env` จาก `env.example`:

```env
# Revenue Service Environment Variables
NODE_ENV=development
PORT=3005

# API Gateway URL (สำหรับการเรียกใช้ API Gateway)
API_GATEWAY_URL=http://localhost:3001

# Database Service URL (สำหรับการเรียกใช้ Database Service ผ่าน API Gateway)
DATABASE_SERVICE_URL=http://localhost:3001/api/db

# Authentication Service URL (สำหรับการตรวจสอบ token)
AUTH_SERVICE_URL=http://localhost:3001/api/auth

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/revenue-service.log

# Security
CORS_ORIGIN=http://localhost:3000
HELMET_ENABLED=true

# Revenue Collection Settings
REVENUE_CATEGORIES=TAX,FEE,FINE,LICENSE,OTHER
CURRENCY=THB
DEFAULT_PAYMENT_METHODS=CASH,TRANSFER,CREDIT_CARD,DEBIT_CARD
```

## 📋 API Endpoints

### Revenue Collection Endpoints

#### GET /api/revenue
ดึงรายการรายได้ทั้งหมด

**Query Parameters:**
- `page` (number): หมายเลขหน้า (default: 1)
- `limit` (number): จำนวนรายการต่อหน้า (default: 20, max: 100)
- `category` (string): หมวดหมู่รายได้
- `status` (string): สถานะรายการ
- `paymentMethod` (string): วิธีการชำระเงิน
- `dateFrom` (string): วันที่เริ่มต้น (YYYY-MM-DD)
- `dateTo` (string): วันที่สิ้นสุด (YYYY-MM-DD)
- `search` (string): คำค้นหา

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "referenceNumber": "REV-20241201-00001",
      "category": "TAX",
      "amount": 5000,
      "currency": "THB",
      "paymentMethod": "CASH",
      "payerName": "บริษัท เอ จำกัด",
      "payerType": "COMPANY",
      "description": "ภาษีมูลค่าเพิ่ม",
      "collectionDate": "2024-12-01T00:00:00.000Z",
      "status": "COLLECTED",
      "receiptNumber": "R001",
      "createdAt": "2024-12-01T10:00:00.000Z",
      "updatedAt": "2024-12-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### POST /api/revenue
สร้างรายการรายได้ใหม่

**Request Body:**
```json
{
  "category": "TAX",
  "amount": 5000,
  "currency": "THB",
  "paymentMethod": "CASH",
  "payerName": "บริษัท เอ จำกัด",
  "payerType": "COMPANY",
  "description": "ภาษีมูลค่าเพิ่ม",
  "collectionDate": "2024-12-01",
  "receiptNumber": "R001",
  "notes": "หมายเหตุเพิ่มเติม"
}
```

#### GET /api/revenue/:id
ดึงรายการรายได้ตาม ID

#### PUT /api/revenue/:id
อัปเดตรายการรายได้

#### DELETE /api/revenue/:id
ลบรายการรายได้

#### GET /api/revenue/summary
ดึงสรุปข้อมูลรายได้

#### GET /api/revenue/categories
ดึงหมวดหมู่รายได้

#### POST /api/revenue/categories
สร้างหมวดหมู่รายได้ใหม่

#### GET /api/revenue/search
ค้นหารายการรายได้

#### POST /api/revenue/bulk
สร้างรายการรายได้หลายรายการ

#### GET /api/revenue/export
ส่งออกรายการรายได้

### Report Endpoints

#### GET /api/reports
ดึงรายงานทั้งหมด

#### POST /api/reports
สร้างรายงานใหม่

#### GET /api/reports/:id
ดึงรายงานตาม ID

#### DELETE /api/reports/:id
ลบรายงาน

#### GET /api/reports/:id/download
ดาวน์โหลดรายงาน

#### POST /api/reports/generate
สร้างรายงานแบบกำหนดเอง

#### GET /api/reports/templates
ดึงเทมเพลตรายงาน

#### POST /api/reports/schedule
กำหนดเวลาสร้างรายงาน

### Health Check Endpoints

#### GET /health
ตรวจสอบสถานะของ service

#### GET /health/ready
ตรวจสอบ readiness

#### GET /health/live
ตรวจสอบ liveness

#### GET /health/detailed
ข้อมูลสุขภาพแบบละเอียด

## 🛠️ Scripts

### Development
```cmd
npm run dev                  # รัน development server
npm run start:dev           # รันด้วย tsx
```

### Build & Production
```cmd
npm run build               # Build TypeScript
npm run build:prod          # Build for production
npm run start               # รัน production server
```

### Code Quality
```cmd
npm run lint                # ตรวจสอบ code style
npm run lint:fix            # แก้ไข code style อัตโนมัติ
npm run type-check          # ตรวจสอบ TypeScript types
npm run quality-check       # ตรวจสอบคุณภาพโค้ด
npm run format              # จัดรูปแบบโค้ดด้วย Prettier
```

## 🔐 ความปลอดภัย

### Rate Limiting
- **General**: 100 requests per 15 minutes
- **Revenue Create**: 10 requests per minute
- **Report Generation**: 5 requests per 5 minutes
- **Search**: 30 requests per minute

### Validation
- ตรวจสอบข้อมูล input ด้วย Joi
- Sanitize ข้อมูลก่อนประมวลผล
- ตรวจสอบ Content-Type และ Content-Length

### Error Handling
- Structured error responses
- Detailed logging
- Circuit breaker pattern
- Graceful degradation

## 📊 Monitoring

### Health Checks
- Service status monitoring
- Database connectivity
- API Gateway connectivity
- Resource usage tracking

### Logging
- Structured logging with JSON format
- Request/response logging
- Error tracking
- Performance metrics

### Metrics
- Request count
- Response times
- Error rates
- Resource usage

## 🔄 การเชื่อมต่อกับ Services อื่น

### API Gateway
- รับ requests จาก API Gateway
- ส่งต่อ requests ไปยัง Database Service
- ตรวจสอบ authentication ผ่าน Auth Service

### Database Service
- เรียกใช้ผ่าน API Gateway
- CRUD operations สำหรับ revenue collections
- Report generation และ storage

### Auth Service
- ตรวจสอบ JWT tokens
- ตรวจสอบ user permissions
- Session management

## 🧪 Testing

### Unit Tests
```cmd
npm test
```

### Integration Tests
```cmd
npm run test:integration
```

### E2E Tests
```cmd
npm run test:e2e
```

## 📈 Performance

### Targets
- **Response Time**: P50 < 100ms, P95 < 500ms, P99 < 1000ms
- **Throughput**: > 1000 requests/second
- **Availability**: > 99.9% uptime
- **Error Rate**: < 0.1%

### Optimization
- Connection pooling
- Caching strategies
- Database query optimization
- Rate limiting
- Circuit breaker pattern

## 🚨 Troubleshooting

### Common Issues

#### Service ไม่สามารถเชื่อมต่อกับ Database Service
```cmd
# ตรวจสอบ Database Service
curl http://localhost:3001/api/db/health

# ตรวจสอบ logs
tail -f logs/revenue-service.log
```

#### Rate limiting errors
```cmd
# ตรวจสอบ rate limit settings
grep RATE_LIMIT .env

# ตรวจสอบ current limits
curl http://localhost:3005/health
```

#### Memory leaks
```cmd
# ตรวจสอบ memory usage
curl http://localhost:3005/metrics

# ตรวจสอบ process
ps aux | grep revenue-service
```

### Debug Mode
```cmd
# รันใน debug mode
DEBUG=* npm run dev

# เปิด verbose logging
LOG_LEVEL=debug npm run dev
```

## 📚 Documentation

### API Documentation
- Swagger UI: http://localhost:3005/api-docs
- OpenAPI Specification: http://localhost:3005/api-docs/swagger.json

### Code Documentation
- JSDoc comments
- TypeScript type definitions
- README files

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Email**: support@rpphosp.local
- **Documentation**: https://docs.rpphosp.local
- **Issues**: https://github.com/rpphosp/revenue-service/issues 