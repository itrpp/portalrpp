"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Breadcrumbs,
  BreadcrumbItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@heroui/react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import Loading from "../loading";

import Sidebar from "@/components/layout/Sidebar";
import {
  HomeIcon,
  ChevronRightIcon,
  UserIcon,
  SettingsIcon,
  ArrowRightOnRectangleIcon,
} from "@/components/ui/icons";
import HomeFooter from "@/components/layout/HomeFooter";

interface BreadcrumbItemType {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // ตรวจสอบ authentication status
  useEffect(() => {
    if (status === "unauthenticated") {
      // ส่ง callbackUrl ไปด้วยเพื่อกลับมาหน้าเดิมหลัง login
      const callbackUrl = encodeURIComponent(
        pathname +
          (searchParams.toString() ? `?${searchParams.toString()}` : ""),
      );

      router.push(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [status, router, pathname, searchParams]);

  const handleLogout = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/login",
    });
  };

  // แสดง loading spinner ขณะตรวจสอบ authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loading message="กำลังตรวจสอบการเข้าสู่ระบบ..." />
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้ login ให้แสดง loading (จะ redirect ไป login)
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loading message="กำลังเปลี่ยนหน้า..." />
        </div>
      </div>
    );
  }

  // สร้าง breadcrumbs จาก pathname
  const generateBreadcrumbs = (): BreadcrumbItemType[] => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItemType[] = [];

    let currentPath = "";

    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      // แปลงชื่อ segment เป็นภาษาไทย
      const segmentNames: { [key: string]: string } = {
        home: "หน้าแรก",
        dashboard: "แดชบอร์ด",
        revenue: "ระบบงานจัดเก็บรายได้",
        import: "นำเข้าไฟล์",
        export: "ส่งออกข้อมูล",
        dbf: "DBF",
        projects: "โครงการ",
        tasks: "งาน",
        team: "ทีม",
        teams: "ทีม",
        tracker: "ติดตาม",
        "cap-table": "ตารางทุน",
        analytics: "การวิเคราะห์",
        perks: "สิทธิประโยชน์",
        expenses: "ค่าใช้จ่าย",
        settings: "ตั้งค่า",

        help: "ช่วยเหลือและข้อมูล",
      };

      const name = segmentNames[segment] || segment;

      breadcrumbs.push({
        name,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // แสดง layout เฉพาะเมื่อ authenticated แล้ว
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <div className="h-16 bg-background border-b border-divider flex items-center justify-end md:justify-between px-6 lg:px-6 lg:pt-0">
          <div className="hidden md:flex items-center space-x-4">
            <Breadcrumbs
              itemClasses={{
                item: "text-foreground-500 hover:text-foreground",
                separator: "text-foreground-400",
              }}
              separator={<ChevronRightIcon className="w-4 h-4" />}
            >
              {breadcrumbs.map((item, index) => (
                <BreadcrumbItem key={index}>
                  {index === 0 ? (
                    <Link
                      className="flex items-center space-x-1 hover:text-primary"
                      href="#"
                    >
                      <HomeIcon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  ) : index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">
                      {item.name}
                    </span>
                  ) : (
                    <Link className="hover:text-primary" href="#">
                      {item.name}
                    </Link>
                  )}
                </BreadcrumbItem>
              ))}
            </Breadcrumbs>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            {/* <ThemeToggle /> */}

            {/* User Menu - แสดงเฉพาะเมื่อมี session */}
            {session?.user && (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2">
                    <Avatar
                      isBordered
                      color={
                        (session.user as any).role === "admin"
                          ? "success"
                          : "primary"
                      }
                      name={(session.user as any).role === "admin" ? "A" : "U"}
                      size="sm"
                    />
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-foreground">
                        {session.user.name || session.user.email || "ผู้ใช้"}
                      </p>
                      <p className="text-xs text-foreground-400">
                        {(session.user as any).role === "admin"
                          ? "ผู้ดูแลระบบ"
                          : "ผู้ใช้งาน"}
                      </p>
                    </div>
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="เมนูผู้ใช้">
                  <DropdownItem
                    key="profile"
                    startContent={<UserIcon className="w-4 h-4" />}
                  >
                    <Link href="/profile">โปรไฟล์</Link>
                  </DropdownItem>
                  <DropdownItem
                    key="settings"
                    startContent={<SettingsIcon className="w-4 h-4" />}
                  >
                    <Link href="/settings">ตั้งค่า</Link>
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    startContent={
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    }
                    onPress={handleLogout}
                  >
                    ออกจากระบบ
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-default-50">{children}</div>

        {/* App Footer */}
        <HomeFooter />
      </div>
    </div>
  );
}
