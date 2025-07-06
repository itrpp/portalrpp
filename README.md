# RPP Portal

ระบบจัดการพอร์ทัลแบบ Microservices ที่ทันสมัยและมีประสิทธิภาพ สร้างด้วย Next.js และ Node.js

## 🏗️ สถาปัตยกรรม

โปรเจคนี้ใช้ Microservices Architecture ประกอบด้วย:

- **Frontend**: Next.js 14 with TypeScript และ Tailwind CSS
- **API Gateway**: Express.js - จัดการ routing และ proxy requests
- **Auth Service**: Express.js - จัดการ authentication และ authorization
- **User Service**: Express.js - จัดการข้อมูลผู้ใช้และโปรไฟล์
- **Docker**: สำหรับ containerization และ deployment

## 🚀 การติดตั้งและเริ่มต้นใช้งาน

### ข้อกำหนดเบื้องต้น

- Node.js 18+ 
- Docker และ Docker Compose
- npm หรือ yarn

### การติดตั้ง

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd portalrpp
   ```

2. **ติดตั้ง dependencies สำหรับแต่ละ service**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # API Gateway
   cd ../backend/api-gateway && npm install
   
   # Auth Service
   cd ../auth-service && npm install
   
   # User Service
   cd ../user-service && npm install
   ```

### การรัน Development

#### แบบ Manual (แต่ละ service แยกกัน)

1. **เริ่ม Backend Services**
   ```bash
   # Terminal 1 - API Gateway
   cd backend/api-gateway
   npm run dev
   
   # Terminal 2 - Auth Service
   cd backend/auth-service
   npm run dev
   
   # Terminal 3 - User Service
   cd backend/user-service
   npm run dev
   ```

2. **เริ่ม Frontend**
   ```bash
   # Terminal 4 - Frontend
   cd frontend
   npm run dev
   ```

#### แบบ Docker Compose

```bash
# สร้างและรัน containers
docker-compose up --build

# รันในพื้นหลัง
docker-compose up -d --build

# หยุดการทำงาน
docker-compose down
```

## 🔗 API Endpoints

### API Gateway (Port 3001)
- `GET /` - ข้อมูลเบื้องต้นของ API Gateway
- `GET /health` - Health check

### Authentication Service (ผ่าน API Gateway)
- `POST /api/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/verify` - ตรวจสอบ JWT token

### User Service (ผ่าน API Gateway)
- `GET /api/users` - ดึงข้อมูลผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้ตาม ID
- `PUT /api/users/:id` - อัพเดทข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้
- `GET /api/users/search/:query` - ค้นหาผู้ใช้

## 🌐 Ports

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Auth Service**: http://localhost:3002
- **User Service**: http://localhost:3003

## 📁 โครงสร้างโปรเจค

```
portalrpp/
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   └── components/
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── api-gateway/         # API Gateway Service
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── auth-service/        # Authentication Service
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── user-service/        # User Management Service
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── shared/              # Shared utilities
├── docker-compose.yml
└── README.md
```

## 🔐 Authentication

ระบบใช้ JWT (JSON Web Token) สำหรับการยืนยันตัวตน:

1. ผู้ใช้ส่ง email/password ไปยัง `/api/auth/login`
2. ระบบตรวจสอบข้อมูลและส่งกลับ JWT token
3. Frontend เก็บ token และส่งใน Authorization header สำหรับ API calls ที่ต้องการความปลอดภัย

### ข้อมูลผู้ใช้ทดสอบ

```
Email: admin@rpp.com
Password: password
```

## 🛠️ Development

### การเพิ่ม Service ใหม่

1. สร้างโฟลเดอร์ใหม่ใน `backend/`
2. ติดตั้ง dependencies และสร้าง package.json
3. สร้าง Dockerfile
4. เพิ่ม service ใน docker-compose.yml
5. อัพเดท API Gateway เพื่อ proxy requests

### การทดสอบ

```bash
# ทดสอบ API Gateway
curl http://localhost:3001/health

# ทดสอบ Auth Service
curl http://localhost:3002/health

# ทดสอบ User Service
curl http://localhost:3003/health
```

## 📊 Monitoring และ Health Checks

แต่ละ service มี health check endpoint:
- API Gateway: `/health`
- Auth Service: `/health`
- User Service: `/health`
- Frontend: `/api/health`

## 🔧 การ Deploy

### Production Build

```bash
# Build ทุก services
docker-compose -f docker-compose.yml build

# Deploy
docker-compose -f docker-compose.yml up -d
```

### Environment Variables

สร้าง `.env` files สำหรับแต่ละ service:

**API Gateway (.env)**
```env
PORT=3001
AUTH_SERVICE_URL=http://auth-service:3002
USER_SERVICE_URL=http://user-service:3003
NODE_ENV=production
```

**Auth Service (.env)**
```env
PORT=3002
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

**User Service (.env)**
```env
PORT=3003
NODE_ENV=production
```

## 🤝 Contributing

1. Fork repository
2. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

หากมีปัญหาหรือคำถาม สามารถเปิด issue ใน GitHub repository หรือติดต่อทีมพัฒนา

---

**RPP Portal** - ระบบจัดการพอร์ทัลที่ทันสมัยและมีประสิทธิภาพ 🚀