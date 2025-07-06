'use client';

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            RPP Portal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            ระบบจัดการพอร์ทัลแบบ Microservices ที่ทันสมัยและมีประสิทธิภาพ
          </p>
          
          {!user && (
            <div className="flex justify-center space-x-4 mb-12">
              <Link
                href="/auth/login"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/auth/register"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium border border-blue-600 hover:bg-blue-50 transition-colors"
              >
                สมัครสมาชิก
              </Link>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-blue-600 text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">Authentication</h3>
              <p className="text-gray-600 mb-4">ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT</p>
              {user ? (
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                  แดชบอร์ด →
                </Link>
              ) : (
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  เข้าสู่ระบบ →
                </Link>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-green-600 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-gray-600 mb-4">จัดการข้อมูลผู้ใช้และโปรไฟล์</p>
              {user ? (
                <Link href="/profile" className="text-green-600 hover:text-green-800 font-medium">
                  โปรไฟล์ →
                </Link>
              ) : (
                <Link href="/auth/register" className="text-green-600 hover:text-green-800 font-medium">
                  สมัครสมาชิก →
                </Link>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-purple-600 text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className="text-gray-600 mb-4">ภาพรวมและสถิติของระบบ</p>
              {user ? (
                <Link href="/dashboard" className="text-purple-600 hover:text-purple-800 font-medium">
                  แดชบอร์ด →
                </Link>
              ) : (
                <span className="text-gray-400">ต้องเข้าสู่ระบบ</span>
              )}
            </div>
          </div>
          
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">สถานะระบบ</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-green-500 text-2xl mb-2">●</div>
                <div className="font-medium">API Gateway</div>
                <div className="text-sm text-gray-600">Port 3001</div>
              </div>
              <div className="text-center">
                <div className="text-green-500 text-2xl mb-2">●</div>
                <div className="font-medium">Auth Service</div>
                <div className="text-sm text-gray-600">Port 3002</div>
              </div>
              <div className="text-center">
                <div className="text-green-500 text-2xl mb-2">●</div>
                <div className="font-medium">User Service</div>
                <div className="text-sm text-gray-600">Port 3003</div>
              </div>
              <div className="text-center">
                <div className="text-green-500 text-2xl mb-2">●</div>
                <div className="font-medium">Frontend</div>
                <div className="text-sm text-gray-600">Port 3000</div>
              </div>
            </div>
          </div>

          {user && (
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                ยินดีต้อนรับ, {user.name}!
              </h3>
              <p className="text-blue-700 mb-4">
                คุณเข้าสู่ระบบในฐานะ {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/dashboard"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  ไปยังแดชบอร์ด
                </Link>
                <Link
                  href="/profile"
                  className="bg-white text-blue-600 px-4 py-2 rounded-md border border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  โปรไฟล์
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
