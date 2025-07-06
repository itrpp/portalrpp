"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/NextAuthContext";
import Navbar from "@/components/Navbar";
import { useState, useEffect, useCallback } from "react";

interface ServiceStatus {
  name: string;
  port: number;
  status: "online" | "offline" | "checking";
  lastChecked?: Date;
}

export default function Home() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", port: 3001, status: "checking" },
    { name: "Auth Service", port: 3002, status: "checking" },
    { name: "User Service", port: 3003, status: "checking" },
    { name: "Frontend", port: 3000, status: "online" }, // Frontend is always online if we can see this page
  ]);

  const checkServiceHealth = async (port: number): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://localhost:${port}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  };

  const checkAllServices = useCallback(async () => {
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        if (service.port === 3000) {
          // Frontend is always online if we can see this page
          return {
            ...service,
            status: "online" as const,
            lastChecked: new Date(),
          };
        }

        const isOnline = await checkServiceHealth(service.port);
        return {
          ...service,
          status: isOnline ? ("online" as const) : ("offline" as const),
          lastChecked: new Date(),
        };
      }),
    );
    setServices(updatedServices);
  }, [services]);

  useEffect(() => {
    // Check immediately on mount
    checkAllServices();

    // Set up interval to check every 5 seconds
    const interval = setInterval(checkAllServices, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [checkAllServices]);

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-red-500";
      case "checking":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return "ออนไลน์";
      case "offline":
        return "ออฟไลน์";
      case "checking":
        return "กำลังตรวจสอบ...";
      default:
        return "ไม่ทราบสถานะ";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">RPP Portal</h1>
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
              <p className="text-gray-600 mb-4">
                ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT
              </p>
              {user ? (
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  แดชบอร์ด →
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  เข้าสู่ระบบ →
                </Link>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-green-600 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-gray-600 mb-4">จัดการข้อมูลผู้ใช้และโปรไฟล์</p>
              {user ? (
                <Link
                  href="/profile"
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  โปรไฟล์ →
                </Link>
              ) : (
                <Link
                  href="/auth/register"
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  สมัครสมาชิก →
                </Link>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-purple-600 text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className="text-gray-600 mb-4">ภาพรวมและสถิติของระบบ</p>
              {user ? (
                <Link
                  href="/dashboard"
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  แดชบอร์ด →
                </Link>
              ) : (
                <span className="text-gray-400">ต้องเข้าสู่ระบบ</span>
              )}
            </div>
          </div>

          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">สถานะระบบ</h2>
              <div className="text-sm text-gray-500">
                อัพเดทล่าสุด:{" "}
                {services[0]?.lastChecked?.toLocaleTimeString("th-TH") ||
                  "กำลังตรวจสอบ..."}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {services.map((service, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`text-2xl mb-2 ${getStatusColor(service.status)}`}
                  >
                    {service.status === "checking" ? "◐" : "●"}
                  </div>
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-gray-600">
                    Port {service.port}
                  </div>
                  <div
                    className={`text-xs mt-1 ${getStatusColor(service.status)}`}
                  >
                    {getStatusText(service.status)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={checkAllServices}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                ตรวจสอบสถานะทันที
              </button>
            </div>
          </div>

          {user && (
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                ยินดีต้อนรับ, {user.name}!
              </h3>
              <p className="text-blue-700 mb-4">
                คุณเข้าสู่ระบบในฐานะ{" "}
                {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
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
  );
}
