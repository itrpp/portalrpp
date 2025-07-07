"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/NextAuthContext";
import CustomNavbar from "@/components/Navbar";
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Link as HeroLink,
  Chip,
  Divider,
  Progress,
} from "@heroui/react";
import { siteConfig } from "@/config/site";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  SignalIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

interface ServiceStatus {
  name: string;
  port: number;
  status: "online" | "offline" | "checking";
  lastChecked?: Date;
  description: string;
}

export default function Home() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "API Gateway",
      port: 3001,
      status: "checking",
      description: "ประตูเข้าสู่ระบบ API",
    },
    {
      name: "Auth Service",
      port: 3002,
      status: "checking",
      description: "บริการยืนยันตัวตน",
    },
    {
      name: "User Service",
      port: 3003,
      status: "checking",
      description: "บริการจัดการผู้ใช้",
    },
    {
      name: "Frontend",
      port: 3000,
      status: "online",
      description: "หน้าเว็บไซต์",
    },
  ]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const checkAllServices = async () => {
    setServices((prevServices) =>
      prevServices.map((service) => ({
        ...service,
        status:
          service.port === 3000 ? ("online" as const) : ("checking" as const),
      })),
    );

    const serviceChecks = await Promise.all(
      services.map(async (service) => {
        if (service.port === 3000) {
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

    setServices(serviceChecks);

    // Calculate health score
    const onlineServices = serviceChecks.filter(
      (s) => s.status === "online",
    ).length;
    const totalServices = serviceChecks.length;
    setHealthScore(Math.round((onlineServices / totalServices) * 100));
  };

  useEffect(() => {
    // Initialize client-side only state
    setIsClient(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkAllServices();
    intervalRef.current = setInterval(checkAllServices, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return "success";
      case "offline":
        return "danger";
      case "checking":
        return "warning";
      default:
        return "default";
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

  const getHealthColor = (score: number) => {
    if (score >= 90) return "success";
    if (score >= 70) return "warning";
    return "danger";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <CustomNavbar />

      {/* Hero Section */}
      <div className="relative">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 relative">
                <Image
                  src="/images/logo.png"
                  alt={siteConfig.hospitalName}
                  width={128}
                  height={128}
                  className="w-full h-full object-contain rounded-full shadow-lg"
                  priority
                />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {siteConfig.hospitalName}
            </h1>
            <p className="text-2xl text-blue-600 font-medium mb-6">
              {siteConfig.projectName}
            </p>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              ระบบจัดการข้อมูลแบบ Digital Transformation
              สำหรับการให้บริการที่มีคุณภาพและประสิทธิภาพ
            </p>

            {/* Current Time */}
            <div className="flex justify-center items-center mb-8">
              <ClockIcon className="w-6 h-6 text-gray-500 mr-2" />
              <span className="text-lg text-gray-600">
                {isClient && currentTime
                  ? currentTime.toLocaleString("th-TH", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "กำลังโหลด..."}
              </span>
            </div>

            {!user && (
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                <Button
                  as={Link}
                  href="/auth/login"
                  color="primary"
                  size="lg"
                  className="font-medium px-8 py-6 text-lg"
                  startContent={<ShieldCheckIcon className="w-5 h-5" />}
                >
                  เข้าสู่ระบบ
                </Button>
                <Button
                  as={Link}
                  href="/auth/register"
                  variant="bordered"
                  color="primary"
                  size="lg"
                  className="font-medium px-8 py-6 text-lg"
                  startContent={<UserGroupIcon className="w-5 h-5" />}
                >
                  สมัครสมาชิก
                </Button>
              </div>
            )}

            {user && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-12 max-w-md mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">ยินดีต้อนรับ</h3>
                <p className="text-gray-600 mb-4">{user.name}</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    as={Link}
                    href="/dashboard"
                    color="primary"
                    size="sm"
                    startContent={<ChartBarIcon className="w-4 h-4" />}
                  >
                    แดชบอร์ด
                  </Button>
                  <Button
                    as={Link}
                    href="/profile"
                    variant="bordered"
                    color="primary"
                    size="sm"
                    startContent={<UserGroupIcon className="w-4 h-4" />}
                  >
                    โปรไฟล์
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-0">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2">ระบบความปลอดภัย</h3>
                <p className="text-gray-600 mb-4">
                  ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT และ LDAP
                </p>
                {user ? (
                  <HeroLink
                    as={Link}
                    href="/dashboard"
                    color="primary"
                    className="font-medium"
                  >
                    แดชบอร์ด →
                  </HeroLink>
                ) : (
                  <HeroLink
                    as={Link}
                    href="/auth/login"
                    color="primary"
                    className="font-medium"
                  >
                    เข้าสู่ระบบ →
                  </HeroLink>
                )}
              </CardBody>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-0">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <UserGroupIcon className="w-8 h-8 text-green-600" />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2">จัดการผู้ใช้งาน</h3>
                <p className="text-gray-600 mb-4">
                  ระบบจัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง
                </p>
                {user ? (
                  <HeroLink
                    as={Link}
                    href="/profile"
                    color="success"
                    className="font-medium"
                  >
                    โปรไฟล์ →
                  </HeroLink>
                ) : (
                  <HeroLink
                    as={Link}
                    href="/auth/register"
                    color="success"
                    className="font-medium"
                  >
                    สมัครสมาชิก →
                  </HeroLink>
                )}
              </CardBody>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-0">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <ChartBarIcon className="w-8 h-8 text-purple-600" />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2">ภาพรวมระบบ</h3>
                <p className="text-gray-600 mb-4">
                  แดชบอร์ดสำหรับติดตามสถิติและข้อมูล
                </p>
                {user ? (
                  <HeroLink
                    as={Link}
                    href="/dashboard"
                    color="secondary"
                    className="font-medium"
                  >
                    แดชบอร์ด →
                  </HeroLink>
                ) : (
                  <span className="text-gray-400">ต้องเข้าสู่ระบบ</span>
                )}
              </CardBody>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-0">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <HeartIcon className="w-8 h-8 text-orange-600" />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2">บริการสุขภาพ</h3>
                <p className="text-gray-600 mb-4">
                  ระบบดูแลสุขภาพและข้อมูลผู้ป่วย
                </p>
                {user?.role === "admin" ? (
                  <HeroLink
                    as={Link}
                    href="/admin"
                    color="warning"
                    className="font-medium"
                  >
                    จัดการระบบ →
                  </HeroLink>
                ) : (
                  <span className="text-gray-400">สำหรับเจ้าหน้าที่</span>
                )}
              </CardBody>
            </Card>
          </div>

          <Divider className="mb-16" />

          {/* System Health Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Health Score */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <SignalIcon className="w-6 h-6 mr-2" />
                  สถานะระบบ
                </h2>
              </CardHeader>
              <CardBody>
                <div className="text-center">
                  <div
                    className="text-6xl font-bold mb-2"
                    style={{
                      color:
                        healthScore >= 90
                          ? "#22c55e"
                          : healthScore >= 70
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {healthScore}%
                  </div>
                  <Progress
                    value={healthScore}
                    color={getHealthColor(healthScore)}
                    className="mb-4"
                    size="lg"
                  />
                  <p className="text-lg text-gray-600">
                    ระบบทำงาน
                    {healthScore >= 90
                      ? "ปกติ"
                      : healthScore >= 70
                        ? "มีปัญหาเล็กน้อย"
                        : "ต้องตรวจสอบ"}
                  </p>
                </div>
              </CardBody>
            </Card>

            {/* System Info */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CpuChipIcon className="w-6 h-6 mr-2" />
                  ข้อมูลระบบ
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">เวอร์ชัน</span>
                    <span className="font-semibold">{siteConfig.version}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">บริการทั้งหมด</span>
                    <span className="font-semibold">{services.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">บริการออนไลน์</span>
                    <span className="font-semibold text-green-600">
                      {services.filter((s) => s.status === "online").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">อัพเดทล่าสุด</span>
                    <span className="font-semibold text-blue-600">
                      {isClient && currentTime
                        ? currentTime.toLocaleTimeString("th-TH")
                        : "กำลังโหลด..."}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Service Status Section */}
          <Card className="p-6">
            <CardHeader className="pb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <ServerIcon className="w-6 h-6 mr-2" />
                รายการบริการ
              </h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.name}
                    className="border-2 border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    <CardBody className="text-center p-4">
                      <div className="flex justify-center mb-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            service.status === "online"
                              ? "bg-green-500"
                              : service.status === "offline"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {service.description}
                      </p>
                      <Chip
                        color={getStatusColor(service.status)}
                        variant="flat"
                        size="sm"
                        className="mb-2"
                      >
                        {getStatusText(service.status)}
                      </Chip>
                      <p className="text-xs text-gray-500">
                        Port: {service.port}
                      </p>
                      {service.lastChecked && (
                        <p className="text-xs text-gray-400 mt-1">
                          อัพเดท:{" "}
                          {service.lastChecked.toLocaleTimeString("th-TH")}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
