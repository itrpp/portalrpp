"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Button } from "@heroui/react";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  ArrowRightIcon,
  UserIcon,
} from "@/components/icons";

import CustomNavbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

import { siteConfig } from "@/config/site";

function HomeContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Initialize client-side only state
    setIsClient(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-content2 to-content3 transition-colors duration-500">
      <CustomNavbar />

      {/* Main Content */}
      <div className="flex-1">
        {/* Hero Section */}
        <div className="relative">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <div className="flex justify-center mb-8">
                <div className="w-40 h-40 relative">
                  <Image
                    priority
                    alt="โรงพยาบาลราชพิพัฒน์"
                    className="rounded-full shadow-lg border-4 border-primary-200 dark:border-primary-700"
                    height={160}
                    src="/images/logo.png"
                    width={160}
                  />
                </div>
              </div>
              <h1 className="text-5xl font-bold mb-4">
                {siteConfig.hospitalName}
              </h1>
              <p className="text-2xl text-primary-500 font-medium mb-6">
                {siteConfig.projectName}
              </p>
              <p className="text-lg text-default-600 mb-8 max-w-3xl mx-auto">
                ระบบจัดการข้อมูลแบบ <span className="text-primary-600 font-semibold">Digital Transformation</span>
                สำหรับการให้บริการที่มีคุณภาพและประสิทธิภาพ
              </p>

              {/* Action Buttons */}
              {isAuthenticated ? (
                <div className="flex justify-center mb-8">
                  <Button
                    color="secondary"
                    size="lg"
                    className="font-semibold shadow-lg hover:scale-105 transition-transform"
                    startContent={<ChartBarIcon className="w-5 h-5" />}
                    endContent={<ArrowRightIcon className="w-5 h-5" />}
                    variant="solid"
                    onClick={handleGoToDashboard}
                  >
                    ไปยังแดชบอร์ด
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center mb-8">
                  <Button
                    color="primary"
                    size="lg"
                    className="font-semibold shadow-lg hover:scale-105 transition-transform"
                    startContent={<UserIcon className="w-5 h-5" />}
                    endContent={<ArrowRightIcon className="w-5 h-5" />}
                    variant="solid"
                    onClick={() => router.push('/login')}
                  >
                    เข้าสู่ระบบ
                  </Button>
                </div>
              )}

              {/* Current Time */}
              <div className="flex justify-center items-center mb-8" role="status" aria-live="polite">
                <ClockIcon aria-hidden="true" className="w-6 h-6 text-primary-500 mr-2" />
                <span className="text-lg text-default-600 font-medium" suppressHydrationWarning>
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
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <Card className="shadow-xl border border-default-200 dark:border-default-700 bg-background/90 backdrop-blur-lg hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนระบบความปลอดภัย"
                  >
                    <ShieldCheckIcon aria-hidden="true" className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    ระบบความปลอดภัย
                  </h3>
                  <p className="text-default-600 mb-4">
                    ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT และ LDAP
                  </p>
                  <div className="text-xs text-primary-500 font-medium">
                    🔐 Authentication & Authorization
                  </div>
                </CardBody>
              </Card>

              <Card className="shadow-xl border border-default-200 dark:border-default-700 bg-background/90 backdrop-blur-lg hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-secondary-100 dark:bg-secondary-900/20 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนจัดการผู้ใช้งาน"
                  >
                    <UserGroupIcon aria-hidden="true" className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    จัดการผู้ใช้งาน
                  </h3>
                  <p className="text-default-600 mb-4">
                    ระบบจัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง
                  </p>
                  <div className="text-xs text-secondary-500 font-medium">
                    👥 User Management System
                  </div>
                </CardBody>
              </Card>

              <Card className="shadow-xl border border-default-200 dark:border-default-700 bg-background/90 backdrop-blur-lg hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-warning-100 dark:bg-warning-900/20 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนภาพรวมระบบ"
                  >
                    <ChartBarIcon aria-hidden="true" className="w-8 h-8 text-warning-600 dark:text-warning-400" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">ภาพรวมระบบ</h3>
                  <p className="text-default-600 mb-4">
                    แดชบอร์ดสำหรับติดตามสถิติและข้อมูล
                  </p>
                  <div className="text-xs text-warning-500 font-medium">
                    📊 Analytics Dashboard
                  </div>
                </CardBody>
              </Card>

              <Card className="shadow-xl border border-default-200 dark:border-default-700 bg-background/90 backdrop-blur-lg hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนระบบภายในโรงพยาบาล"
                  >
                    <ServerIcon aria-hidden="true" className="w-8 h-8 text-danger-600 dark:text-danger-400" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">ระบบภายในโรงพยาบาล</h3>
                  <p className="text-default-600 mb-4">
                    รวบรวม Service ต่างๆ ที่ใช้งานภายในรพ.
                  </p>
                  <div className="text-xs text-danger-500 font-medium">
                    🏥 Hospital Services
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <HomeContent />
  );
}
