import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            RPP Portal
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            ระบบจัดการพอร์ทัลแบบ Microservices ที่ทันสมัยและมีประสิทธิภาพ
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-blue-600 text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">Authentication</h3>
              <p className="text-gray-600 mb-4">ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT</p>
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                เข้าสู่ระบบ →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-green-600 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-gray-600 mb-4">จัดการข้อมูลผู้ใช้และโปรไฟล์</p>
              <Link href="/users" className="text-green-600 hover:text-green-800 font-medium">
                จัดการผู้ใช้ →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-purple-600 text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className="text-gray-600 mb-4">ภาพรวมและสถิติของระบบ</p>
              <Link href="/dashboard" className="text-purple-600 hover:text-purple-800 font-medium">
                แดชบอร์ด →
              </Link>
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
        </div>
      </div>
    </div>
  )
}
