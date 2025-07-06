"use client";

import { useAuth } from "@/contexts/NextAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ด</h1>
              <p className="mt-2 text-gray-600">ยินดีต้อนรับ, {user?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* สถิติผู้ใช้ */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-blue-600 text-2xl">👤</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          บทบาท
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {user?.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* สถานะระบบ */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-green-600 text-2xl">✅</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          สถานะระบบ
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          ออนไลน์
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* เวลาเข้าสู่ระบบ */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-purple-600 text-2xl">🕐</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          เข้าสู่ระบบล่าสุด
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {new Date().toLocaleDateString("th-TH")}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* เมนูด่วน */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                เมนูด่วน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a
                  href="/profile"
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="text-blue-600 text-3xl mb-2">👤</div>
                  <h3 className="text-lg font-medium text-gray-900">โปรไฟล์</h3>
                  <p className="text-gray-600">จัดการข้อมูลส่วนตัว</p>
                </a>

                {user?.role === "admin" && (
                  <a
                    href="/admin"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <div className="text-green-600 text-3xl mb-2">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900">
                      จัดการผู้ใช้
                    </h3>
                    <p className="text-gray-600">จัดการบัญชีผู้ใช้</p>
                  </a>
                )}

                <a
                  href="/settings"
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="text-purple-600 text-3xl mb-2">🔧</div>
                  <h3 className="text-lg font-medium text-gray-900">ตั้งค่า</h3>
                  <p className="text-gray-600">ตั้งค่าระบบ</p>
                </a>

                <a
                  href="/help"
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="text-orange-600 text-3xl mb-2">❓</div>
                  <h3 className="text-lg font-medium text-gray-900">
                    ช่วยเหลือ
                  </h3>
                  <p className="text-gray-600">คู่มือการใช้งาน</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
