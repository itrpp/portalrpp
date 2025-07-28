# API Gateway Service

API Gateway สำหรับระบบ RPP Portal ที่ทำหน้าที่เป็นจุดเข้าใช้งานหลักของ microservices

## 🎯 เป้าหมายหลัก

- **Single Entry Point**: ทุก request ต้องผ่าน API Gateway เท่านั้น
- **Service Discovery**: จัดการ routing ไปยัง services ต่างๆ
- **Load Balancing**: กระจายโหลดไปยัง instances หลายตัว
- **Circuit Breaker**: ป้องกัน cascade failure
- **Rate Limiting**: จำกัดจำนวน requests
- **Authentication/Authorization**: ตรวจสอบสิทธิ์ก่อนส่งต่อ
- **API Documentation**: Swagger UI สำหรับ API documentation

## 🏗️ สถาปัตยกรรม

```
Client Request → API Gateway → Service Proxy → Microservice
                ↓
            Middleware Stack:
            - CORS
            - Security Headers
            - Rate Limiting
            - Authentication
            - Request Logging
            - Error Handling
            - Swagger Documentation
```

## 🚀 การเริ่มต้นใช้งาน

### การติดตั้ง Dependencies

```bash
npm install
```

### การรัน Development Server

```bash
npm run dev
```

### การ Build และ Production

```bash
# Build TypeScript
npm run build

# Build for production
npm run build:prod

# รัน production server
npm run start:prod
```

## 🌐 URLs สำหรับการพัฒนา

- **API Gateway**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Metrics**: http://localhost:3001/metrics
- **Status Monitor**: http://localhost:3001/status
- **Swagger UI**: http://localhost:3001/api-docs

## 🔐 Services ที่รองรับ

### Auth Service
- **URL**: http://localhost:3002
- **Endpoints**: `/api/auth/*`, `/api/admin/*`
- **Features**: 
  - Authentication และ Session Management
  - Admin Management และ System Statistics
  - User Management
  - LDAP Integration

## 📚 API Documentation

### Swagger UI
- **URL**: http://localhost:3001/api-docs
- **Features**: 
  - Interactive API documentation
  - Try out API endpoints
  - Request/Response examples
  - Authentication support
  - Schema validation

### API Documentation JSON
- **URL**: http://localhost:3001/api/docs
- **Features**: Machine-readable API documentation

## 🛡️ ความปลอดภัย

### Security Headers
- ใช้ `helmet` middleware
- ตั้งค่า CORS ให้เหมาะสม
- Content Security Policy
- Cross-Origin Resource Policy

### Rate Limiting
- **General**: 100 requests/minute
- **Auth endpoints**: 5 requests/15 minutes
- **Admin endpoints**: 10 requests/minute

### Circuit Breaker
- **Timeout**: 10 seconds
- **Error Threshold**: 50%
- **Reset Timeout**: 60 seconds
- **Volume Threshold**: 10 requests

## 📊 การ Monitor และ Logging

### Health Checks
- ตรวจสอบสถานะของ services ต่างๆ
- แสดงสถานะของ API Gateway
- Alert เมื่อ service ไม่พร้อมใช้งาน

### Metrics
- Request count และ response time
- Error rate และ status codes
- Memory และ CPU usage
- Circuit breaker statistics

### Logging
- Structured logging format
- Request ID tracking
- Performance metrics
- Error stack traces

## 🔧 Configuration

### Environment Variables

```bash
# Basic Configuration
NODE_ENV=development
PORT=3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Service URLs
AUTH_SERVICE_URL=http://localhost:3002

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=10000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Security
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# Monitoring
MONITORING_ENABLED=true
LOG_LEVEL=info
```

## 📋 API Endpoints

### Health & Monitoring
- `GET /health` - Health check
- `GET /metrics` - System metrics
- `GET /status` - Status monitor
- `GET /api-docs` - Swagger UI

### Auth Service
**Authentication & Session Management:**
- `POST /api/auth/login` - เข้าสู่ระบบ (Local)
- `POST /api/auth/login-ldap` - เข้าสู่ระบบ (LDAP)
- `POST /api/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/auth/logout` - ออกจากระบบ
- `POST /api/auth/logout-all` - ออกจากระบบทั้งหมด
- `POST /api/auth/refresh` - Refresh Token
- `POST /api/auth/verify-token` - ตรวจสอบ Token
- `POST /api/auth/validate-session` - ตรวจสอบ Session
- `POST /api/auth/check-session-status` - ตรวจสอบสถานะ Session
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `GET /api/auth/profile` - ดูข้อมูล Profile
- `PUT /api/auth/profile` - อัปเดต Profile
- `PUT /api/auth/change-password` - เปลี่ยนรหัสผ่าน
- `DELETE /api/auth/account` - ลบบัญชีผู้ใช้

**Admin Management:**
- `GET /api/admin/statistics` - ดูสถิติระบบ
- `GET /api/admin/users` - ดูรายชื่อผู้ใช้ทั้งหมด
- `GET /api/admin/sessions` - ดู Session ทั้งหมด
- `GET /api/admin/login-attempts` - ดูประวัติการ Login

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### API Tests
```bash
npm run test:api
```

### Code Quality
```bash
npm run lint
npm run type-check
npm run quality-check
```

## 📈 Performance Targets

### Response Time
- P50: < 100ms
- P95: < 500ms
- P99: < 1000ms

### Throughput
- Requests/second: > 1000
- Concurrent connections: > 1000
- Memory usage: < 512MB
- CPU usage: < 80%

### Availability
- Uptime: > 99.9%
- Error rate: < 0.1%
- Circuit breaker trips: < 1%
- Rate limit hits: < 5%

## 🔍 Debugging

### Development Mode
```bash
NODE_ENV=development npm run dev
```

### Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

### Monitoring
- ใช้ Status Monitor: http://localhost:3001/status
- ตรวจสอบ Metrics: http://localhost:3001/metrics
- ดู Health Check: http://localhost:3001/health
- ดู Swagger UI: http://localhost:3001/api-docs

## 🚨 Error Handling

### Error Types
- **ServiceUnavailableError**: Service ไม่พร้อมใช้งาน
- **RateLimitError**: Rate limit exceeded
- **AuthenticationError**: Authentication failed
- **AuthorizationError**: Authorization failed
- **CircuitBreakerError**: Circuit breaker open

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid",
  "path": "/api/endpoint"
}
```

## 📚 Best Practices

### Do's ✅
- ใช้ security headers เสมอ
- จัดการ CORS อย่างเหมาะสม
- ใช้ rate limiting
- จัดการ error handling
- ใช้ circuit breaker pattern
- ใช้ structured logging
- ใช้ TypeScript strict mode
- ใช้ environment variables
- ใช้ health checks
- ใช้ monitoring และ alerting
- ใช้ Swagger สำหรับ API documentation

### Don'ts ❌
- อย่า hardcode service URLs
- อย่าลืม security headers
- อย่าลืม error handling
- อย่าลืม rate limiting
- อย่าลืม CORS configuration
- อย่าลืม health checks
- อย่าลืม logging
- อย่าลืม monitoring
- อย่าลืม testing
- อย่าลืม documentation

## 🔄 Development Workflow

### Local Development
1. ตั้งค่า environment variables
2. รัน `npm run dev`
3. ตรวจสอบ health check
4. ทดสอบ API endpoints
5. ดู Swagger UI

### Code Quality
1. รัน `npm run lint`
2. รัน `npm run type-check`
3. รัน `npm run quality-check`
4. แก้ไข issues ที่พบ

### Testing
1. เขียน unit tests
2. รัน `npm test`
3. ทดสอบ API endpoints
4. ตรวจสอบ performance

## 📖 Documentation

### API Documentation
- ดูที่: http://localhost:3001/api-docs (Swagger UI)
- รองรับ OpenAPI/Swagger
- รวม examples และ schemas

### Code Documentation
- ใช้ TypeScript types
- ใช้ JSDoc comments
- ใช้ README files

## 🤝 Contributing

### Code Style
- ใช้ TypeScript strict mode
- ใช้ ESLint และ Prettier
- ใช้ semantic commit messages
- ใช้ conventional commits

### Testing
- เขียน unit tests
- เขียน integration tests
- เขียน load tests
- ตรวจสอบ coverage

### Documentation
- อัปเดต README
- อัปเดต API docs
- อัปเดต comments
- อัปเดต types

## 📄 License

MIT License - ดูไฟล์ LICENSE สำหรับรายละเอียด 