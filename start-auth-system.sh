#!/bin/bash

echo "🚀 Starting RPP Portal Authentication System..."

# สร้าง environment variables สำหรับ frontend
echo "📝 Creating environment variables..."
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# ติดตั้ง dependencies สำหรับ frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# กลับไปที่ root directory
cd ..

# เริ่มต้นระบบด้วย Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

# รอให้ services เริ่มต้น
echo "⏳ Waiting for services to start..."
sleep 10

# ตรวจสอบสถานะ services
echo "🔍 Checking service status..."
curl -s http://localhost:3001/health && echo "✅ API Gateway is running"
curl -s http://localhost:3002/health && echo "✅ Auth Service is running"
curl -s http://localhost:3003/health && echo "✅ User Service is running"

# เริ่มต้น frontend
echo "🌐 Starting frontend..."
cd frontend
npm run dev &

echo ""
echo "🎉 RPP Portal Authentication System is now running!"
echo ""
echo "📋 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API Gateway: http://localhost:3001"
echo "   Auth Service: http://localhost:3002"
echo "   User Service: http://localhost:3003"
echo ""
echo "🔐 Test Account:"
echo "   Email: admin@rpp.com"
echo "   Password: password"
echo ""
echo "📚 Available Features:"
echo "   ✅ User Login/Register"
echo "   ✅ JWT Authentication"
echo "   ✅ Role-based Authorization"
echo "   ✅ User Profile Management"
echo "   ✅ Admin Dashboard"
echo "   ✅ Protected Routes"
echo ""
echo "Press Ctrl+C to stop the system"

# Keep the script running
wait 