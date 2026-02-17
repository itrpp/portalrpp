'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  ArrowRightIcon,
  ChartBarIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ServerIcon,
} from '@/components/ui/icons';
import { siteConfig } from '@/config/site';
import { LOADING_MESSAGES } from '@/lib/constants';
import { formatDateTimeThai } from '@/lib/utils';

function HomeContent() {
  const router = useRouter();
  const { data: session } = useSession();
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

  const handleGoToHome = () => {
    router.push('/home');
  };

  return (
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
                  className="rounded-full"
                  height={160}
                  src="/images/logo.png"
                  width={160}
                />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4">{siteConfig.hospitalName}</h1>
            <p className="text-2xl font-bold mb-6">{siteConfig.projectName}</p>
            <p className="text-lg text-default-600 mb-8 max-w-3xl mx-auto">
              ระบบจัดการข้อมูลแบบ{' '}
              <span className="text-primary-600 font-semibold">Digital Transformation </span>
              สำหรับการให้บริการที่มีคุณภาพและประสิทธิภาพ
            </p>

            {/* Action Buttons */}
            {session ? (
              <div className="flex justify-center mb-8">
                <Button
                  className="font-semibold shadow-lg"
                  color="success"
                  endContent={<ArrowRightIcon className="w-5 h-5" />}
                  size="lg"
                  startContent={<ChartBarIcon className="w-5 h-5" />}
                  variant="solid"
                  onClick={handleGoToHome}
                >
                  ไปยังหน้าจอหลัก
                </Button>
              </div>
            ) : (
              <div className="flex justify-center mb-8">
                <Button
                  className="font-semibold shadow-lg"
                  color="primary"
                  endContent={<ArrowRightIcon className="w-5 h-5" />}
                  size="lg"
                  startContent={<UserIcon className="w-5 h-5" />}
                  variant="solid"
                  onClick={() => router.push('/login')}
                >
                  เข้าสู่ระบบ
                </Button>
              </div>
            )}

            {/* Current Time */}
            <div aria-live="polite" className="flex justify-center items-center mb-8" role="status">
              <ClockIcon aria-hidden="true" className="w-6 h-6 text-primary-500 mr-2" />
              <span suppressHydrationWarning className="text-lg text-default-600 font-medium">
                {isClient && currentTime ? formatDateTimeThai(currentTime) : LOADING_MESSAGES.page}
              </span>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="shadow-xl border border-default-200 dark:border-default-700 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-0">
                <div
                  aria-label="ไอคอนระบบความปลอดภัย"
                  className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <ShieldCheckIcon
                    aria-hidden="true"
                    className="w-8 h-8 text-primary-600 dark:text-primary-400"
                  />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-foreground">ระบบความปลอดภัย</h3>
                <p className="text-default-600 mb-4">ระบบยืนยันตัวตนที่ปลอดภัยด้วย JWT และ LDAP</p>
                <div className="text-xs text-primary-500 font-medium">
                  🔐 Authentication & Authorization
                </div>
              </CardBody>
            </Card>

            <Card className="shadow-xl border border-default-200 dark:border-default-700  hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-0">
                <div
                  aria-label="ไอคอนจัดการผู้ใช้งาน"
                  className="w-16 h-16 bg-secondary-100 dark:bg-secondary-900/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <UserGroupIcon
                    aria-hidden="true"
                    className="w-8 h-8 text-secondary-600 dark:text-secondary-400"
                  />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-foreground">จัดการผู้ใช้งาน</h3>
                <p className="text-default-600 mb-4">ระบบจัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง</p>
                <div className="text-xs text-secondary-500 font-medium">
                  👥 User Management System
                </div>
              </CardBody>
            </Card>

            <Card className="shadow-xl border border-default-200 dark:border-default-700  hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-0">
                <div
                  aria-label="ไอคอนภาพรวมระบบ"
                  className="w-16 h-16 bg-warning-100 dark:bg-warning-900/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <ChartBarIcon
                    aria-hidden="true"
                    className="w-8 h-8 text-warning-600 dark:text-warning-400"
                  />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-foreground">ภาพรวมระบบ</h3>
                <p className="text-default-600 mb-4">แดชบอร์ดสำหรับติดตามสถิติและข้อมูล</p>
                <div className="text-xs text-warning-500 font-medium">📊 Analytics Dashboard</div>
              </CardBody>
            </Card>

            <Card className="shadow-xl border border-default-200 dark:border-default-700  hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-0">
                <div
                  aria-label="ไอคอนระบบภายในโรงพยาบาล"
                  className="w-16 h-16 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <ServerIcon
                    aria-hidden="true"
                    className="w-8 h-8 text-danger-600 dark:text-danger-400"
                  />
                </div>
              </CardHeader>
              <CardBody className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-foreground">ระบบภายในโรงพยาบาล</h3>
                <p className="text-default-600 mb-4">รวบรวม Service ต่างๆ ที่ใช้งานภายในรพ.</p>
                <div className="text-xs text-danger-500 font-medium">🏥 Hospital Services</div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
