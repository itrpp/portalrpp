# RPP Portal Authentication System

ระบบจัดการ Authentication และ Authorization ที่สมบูรณ์สำหรับ RPP Portal

## 🚀 Quick Start

### วิธีเริ่มต้นระบบ

```bash
# ให้สิทธิ์การรันสคริปต์
chmod +x start-auth-system.sh

# เริ่มต้นระบบ
./start-auth-system.sh
```

### การเข้าถึงระบบ

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Auth Service**: http://localhost:3002
- **User Service**: http://localhost:3003

### บัญชีทดสอบ

```
Email: admin@rpp.com
Password: password
Role: admin
```

## 📋 Features ที่พร้อมใช้งาน

### 🔐 Authentication

- ✅ **หน้าเข้าสู่ระบบ** (`/auth/login`)
- ✅ **หน้าสมัครสมาชิก** (`/auth/register`)
- ✅ **JWT Token Management** (7 วันหมดอายุ)
- ✅ **Refresh Token System** (30 วันหมดอายุ)
- ✅ **Auto Token Refresh** (ต่ออายุอัตโนมัติ)
- ✅ **Auto Token Verification**
- ✅ **Secure Logout**

### 🛡️ Authorization

- ✅ **Role-based Access Control**
- ✅ **Protected Routes**
- ✅ **Admin-only Pages**
- ✅ **Unauthorized Page**

### 👤 User Management

- ✅ **User Dashboard** (`/dashboard`)
- ✅ **User Profile** (`/profile`)
- ✅ **Profile Editing**
- ✅ **User Information Display**

### 👑 Admin Features

- ✅ **Admin Dashboard** (`/admin`)
- ✅ **User List Management**
- ✅ **Role Management**
- ✅ **User Statistics**

### 🎨 UI/UX

- ✅ **Responsive Design**
- ✅ **Modern UI with Tailwind CSS**
- ✅ **Loading States**
- ✅ **Error Handling**
- ✅ **Navigation Bar**
- ✅ **User Menu**

## 🔒 Token Management System

### Token Configuration

- **Access Token**: หมดอายุใน 7 วัน (ปรับได้ผ่าน `ACCESS_TOKEN_EXPIRY`)
- **Refresh Token**: หมดอายุใน 30 วัน (ปรับได้ผ่าน `REFRESH_TOKEN_EXPIRY`)
- **Auto Refresh**: ต่ออายุอัตโนมัติทุก 6 วัน

### Token Endpoints

- `POST /api/auth/login` - เข้าสู่ระบบ (ได้ access + refresh token)
- `POST /api/auth/register` - สมัครสมาชิก (ได้ access + refresh token)
- `POST /api/auth/refresh` - ต่ออายุ token
- `POST /api/auth/verify` - ตรวจสอบ token
- `POST /api/auth/logout` - ออกจากระบบ (ลบ refresh token)

### Environment Variables สำหรับ Token

```env
ACCESS_TOKEN_EXPIRY=7d        # 7 วัน
REFRESH_TOKEN_EXPIRY=30d      # 30 วัน
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret-key
```

## 🏗️ Architecture

### Frontend (Next.js)

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          # หน้าเข้าสู่ระบบ
│   │   └── register/page.tsx       # หน้าสมัครสมาชิก
│   ├── dashboard/page.tsx          # แดชบอร์ดผู้ใช้
│   ├── profile/page.tsx            # โปรไฟล์ผู้ใช้
│   ├── admin/page.tsx              # แดชบอร์ดแอดมิน
│   └── unauthorized/page.tsx       # หน้าไม่มีสิทธิ์
├── components/
│   ├── Navbar.tsx                  # แถบนำทาง
│   └── ProtectedRoute.tsx          # ป้องกันเส้นทาง
└── contexts/
    └── AuthContext.tsx             # จัดการสถานะ Authentication
```

### Backend (Microservices)

```
backend/
├── api-gateway/                    # API Gateway (Port 3001)
│   └── src/index.ts
├── auth-service/                   # Authentication Service (Port 3002)
│   └── src/index.ts
├── user-service/                   # User Management Service (Port 3003)
│   └── src/index.ts
└── shared/                         # Shared utilities
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm หรือ yarn

### Manual Setup

```bash
# Clone repository
git clone <repository-url>
cd portalrpp

# Install dependencies
npm install

# Setup backend services
cd backend/auth-service
npm install
cd ../user-service
npm install
cd ../api-gateway
npm install

# Setup frontend
cd ../../frontend
npm install

# Return to root
cd ..
```

### Docker Setup

```bash
# Build and start all services
docker-compose up -d

# หรือรันแยกแต่ละ service
cd backend/auth-service
npm install
npm run dev
```

## 📊 API Endpoints

### Authentication Service (Port 3002)

- `POST /login` - เข้าสู่ระบบ
- `POST /register` - สมัครสมาชิก
- `POST /verify` - ตรวจสอบ token
- `POST /refresh` - ต่ออายุ token
- `POST /logout` - ออกจากระบบ

### User Service (Port 3003)

- `GET /user/:id` - ดึงข้อมูลผู้ใช้
- `PUT /user/:id` - อัปเดตข้อมูลผู้ใช้
- `GET /users` - ดึงรายชื่อผู้ใช้ทั้งหมด (admin only)

### API Gateway (Port 3001)

- `GET /api/auth/*` - Proxy ไปยัง Auth Service
- `GET /api/users/*` - Proxy ไปยัง User Service

## 🔒 Security Features

- **JWT Token Authentication** (7 วันหมดอายุ)
- **Refresh Token System** (30 วันหมดอายุ)
- **Auto Token Refresh** (ต่ออายุอัตโนมัติ)
- **Password Hashing** (bcrypt)
- **CORS Protection**
- **Helmet Security Headers**
- **Input Validation**
- **Role-based Authorization**
- **Secure Token Storage**

## 🎯 User Flows

### 1. การเข้าสู่ระบบ

1. ผู้ใช้กรอก email/password
2. ระบบตรวจสอบข้อมูล
3. สร้าง JWT access token (7 วัน) และ refresh token (30 วัน)
4. เก็บ tokens ใน localStorage
5. Redirect ไปยัง dashboard

### 2. การสมัครสมาชิก

1. ผู้ใช้กรอกข้อมูลสมัครสมาชิก
2. ระบบตรวจสอบข้อมูลซ้ำ
3. Hash password
4. สร้างบัญชีผู้ใช้
5. Auto login หลังสมัครสำเร็จ

### 3. การต่ออายุ Token

1. ระบบตรวจสอบ access token หมดอายุ
2. ใช้ refresh token ขอ access token ใหม่
3. อัปเดต tokens ใน localStorage
4. ทำงานต่อไปได้โดยไม่ต้อง login ใหม่

### 4. การจัดการสิทธิ์

1. ตรวจสอบ role ของผู้ใช้
2. ป้องกันการเข้าถึงหน้าที่ไม่มีสิทธิ์
3. แสดงเมนูตาม role
4. Admin สามารถเปลี่ยน role ได้

## 🚨 Error Handling

- **Network Errors**: แสดงข้อความแจ้งเตือน
- **Authentication Errors**: Redirect ไปหน้า login
- **Authorization Errors**: แสดงหน้า unauthorized
- **Token Expiry**: Auto refresh หรือ redirect ไป login
- **Validation Errors**: แสดงข้อความใต้ input field

## 🔄 State Management

ใช้ **React Context** สำหรับจัดการสถานะ authentication:

```tsx
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<Result>;
  register: (email: string, password: string, name: string) => Promise<Result>;
  logout: () => void;
  isLoading: boolean;
  refreshToken: () => Promise<boolean>;
}
```

## 📱 Responsive Design

- **Mobile-first approach**
- **Tailwind CSS breakpoints**
- **Responsive navigation**
- **Mobile-friendly forms**

## 🔍 Testing

### บัญชีทดสอบ

```javascript
// Admin Account
{
  email: "admin@rpp.com",
  password: "password",
  role: "admin"
}

// สามารถสมัครบัญชี user ใหม่ได้ที่หน้า register
```

### การทดสอบ Features

1. **Login/Register**: ทดสอบการเข้าสู่ระบบและสมัครสมาชิก
2. **Token Refresh**: ปิดเบราว์เซอร์แล้วเปิดใหม่ (ควรยัง login อยู่)
3. **Dashboard**: ตรวจสอบข้อมูลผู้ใช้
4. **Profile**: แก้ไขโปรไฟล์
5. **Admin**: จัดการผู้ใช้ (admin only)
6. **Authorization**: ทดสอบการป้องกันหน้า
7. **Auto Refresh**: ใช้งานต่อเนื่องเกิน 7 วัน

## 🚀 Next Steps

### Features ที่สามารถเพิ่มเติมได้

- [ ] **Password Reset**
- [ ] **Email Verification**
- [ ] **Two-Factor Authentication**
- [ ] **Advanced Session Management**
- [ ] **Audit Logs**
- [ ] **User Activity Tracking**
- [ ] **Advanced Role Management**
- [ ] **API Rate Limiting**
- [ ] **Remember Me Option**

### การปรับปรุงเพิ่มเติม

- [ ] **Unit Testing**
- [ ] **Integration Testing**
- [ ] **Database Integration**
- [ ] **Redis for Session Storage**
- [ ] **OAuth Integration**
- [ ] **Mobile App Support**
- [ ] **Token Blacklisting**

## 💡 Tips

1. **Development**: ใช้ `npm run dev` สำหรับ hot reload
2. **Production**: ใช้ `docker-compose up -d` สำหรับ production
3. **Debugging**: ตรวจสอบ console และ network tab
4. **API Testing**: ใช้ Postman หรือ curl สำหรับทดสอบ API
5. **Token Management**: ตรวจสอบ localStorage ใน DevTools
6. **Auto Refresh**: ระบบจะต่ออายุ token อัตโนมัติทุก 6 วัน

## 🔧 การตั้งค่า Token Expiry

### ปรับเวลาหมดอายุ Token

สร้างไฟล์ `.env` ใน `backend/auth-service/`:

```env
ACCESS_TOKEN_EXPIRY=7d        # Access token หมดอายุใน 7 วัน
REFRESH_TOKEN_EXPIRY=30d      # Refresh token หมดอายุใน 30 วัน
JWT_SECRET=your-super-secret-jwt-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key
```

### ตัวอย่างการตั้งค่า

```env
# สำหรับ Development
ACCESS_TOKEN_EXPIRY=1h        # 1 ชั่วโมง
REFRESH_TOKEN_EXPIRY=7d       # 7 วัน

# สำหรับ Production
ACCESS_TOKEN_EXPIRY=7d        # 7 วัน
REFRESH_TOKEN_EXPIRY=30d      # 30 วัน

# สำหรับ High Security
ACCESS_TOKEN_EXPIRY=15m       # 15 นาที
REFRESH_TOKEN_EXPIRY=1d       # 1 วัน
```

---

**สร้างโดย**: RPP Portal Development Team  
**วันที่**: $(date)  
**เวอร์ชัน**: 2.0.0 - Enhanced Token Management
