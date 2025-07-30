"use client";

import React from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DashboardFooter from "@/components/DashboardFooter";
import { Breadcrumbs, BreadcrumbItem, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from "@heroui/react";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon, UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface BreadcrumbItemType {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // สร้าง breadcrumbs จาก pathname
  const generateBreadcrumbs = (): BreadcrumbItemType[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItemType[] = [
      { 
        name: "หน้าแรก", 
        href: "/", 
        icon: HomeIcon 
      }
    ];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // แปลงชื่อ segment เป็นภาษาไทย
      const segmentNames: { [key: string]: string } = {
        dashboard: "แดชบอร์ด",
        projects: "โครงการ",
        tasks: "งาน",
        team: "ทีม",
        tracker: "ติดตาม",
        "cap-table": "ตารางทุน",
        analytics: "การวิเคราะห์",
        perks: "สิทธิประโยชน์",
        expenses: "ค่าใช้จ่าย",
        settings: "ตั้งค่า",
        teams: "ทีม",
        hu: "HU HeroUI",
        tv: "TV Tailwind Variants",
        hp: "HP HeroUI Pro",
        help: "ช่วยเหลือและข้อมูล",
      };

      const name = segmentNames[segment] || segment;
      breadcrumbs.push({
        name,
        href: currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

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
              separator={<ChevronRightIcon className="w-4 h-4" />}
              itemClasses={{
                item: "text-foreground-500 hover:text-foreground",
                separator: "text-foreground-400",
              }}
            >
              {breadcrumbs.map((item, index) => (
                <BreadcrumbItem key={index}>
                  {index === 0 ? (
                    <Link href={item.href} className="flex items-center space-x-1 hover:text-primary transition-colors">
                      <HomeIcon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  ) : index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">{item.name}</span>
                  ) : (
                    <Link href={item.href} className="hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                  )}
                </BreadcrumbItem>
              ))}
            </Breadcrumbs>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* User Menu */}
            {user && (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2 transition-colors">
                    <Avatar
                      isBordered
                      color="primary"
                      name={user.name || "ผู้ใช้"}
                      size="sm"
                      {...(user.avatar && { src: user.avatar })}
                    />
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-foreground">
                        {user.name || "ผู้ใช้"}
                      </p>
                      <p className="text-xs text-foreground-400">
                        {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                      </p>
                    </div>
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="เมนูผู้ใช้">
                  <DropdownItem key="profile" startContent={<UserIcon className="w-4 h-4" />}>
                    <Link href="/profile">โปรไฟล์</Link>
                  </DropdownItem>
                  <DropdownItem key="settings" startContent={<Cog6ToothIcon className="w-4 h-4" />}>
                    <Link href="/settings">ตั้งค่า</Link>
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    startContent={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                    onPress={logout}
                  >
                    ออกจากระบบ
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        
        {/* Dashboard Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
} 