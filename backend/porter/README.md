# Porter gRPC Service

บริการ Porter เป็น backend สำหรับจัดการคำขอเคลื่อนย้ายผู้ป่วย (porter request) ที่ทำงานผ่าน gRPC และใช้ Prisma/MySQL เป็นชั้นข้อมูลหลัก รองรับทั้งการจัดการคำขอ การตั้งค่าสถานที่ รวมถึงการจัดการเจ้าหน้าที่และรูปแบบการจ้างงาน

## สถาปัตยกรรมโดยสังเขป

- **Interface:** gRPC (`proto/porter.proto`) ครอบคลุม Porter Request, Location Settings, Employee, Employment Type, Position และ Health Check
- **Application Layer:** แยก `handlers/` สำหรับ gRPC server, `services/` สำหรับ business logic, `utils/` สำหรับ shared helpers (เช่น enum mapper, gRPC error handler, event emitter)
- **Data Layer:** Prisma ORM (`prisma/schema.prisma`) เชื่อมต่อ MySQL ผ่าน `DATABASE_URL`
- **Realtime Update:** ใช้ `EventEmitter` กระจาย event จาก service ไปยัง gRPC stream (`streamPorterRequests`)

## โครงสร้างโฟลเดอร์หลัก

```
backend/porter
├── src
│   ├── server.ts              # Bootstrap gRPC server + Prisma connection
│   ├── handlers/              # gRPC handlers (thin layer)
│   ├── services/              # Business logic + Prisma operations
│   ├── config/                # env + database initialization
│   ├── utils/                 # Shared helpers (enum mapper, ApiError, async handler, gRPC error helper, event emitter)
│   └── types/                 # Shared TS types สำหรับ handlers/services
├── proto/porter.proto         # gRPC contract
├── prisma/schema.prisma       # Database schema
├── dist/                      # ผลลัพธ์ build (tsc)
└── scripts (.sh)              # run/start/clean up helper scripts
```

## การตั้งค่าและรันระบบ

1. **ติดตั้ง dependencies**
   ```bash
   cd backend/porter
   npm install
   ```
2. **เตรียมไฟล์สภาพแวดล้อม**
   ```bash
   cp .env.example .env
   # ปรับ NODE_ENV, PORT และ DATABASE_URL ให้ตรงกับสภาพแวดล้อมจริง
   ```
3. **Prisma generate (จำเป็นหลังแก้ schema หรือดึง repo ครั้งแรก)**
   ```bash
   npm run prisma:generate
   ```
4. **Update database schema (ถ้าต้องการ migrate)**
   ```bash
   npm run prisma:migrate
   ```
5. **โหมดพัฒนา**
   ```bash
   npm run dev          # tsx watch server.ts พร้อม reload อัตโนมัติ
   ```
6. **โหมด production**
   ```bash
   npm run build        # คอมไพล์ไปที่ dist/
   npm run start        # รัน gRPC server จาก dist/server.js
   ```
   หรือใช้งาน `run.sh`/`start_server.sh` เพื่อผนวกกับ PM2

## สคริปต์สำคัญ

| คำสั่ง            | ความหมาย |
|-------------------|-----------|
| `npm run dev`      | รัน gRPC server แบบ hot reload ผ่าน tsx |
| `npm run build`    | build TypeScript ด้วย `tsc` |
| `npm run start`    | รันไฟล์ build จาก `dist/server.js` |
| `npm run lint`     | ESLint ตรวจสอบมาตรฐานโค้ด |
| `npm run typecheck`| TypeScript type check โดยไม่ build |
| `npm run format`   | จัด format ด้วย Prettier |
| `npm run prisma:*` | คำสั่ง Prisma (generate/migrate/studio) |

## การดูแลรักษา/Best Practices

- ใช้ `handleGrpcError` ใน `utils/grpcError.ts` เพื่อจัดการ error mapping ให้สอดคล้องกับ gRPC status และลดโค้ดซ้ำใน handlers
- แยก business logic ไว้ใน `services/` เพื่อให้ handler บางและ test ได้ง่าย
- Enum/ค่าคงที่ควรผ่าน `utils/enumMapper.ts` เพื่อป้องกันการแมปค่าผิดฝั่งระหว่าง Proto ↔ Prisma
- เมื่อมีการเพิ่ม service หรือ RPC ใหม่:
  1. กำหนดสัญญาใน `proto/porter.proto`
  2. รัน `npm run proto` (ถ้ามี codegen เพิ่มเติม) หรือ update handler/service ตาม pattern เดิม
  3. เขียน unit test/automation (ถ้ามีโครงทดสอบเสริม)

## Health Check และการเฝ้าระวัง

- RPC `HealthCheck` คืนค่าจาก `porterService.healthCheck()` (SELECT 1) เพื่อให้ monitoring ตรวจสอบได้
- Server มี process signal handlers (`SIGTERM`, `SIGINT`) เพื่อ shutdown gracefully และปิด Prisma connection
- Stream `StreamPorterRequests` จะ subscribe ผ่าน EventEmitter และเคลียร์ listener เมื่อ client cancel/end

## คุณภาพโค้ดและการตรวจสอบก่อน deploy

1. `npm run lint`
2. `npm run typecheck`
3. (ถ้ามี test เพิ่มเติม) `npm test`
4. ตรวจสอบ log gRPC server ไม่มี error ก่อน promote ขึ้น environment จริง

## บันทึกการทำความสะอาดล่าสุด

- ปรับโครงสร้างคอมเมนต์ใน `src/`, `proto/`, `prisma/` ให้สั้น กระชับ และเป็นมาตรฐานเดียวกัน
- เพิ่ม `utils/grpcError.ts` เพื่อรวมการแมป Prisma error → gRPC status และลดโค้ดซ้ำในทุก handler
- ปรับ handler ทั้งหมดให้ใช้ helper ใหม่ ส่งผลให้การจัดการ error/ข้อความตอบกลับมีความสม่ำเสมอ
- จัดทำ README ฉบับนี้เพื่อสรุปขั้นตอนการใช้งานและแนวปฏิบัติสำคัญของโปรเจกต์

