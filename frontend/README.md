# My App

แอปพลิเคชันที่สร้างด้วย [Next.js](https://nextjs.org/) และ [HeroUI](https://heroui.com/)

## 🚀 การเริ่มต้น

ติดตั้ง dependencies:

```bash
npm install
# หรือ
yarn install
# หรือ
pnpm install
# หรือ
bun install
```

รัน development server:

```bash
npm run dev
# หรือ
yarn dev
# หรือ
pnpm dev
# หรือ
bun dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์เพื่อดูผลลัพธ์

## 📁 โครงสร้างโปรเจค

```
├── app/                    # Next.js 13+ App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # หน้าแรก
│   ├── providers.tsx      # Theme และ HeroUI providers
│   └── error.tsx          # Error page
├── components/            # Components ที่นำกลับมาใช้ได้
│   ├── navbar.tsx        # Navigation component
│   ├── icons.tsx         # Icon components
│   └── primitives.ts     # Primitive components
├── config/               # ไฟล์การตั้งค่า
│   ├── site.ts          # การตั้งค่าเว็บไซต์
│   └── fonts.ts         # การตั้งค่าฟอนต์
├── styles/              # Global styles
│   └── globals.css      # Global CSS
└── types/               # TypeScript type definitions
```

## 🎨 คุณสมบัติ

- ⚡ **Next.js 15** กับ App Router
- 🎨 **HeroUI** components และ theme system
- 📱 **Responsive design**
- 🔍 **TypeScript** support
- 🛠️ **ESLint** และ **Prettier** configuration
- ⚡ **Turbopack** สำหรับการพัฒนาเร็วขึ้น

## 🛠️ Scripts ที่ใช้ได้

- `npm run dev` - เริ่ม development server
- `npm run build` - Build สำหรับ production
- `npm run start` - เริ่ม production server
- `npm run lint` - แก้ไข ESLint issues
- `npm run lint:check` - ตรวจสอบ ESLint issues
- `npm run format` - Format code ด้วย Prettier
- `npm run format:check` - ตรวจสอบ code formatting
- `npm run type-check` - รัน TypeScript type checking

## 📱 Responsive Design

โปรเจคนี้ responsive และมี:

- **Mobile-first** design approach
- **Responsive navigation** พร้อม mobile menu
