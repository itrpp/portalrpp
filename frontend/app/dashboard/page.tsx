"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CustomNavbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Progress,
} from "@heroui/react";
import {
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  HeartIcon,
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@/components/icons";

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    {
      title: "ผู้ใช้ทั้งหมด",
      value: "1,247",
      change: "+12%",
      changeType: "positive",
      icon: UsersIcon,
    },
    {
      title: "ระบบออนไลน์",
      value: "15/15",
      change: "100%",
      changeType: "positive",
      icon: CheckCircleIcon,
    },
    {
      title: "การแจ้งเตือน",
      value: "3",
      change: "ใหม่",
      changeType: "warning",
      icon: BellIcon,
    },
    {
      title: "เวลาทำงาน",
      value: "8.5 ชม.",
      change: "ปกติ",
      changeType: "neutral",
      icon: ClockIcon,
    },
  ];

  const quickActions = [
    {
      title: "จัดการผู้ใช้",
      description: "เพิ่ม แก้ไข ลบผู้ใช้ในระบบ",
      icon: UsersIcon,
      color: "primary",
      href: "/admin/users",
    },
    {
      title: "ตั้งค่าระบบ",
      description: "ปรับแต่งการตั้งค่าต่างๆ",
      icon: Cog6ToothIcon,
      color: "secondary",
      href: "/settings",
    },
    {
      title: "บริการสุขภาพ",
      description: "จัดการข้อมูลผู้ป่วยและบริการ",
      icon: HeartIcon,
      color: "success",
      href: "/health",
    },
    {
      title: "รายงานสถิติ",
      description: "ดูข้อมูลสถิติและรายงาน",
      icon: ChartBarIcon,
      color: "warning",
      href: "/reports",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <CustomNavbar />

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ยินดีต้อนรับ, {user?.name || "ผู้ใช้"}
            </h1>
            <p className="text-gray-600">
              {user?.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"} • {user?.email}
            </p>
            {isClient && currentTime && (
              <p className="text-sm text-gray-500 mt-2" suppressHydrationWarning>
                {currentTime.toLocaleString("th-TH", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Chip
                      size="sm"
                      color={
                        stat.changeType === "positive"
                          ? "success"
                          : stat.changeType === "warning"
                          ? "warning"
                          : "default"
                      }
                      variant="flat"
                    >
                      {stat.change}
                    </Chip>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              การดำเนินการด่วน
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <Card
                  key={index}
                  className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  isPressable
                  onPress={() => router.push(action.href)}
                >
                  <CardBody className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <action.icon className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* System Health */}
            <Card>
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-900">
                  สถานะระบบ
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">สุขภาพระบบ</span>
                    <Chip color="success" variant="flat" size="sm">
                      100%
                    </Chip>
                  </div>
                  <Progress 
                    value={100} 
                    color="success" 
                    size="sm" 
                    aria-label="ความคืบหน้าสุขภาพระบบ 100%"
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">การตอบสนอง</span>
                    <span className="text-green-600 font-medium">ดี</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">การใช้งาน CPU</span>
                    <span className="text-blue-600 font-medium">45%</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">หน่วยความจำ</span>
                    <span className="text-orange-600 font-medium">78%</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-900">
                  กิจกรรมล่าสุด
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        เข้าสู่ระบบสำเร็จ
                      </p>
                      <p className="text-xs text-gray-500">2 นาทีที่แล้ว</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        อัพเดทข้อมูลผู้ใช้
                      </p>
                      <p className="text-xs text-gray-500">15 นาทีที่แล้ว</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        การแจ้งเตือนระบบ
                      </p>
                      <p className="text-xs text-gray-500">1 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        สำรองข้อมูลอัตโนมัติ
                      </p>
                      <p className="text-xs text-gray-500">2 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
} 