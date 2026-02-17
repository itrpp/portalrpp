#!/bin/bash

# PM2 Configuration
APP_NAME="porter"
ECOSYSTEM_CONFIG="./ecosystem.config.js"
SCRIPT_CLEAN_UP="./clean_up.sh"
NODE_ENV="production"

# สร้างโฟลเดอร์ logs ถ้ายังไม่มี
mkdir -p logs

# ลบ process เก่าถ้ามี
pm2 delete $APP_NAME 2>/dev/null

# ใช้ ecosystem config เพื่อให้ memory monitoring ทำงานถูกต้อง
pm2 start $ECOSYSTEM_CONFIG --env $NODE_ENV

# แสดง status
pm2 status
