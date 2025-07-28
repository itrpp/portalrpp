# 🚀 RPP Portal - Microservices Architecture

ระบบ Portal สำหรับ RPP ที่ใช้สถาปัตยกรรม Microservices พร้อมเทคโนโลยีที่ทันสมัย

## 🌟 Features

- **Frontend**: Next.js 15 + TypeScript + HeroUI + Tailwind CSS
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Authentication**: JWT + LDAP Integration
- **Database**: SQLite (Development) + Prisma ORM
- **API Gateway**: Rate Limiting + Circuit Breaker + Caching
- **Modern Stack**: ES2022 + ESNext Modules + Strict TypeScript

## 🏗️ Architecture

```
portalrpp/
├── frontend/                 # Next.js 15 Frontend
├── backend/
│   ├── api-gateway/         # API Gateway Service
│   ├── auth-service/        # Authentication Service
│   └── [user-service]/      # User Management Service
├── scripts/                 # Utility Scripts
└── package.json             # Root package.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.19.0 (ใช้ .nvmrc)
- **npm**: >= 9.0.0
- **Git**: สำหรับ clone repository

### Installation

```cmd
# Clone repository
git clone <repository-url>
cd portalrpp

# ติดตั้ง dependencies ทั้งหมด
npm run install:all

# หรือติดตั้งทีละ service
npm install
cd frontend && npm install
cd ../backend/api-gateway && npm install
cd ../auth-service && npm install
```

### Development

```cmd
# รัน development servers ทั้งหมด
npm run dev

# หรือรันทีละ service
npm run dev:frontend      # http://localhost:3000
npm run dev:api-gateway   # http://localhost:3001
npm run dev:auth          # http://localhost:3002
```

### URLs สำหรับการพัฒนา

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Auth Service**: http://localhost:3002
- **User Service**: http://localhost:3003
- **Database Service**: http://localhost:3004

## 🛠️ Scripts

### Root Scripts

```cmd
# Development
npm run dev                    # รัน development servers ทั้งหมด
npm run dev:frontend          # รัน frontend เท่านั้น
npm run dev:api-gateway       # รัน api-gateway เท่านั้น
npm run dev:auth              # รัน auth-service เท่านั้น

# Build
npm run build                 # Build ทั้งหมด
npm run build:frontend        # Build frontend
npm run build:backend         # Build backend services

# Code Quality
npm run lint                  # ตรวจสอบ code style ทั้งหมด
npm run lint:fix             # แก้ไข code style อัตโนมัติ
npm run format               # จัดรูปแบบโค้ด
npm run type-check           # ตรวจสอบ TypeScript types
npm run quality-check        # ตรวจสอบคุณภาพโค้ดทั้งหมด

# Database (Auth Service)
npm run db:generate          # Generate Prisma client
npm run db:push              # Push schema to database
npm run db:migrate           # Run database migrations
npm run db:studio            # Open Prisma Studio
npm run db:reset             # Reset database
npm run db:seed              # Seed database

# Clean
npm run clean                # ลบ build files ทั้งหมด
```

### Frontend Scripts

```cmd
cd frontend

npm run dev                  # รัน development server
npm run build                # Build for production
npm run start                # รัน production server
npm run lint                 # ตรวจสอบ code style
npm run format               # จัดรูปแบบโค้ด
npm run type-check           # ตรวจสอบ TypeScript
npm run quality-check        # ตรวจสอบคุณภาพโค้ด
```

### Backend Scripts

```cmd
cd backend/api-gateway
# หรือ
cd backend/auth-service

npm run dev                  # รัน development server
npm run build                # Build TypeScript
npm run start                # รัน production server
npm run lint                 # ตรวจสอบ code style
npm run lint:fix            # แก้ไข code style
npm run type-check          # ตรวจสอบ TypeScript
npm run quality-check       # ตรวจสอบคุณภาพโค้ด
npm run format              # จัดรูปแบบโค้ด
```

## 🔧 Configuration

### Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env` และปรับแต่งค่าตามต้องการ:

```cmd
copy .env.example .env
```

### Database Setup (Auth Service)

```cmd
cd backend/auth-service

# สร้าง database และ run migrations
npm run db:push

# หรือใช้ migrations
npm run db:migrate

# เปิด Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```



## 📊 Monitoring & Health Checks

ทุก service มี health check endpoints:

- **Frontend**: `GET /api/health`
- **API Gateway**: `GET /health`
- **Auth Service**: `GET /health`
- **User Service**: `GET /health`
- **Database Service**: `GET /health`

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **LDAP Integration**: Windows Active Directory support
- **Rate Limiting**: API Gateway protection
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Request validation
- **SQL Injection Protection**: Prisma ORM

## 🎨 UI/UX Features

- **HeroUI**: Modern React components
- **Tailwind CSS**: Utility-first CSS framework
- **Dark Mode**: Theme switching support
- **Responsive Design**: Mobile-first approach
- **Animations**: Framer Motion integration
- **Icons**: Lucide React icons

## 📝 Code Quality

- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Strict Mode**: Enhanced type safety
- **Modern ES**: ES2022 features
- **Module Resolution**: Bundler mode

## 🚀 Performance Optimizations

- **Next.js 15**: App Router + Turbopack
- **Image Optimization**: WebP + AVIF support
- **Code Splitting**: Automatic bundle splitting
- **Caching**: Redis integration
- **Compression**: Gzip compression
- **CDN Ready**: Static asset optimization

## 🔄 Development Workflow

1. **Feature Development**:
   ```cmd
   npm run dev              # รัน development servers
   # แก้ไขโค้ดใน editor
   # ดูผลลัพธ์ที่ http://localhost:3000
   ```

2. **Code Quality**:
   ```cmd
   npm run quality-check    # ตรวจสอบคุณภาพโค้ด
   npm run format           # จัดรูปแบบโค้ด
   npm run lint:fix         # แก้ไข linting errors
   ```

3. **Database Changes**:
   ```cmd
   cd backend/auth-service
   npm run db:push          # อัปเดต database schema
   npm run db:studio        # ตรวจสอบข้อมูล
   ```

4. **Testing**:
   ```cmd
   npm run type-check       # ตรวจสอบ TypeScript
   npm run lint:check       # ตรวจสอบ code style
   ```

## 🐛 Troubleshooting

### Port Conflicts

```cmd
# ตรวจสอบ port ที่ใช้งาน
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# หยุด process ที่ใช้ port
taskkill /PID <PID>
```

### Database Issues

```cmd
cd backend/auth-service

# Reset database
npm run db:reset

# Regenerate Prisma client
npm run db:generate
```

### Build Issues

```cmd
# Clean build files
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Technology Stack

### Frontend
- **Next.js 15**: React framework
- **TypeScript 5.6**: Type safety
- **HeroUI 2.8**: React components
- **Tailwind CSS 4.1**: CSS framework
- **Framer Motion**: Animations
- **React Query**: Data fetching
- **React Hook Form**: Form handling
- **Zod**: Schema validation

### Backend
- **Express.js**: Web framework
- **TypeScript 5.3**: Type safety
- **Prisma 6.12**: Database ORM
- **SQLite**: Database (Development)
- **JWT**: Authentication
- **LDAP**: Directory services
- **Redis**: Caching
- **Winston**: Logging

### DevOps
- **Health Checks**: Service monitoring
- **Environment Variables**: Configuration
- **Logging**: Structured logging

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Run quality checks
5. Submit pull request

## 📄 License

MIT License - ดูรายละเอียดใน [LICENSE](LICENSE)

## 🆘 Support

หากมีปัญหาหรือคำถาม กรุณาสร้าง issue ใน repository หรือติดต่อทีมพัฒนา

---

**RPP Portal Team** - Built with ❤️ using modern technologies 