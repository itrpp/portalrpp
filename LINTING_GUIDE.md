# 🔍 Linting และ Code Formatting Guide

## ภาพรวม

โปรเจค RPP Portal ใช้ระบบ linting และ code formatting ที่ครอบคลุมเพื่อรักษาคุณภาพโค้ดและรูปแบบการเขียนที่สม่ำเสมอ

## 🛠️ เครื่องมือที่ใช้

- **ESLint**: ตรวจสอบคุณภาพโค้ดและรูปแบบการเขียน
- **Prettier**: จัดรูปแบบโค้ดอัตโนมัติ
- **Husky**: Pre-commit hooks
- **lint-staged**: รัน linting เฉพาะไฟล์ที่เปลี่ยนแปลง

## 📁 โครงสร้าง Config Files

```
portalrpp/
├── .prettierrc.js              # Prettier config หลัก
├── .prettierignore            # ไฟล์ที่ไม่ต้อง format
├── .lintstagedrc.json         # lint-staged config
├── .husky/
│   └── pre-commit             # Pre-commit hook
├── frontend/
│   └── eslint.config.mjs      # ESLint config สำหรับ Frontend (Next.js)
└── backend/
    ├── api-gateway/.eslintrc.js
    ├── auth-service/.eslintrc.js
    └── user-service/.eslintrc.js
```

## 🚀 คำสั่งที่ใช้งาน

### Lint ทั้งโปรเจค

```bash
# ตรวจสอบ lint ทั้งหมด
npm run lint

# แก้ไข lint issues อัตโนมัติ
npm run lint:fix
```

### Lint แยกตาม Service

```bash
# Frontend
npm run lint:frontend
npm run lint:fix:frontend

# Backend ทั้งหมด
npm run lint:backend
npm run lint:fix:backend

# แยกตาม service
npm run lint:gateway
npm run lint:auth
npm run lint:user
```

### Code Formatting

```bash
# ตรวจสอบการ format
npm run format:check

# Format โค้ดทั้งหมด
npm run format
```

## ⚙️ การตั้งค่า ESLint

### Frontend (Next.js + React)

- ใช้ `next/core-web-vitals` และ `next/typescript`
- รองรับ React hooks และ JSX
- ตรวจสอบ accessibility rules
- Integration กับ Prettier

### Backend (Node.js + TypeScript)

- ใช้ `eslint:recommended`
- รองรับ TypeScript parsing
- อนุญาต `console.log` ใน backend services
- ตรวจสอบ unused variables (ยกเว้นที่ขึ้นต้นด้วย `_`)

## 🎨 การตั้งค่า Prettier

```javascript
{
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
}
```

## 🔒 Pre-commit Hooks

เมื่อทำการ commit ระบบจะรันการตรวจสอบต่อไปนี้อัตโนมัติ:

1. **Frontend Linting**: ตรวจสอบและแก้ไข React/TypeScript code
2. **Backend Linting**: ตรวจสอบและแก้ไข Node.js/TypeScript code
3. **Code Formatting**: ตรวจสอบการ format ด้วย Prettier

หาก commit ไม่ผ่านการตรวจสอบ จะไม่สามารถ commit ได้

## 🛠️ การแก้ปัญหา

### ปัญหาที่พบบ่อย

1. **ESLint errors**: รัน `npm run lint:fix` เพื่อแก้ไขอัตโนมัติ
2. **Prettier formatting**: รัน `npm run format` เพื่อ format โค้ด
3. **Pre-commit hook ล้มเหลว**: แก้ไข lint errors ก่อนแล้วลอง commit ใหม่

### การปิด Rules เฉพาะจุด

```typescript
// ปิด ESLint rule สำหรับบรรทัดเดียว
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response.data;

// ปิด Prettier สำหรับบล็อกโค้ด
// prettier-ignore
const matrix = [
  [1, 2, 3],
  [4, 5, 6]
];
```

## 📋 Warnings ที่อนุญาต

ระบบปัจจุบันมี warnings ที่ยอมรับได้:

- `no-console` warnings ใน frontend (เพื่อ debugging)
- `react-hooks/exhaustive-deps` warnings (ต้องตรวจสอบแต่ละกรณี)
- TypeScript version warnings (ใช้ version ที่ใหม่กว่า officially supported)

## 🔄 การอัปเดต Dependencies

```bash
# อัปเดต ESLint และ Prettier
npm update eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser

# อัปเดตใน frontend
cd frontend && npm update eslint prettier

# อัปเดตใน backend services
cd backend/api-gateway && npm update eslint prettier
cd ../auth-service && npm update eslint prettier
cd ../user-service && npm update eslint prettier
```

## 📝 Best Practices

1. **รัน lint ก่อน commit เสมอ**: `npm run lint:fix`
2. **ใช้ prettier extension ใน IDE** สำหรับ format อัตโนมัติ
3. **ตรวจสอบ warnings** และแก้ไขที่จำเป็น
4. **ไม่ปิด rules โดยไม่จำเป็น** ใช้เฉพาะกรณีพิเศษ
5. **อ่าน error messages** เพื่อเข้าใจปัญหาและแก้ไขอย่างถูกต้อง

## 🎯 เป้าหมาย

- ✅ Code quality ที่สม่ำเสมอ
- ✅ รูปแบบการเขียนที่เป็นมาตรฐาน
- ✅ ลดข้อผิดพลาดในโค้ด
- ✅ เพิ่มความสามารถในการ maintain โค้ด
- ✅ ทำงานร่วมกันในทีมได้ดีขึ้น

---

สำหรับข้อมูลเพิ่มเติม กรุณาดูที่:

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
