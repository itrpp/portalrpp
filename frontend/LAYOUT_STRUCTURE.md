# โครงสร้าง Layout ของระบบ Portal RPP

## 📁 โครงสร้าง Layout หลัก

### 🏠 Root Layout (`app/layout.tsx`)

- **หน้าที่**: Layout หลักของแอปพลิเคชัน
- **การทำงาน**: จัดการ HTML structure, meta tags, และ providers
- **การจัดการ**: แบ่ง Layout ตาม pathname
  - `/login` → Login Layout
  - `/dashboard/*` → Dashboard Layout
  - `/` และหน้าอื่นๆ → Landing Layout

## 🎯 Layout แยกตามหน้าที่

### 1. 🏠 Landing Layout (`app/(landing)/layout.tsx`)

**สำหรับ**: หน้าแรก (Landing Page)

- **Header**: Navigation Bar แบบ sticky
- **Content**: Container พร้อม padding
- **Footer**: Footer Component
- **Style**: Gradient background, backdrop blur

### 2. 🔐 Login Layout (`app/login/layout.tsx`)

**สำหรับ**: หน้าเข้าสู่ระบบ

- **Header**: Logo และชื่อโรงพยาบาล
- **Content**: Card container ตรงกลางหน้าจอ
- **Footer**: Copyright และข้อมูลระบบ
- **Style**: Centered layout, card design

### 3. 📊 Dashboard Layout (`app/dashboard/layout.tsx`)

**สำหรับ**: หน้าแดชบอร์ดและหน้าภายในระบบ

- **Sidebar**: Navigation menu ด้านซ้าย
- **Top Bar**: Breadcrumbs และ user menu
- **Content**: Main content area
- **Footer**: Dashboard footer
- **Style**: Full-screen layout, sidebar navigation

## 🔄 การทำงานของ Layout

### Route Groups

```
app/
├── layout.tsx              # Root Layout
├── (landing)/
│   ├── layout.tsx         # Landing Layout
│   └── page.tsx           # หน้าแรก
├── login/
│   ├── layout.tsx         # Login Layout
│   └── page.tsx           # หน้าเข้าสู่ระบบ
└── dashboard/
    ├── layout.tsx         # Dashboard Layout
    └── page.tsx           # หน้าแดชบอร์ด
```

### การจัดการ Layout

1. **Root Layout** ตรวจสอบ pathname
2. **เลือก Layout** ที่เหมาะสมตาม pathname
3. **Render children** ใน Layout ที่เลือก

## 🎨 Design Patterns

### Landing Page

- **Gradient background** สวยงาม
- **Sticky header** สำหรับ navigation
- **Responsive design** รองรับทุกอุปกรณ์
- **Hero section** สำหรับ presentation

### Login Page

- **Centered card** design
- **Clean layout** ไม่มี sidebar
- **Professional header** พร้อม logo
- **Minimal footer** สำหรับ copyright

### Dashboard

- **Sidebar navigation** สำหรับ menu
- **Top bar** สำหรับ breadcrumbs และ user menu
- **Full-screen content** area
- **Professional layout** สำหรับ admin

## 🚀 การใช้งาน

### การเพิ่มหน้าใหม่

1. **Landing pages**: ใส่ใน `app/(landing)/`
2. **Login pages**: ใส่ใน `app/login/`
3. **Dashboard pages**: ใส่ใน `app/dashboard/`

### การปรับแต่ง Layout

- **Landing Layout**: แก้ไข `app/(landing)/layout.tsx`
- **Login Layout**: แก้ไข `app/login/layout.tsx`
- **Dashboard Layout**: แก้ไข `app/dashboard/layout.tsx`

## 📱 Responsive Design

### Mobile First

- **Landing**: Responsive grid และ hero section
- **Login**: Centered card บน mobile
- **Dashboard**: Collapsible sidebar บน mobile

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🎯 Best Practices

### Performance

- **Code splitting** ด้วย Next.js App Router
- **Lazy loading** สำหรับ components
- **Optimized images** ด้วย Next.js Image

### Accessibility

- **Semantic HTML** structure
- **ARIA labels** สำหรับ screen readers
- **Keyboard navigation** support
- **Color contrast** ที่เหมาะสม

### SEO

- **Meta tags** ใน Root Layout
- **Structured data** สำหรับ search engines
- **Open Graph** tags สำหรับ social media

## 🔧 การพัฒนา

### Development Commands

```bash
# รัน development server
npm run dev

# Build สำหรับ production
npm run build

# รัน production server
npm run start
```

### URLs สำหรับการพัฒนา

- **Frontend**: http://localhost:3000
- **Landing Page**: http://localhost:3000/
- **Login Page**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

---

_อัปเดตล่าสุด: 2024_ _เวอร์ชัน: 1.0.0_ _ผู้พัฒนา: ฝ่ายวิชาการ โรงพยาบาลราชพิพัฒน์_
