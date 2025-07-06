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
- ✅ **JWT Token Management**
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
│   ├── admin/page.tsx              # แดชบอร์ดผู้ดูแลระบบ
│   ├── unauthorized/page.tsx       # หน้าไม่มีสิทธิ์
│   ├── layout.tsx                  # Layout หลัก
│   └── page.tsx                    # หน้าหลัก
├── components/
│   ├── Navbar.tsx                  # Navigation Bar
│   └── ProtectedRoute.tsx          # Route Protection
└── contexts/
    └── AuthContext.tsx             # Authentication Context
```

### Backend Services
```
backend/
├── auth-service/                   # บริการยืนยันตัวตน
├── user-service/                   # บริการจัดการผู้ใช้
└── api-gateway/                    # API Gateway
```

## 🔧 การใช้งาน

### 1. Authentication Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();
  
  // ใช้งาน authentication functions
}
```

### 2. Protected Routes

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      {/* เนื้อหาสำหรับ admin เท่านั้น */}
    </ProtectedRoute>
  );
}
```

### 3. Navigation

```tsx
import Navbar from '@/components/Navbar';

function Layout({ children }) {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
}
```

## 🛠️ Development

### การพัฒนา Frontend

```bash
cd frontend
npm install
npm run dev
```

### การพัฒนา Backend

```bash
# เริ่มต้น services ด้วย Docker
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

### User Service (Port 3003)
- `GET /user/:id` - ดึงข้อมูลผู้ใช้
- `PUT /user/:id` - อัปเดตข้อมูลผู้ใช้
- `GET /users` - ดึงรายชื่อผู้ใช้ทั้งหมด (admin only)

### API Gateway (Port 3001)
- `GET /api/auth/*` - Proxy ไปยัง Auth Service
- `GET /api/users/*` - Proxy ไปยัง User Service

## 🔒 Security Features

- **JWT Token Authentication**
- **Password Hashing** (bcrypt)
- **CORS Protection**
- **Helmet Security Headers**
- **Input Validation**
- **Role-based Authorization**

## 🎯 User Flows

### 1. การเข้าสู่ระบบ
1. ผู้ใช้กรอก email/password
2. ระบบตรวจสอบข้อมูล
3. สร้าง JWT token
4. เก็บ token ใน localStorage
5. Redirect ไปยัง dashboard

### 2. การสมัครสมาชิก
1. ผู้ใช้กรอกข้อมูลสมัครสมาชิก
2. ระบบตรวจสอบข้อมูลซ้ำ
3. Hash password
4. สร้างบัญชีผู้ใช้
5. Auto login หลังสมัครสำเร็จ

### 3. การจัดการสิทธิ์
1. ตรวจสอบ role ของผู้ใช้
2. ป้องกันการเข้าถึงหน้าที่ไม่มีสิทธิ์
3. แสดงเมนูตาม role
4. Admin สามารถเปลี่ยน role ได้

## 🚨 Error Handling

- **Network Errors**: แสดงข้อความแจ้งเตือน
- **Authentication Errors**: Redirect ไปหน้า login
- **Authorization Errors**: แสดงหน้า unauthorized
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
2. **Dashboard**: ตรวจสอบข้อมูลผู้ใช้
3. **Profile**: แก้ไขโปรไฟล์
4. **Admin**: จัดการผู้ใช้ (admin only)
5. **Authorization**: ทดสอบการป้องกันหน้า

## 🚀 Next Steps

### Features ที่สามารถเพิ่มเติมได้

- [ ] **Password Reset**
- [ ] **Email Verification**
- [ ] **Two-Factor Authentication**
- [ ] **Session Management**
- [ ] **Audit Logs**
- [ ] **User Activity Tracking**
- [ ] **Advanced Role Management**
- [ ] **API Rate Limiting**

### การปรับปรุงเพิ่มเติม

- [ ] **Unit Testing**
- [ ] **Integration Testing**
- [ ] **Database Integration**
- [ ] **Redis for Session Storage**
- [ ] **OAuth Integration**
- [ ] **Mobile App Support**

## 💡 Tips

1. **Development**: ใช้ `npm run dev` สำหรับ hot reload
2. **Production**: ใช้ `docker-compose up -d` สำหรับ production
3. **Debugging**: ตรวจสอบ console และ network tab
4. **API Testing**: ใช้ Postman หรือ curl สำหรับทดสอบ API

---

**สร้างโดย**: RPP Portal Development Team  
**วันที่**: $(date)  
**เวอร์ชัน**: 1.0.0 