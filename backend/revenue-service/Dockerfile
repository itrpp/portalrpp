# ========================================
# REVENUE SERVICE DOCKERFILE
# ========================================

# ใช้ Node.js 18 Alpine image
FROM node:18-alpine

# ตั้งค่า working directory
WORKDIR /app

# ติดตั้ง dependencies สำหรับ build
RUN apk add --no-cache python3 make g++

# คัดลอก package files
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci --only=production

# คัดลอก source code
COPY . .

# Build TypeScript
RUN npm run build

# สร้างโฟลเดอร์ที่จำเป็น
RUN mkdir -p uploads processed backup temp logs

# ตั้งค่า permissions
RUN chmod -R 755 uploads processed backup temp logs

# เปิด port 3003
EXPOSE 3003

# ตั้งค่า environment variables
ENV NODE_ENV=production
ENV PORT=3003

# รัน application
CMD ["npm", "start"] 