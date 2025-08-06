# ========================================
# REVENUE SERVICE DOCKERFILE
# ========================================

# ใช้ Node.js 18 Alpine image
FROM node:18-alpine

# ตั้งค่า working directory
WORKDIR /app

# ติดตั้ง dependencies สำหรับ build
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# สร้าง directories ที่จำเป็น
RUN mkdir -p uploads processed backup temp logs

# ตั้งค่า permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"] 