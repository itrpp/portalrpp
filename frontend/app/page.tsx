"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
} from "@/components/icons";

import CustomNavbar from "@/components/navbar";
import Footer from "@/components/footer";
import { siteConfig } from "@/config/site";

export default function Home() {
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
                    className="rounded-full shadow-lg"
                    height={160}
                    src="/images/logo.png"
                    width={160}
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
              <div className="flex justify-center items-center mb-8" role="status" aria-live="polite">
                <ClockIcon aria-hidden="true" className="w-6 h-6 text-gray-500 mr-2" />
                <span className="text-lg text-gray-600" suppressHydrationWarning>
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
              <Card>
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนระบบความปลอดภัย"
                  >
                    <ShieldCheckIcon aria-hidden="true" className="w-8 h-8 text-blue-600" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    ระบบความปลอดภัย
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT และ LDAP
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนจัดการผู้ใช้งาน"
                  >
                    <UserGroupIcon aria-hidden="true" className="w-8 h-8 text-green-600" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    จัดการผู้ใช้งาน
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ระบบจัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนภาพรวมระบบ"
                  >
                    <ChartBarIcon aria-hidden="true" className="w-8 h-8 text-purple-600" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2">ภาพรวมระบบ</h3>
                  <p className="text-gray-600 mb-4">
                    แดชบอร์ดสำหรับติดตามสถิติและข้อมูล
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <div 
                    className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto"
                    aria-label="ไอคอนระบบภายในโรงพยาบาล"
                  >
                    <ServerIcon aria-hidden="true" className="w-8 h-8 text-orange-600" />
                  </div>
                </CardHeader>
                <CardBody className="text-center">
                  <h3 className="text-xl font-semibold mb-2">ระบบภายในโรงพยาบาล</h3>
                  <p className="text-gray-600 mb-4">
                    รวบรวม Service ต่างๆ ที่ใช้งานภายในรพ.
                  </p>
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
