"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Button,
  Chip,
} from '@heroui/react';
import {
  HomeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  GiftIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
} from '../icons';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  isNew?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // ตรวจสอบ theme เมื่อ component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('portalrpp-theme') as 'light' | 'dark' || 'light';
    setCurrentTheme(savedTheme);

    // ฟังก์ชันสำหรับติดตามการเปลี่ยนแปลง theme
    const handleThemeChange = () => {
      const theme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light';
      setCurrentTheme(theme);
    };

    // ใช้ MutationObserver เพื่อติดตามการเปลี่ยนแปลง data-theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const navigationSections: SidebarSection[] = [
    {
      title: "ภาพรวม",
      items: [
        {
          name: "หน้าแรก",
          href: "/",
          icon: HomeIcon
        },
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: Squares2X2Icon,
        },        
      ],
    },
    {
      title: "องค์กร",
      items: [
        {
          name: "ตารางทุน",
          href: "/cap-table",
          icon: ChartBarIcon
        },
        {
          name: "การวิเคราะห์",
          href: "/analytics",
          icon: ChartBarIcon
        },
        {
          name: "สิทธิประโยชน์",
          href: "/perks",
          icon: GiftIcon,
        },
        {
          name: "ค่าใช้จ่าย",
          href: "/expenses",
          icon: DocumentTextIcon
        },
        {
          name: "ตั้งค่า",
          href: "/settings",
          icon: Cog6ToothIcon
        },
      ],
    },
    {
      title: "ผู้ดูแลระบบ",
      items: [
        {
          name: "รายชื่อผู้ใช้งาน",
          href: "#",
          icon: UserIcon,
        },       
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleMobileClose = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsMobileOpen(true)}
          className="bg-background border border-divider shadow-lg hover:bg-content2 transition-colors"
          size="sm"
        >
          <Bars3Icon className="w-4 h-4 text-foreground" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-background/80 z-40"
          onClick={handleMobileClose}
        />
      )}

      {/* Sidebar - รองรับ Light/Dark Theme */}
      <div className={`
        sidebar fixed lg:static inset-y-0 left-0 z-50
        h-screen

        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        
        transition-all duration-300 ease-in-out
      `}>
        <div className="flex flex-col h-full">
          {/* Header - พื้นหลังสีฟ้าอ่อน */}
          <div className="sidebar-header h-16 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo.png"
                alt="Portal RPP Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
              {!isCollapsed && (
                <span className="font-bold text-xl text-foreground">
                  Portal RPP
                </span>
              )}
            </div>

            {/* Mobile Close Button */}
            <div className="lg:hidden">
              <Button
                isIconOnly
                variant="light"
                onPress={handleMobileClose}
                size="sm"
                className="text-foreground hover:bg-content2 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation - รองรับการ scroll และ theme */}
          <div className="sidebar-navigation flex-1 overflow-y-auto">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} className="py-2">
                {!isCollapsed && (
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.href} className="px-2">
                      {item.href === "#" ? (
                        <Button
                          variant="light"
                          className={`sidebar-item w-full justify-start h-10 group ${
                            isActive(item.href)
                              ? "active"
                              : ""
                          }`}
                          startContent={
                            <item.icon className={`w-4 h-4 transition-colors ${
                              isActive(item.href) 
                                ? "text-white" 
                                : "text-default-600 group-hover:text-primary-500"
                            }`} />
                          }
                          endContent={
                            item.badge && (
                              <Chip 
                                size="sm" 
                                variant="flat" 
                                color="primary"
                                className="sidebar-chip-primary"
                              >
                                {item.badge}
                              </Chip>
                            )
                          }
                          onPress={() => {
                            if (item.name === "ออกจากระบบ") {
                              // handleLogout();
                            }
                            handleMobileClose();
                          }}
                        >
                          {!isCollapsed && (
                            <div className="flex items-center justify-between w-full">
                              <span>{item.name}</span>
                              {item.count && (
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  color="primary"
                                  className="sidebar-chip-primary"
                                >
                                  {item.count}
                                </Chip>
                              )}
                              {item.isNew && (
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  color="success"
                                  className="sidebar-chip-secondary"
                                >
                                  ใหม่
                                </Chip>
                              )}
                            </div>
                          )}
                        </Button>
                      ) : (
                        <Link href={item.href} onClick={handleMobileClose}>
                          <Button
                            variant="light"
                            className={`sidebar-item w-full justify-start h-10 group ${
                              isActive(item.href)
                                ? "active"
                                : ""
                            }`}
                            startContent={
                              <item.icon className={`w-4 h-4 transition-colors ${
                                isActive(item.href) 
                                  ? "text-white" 
                                  : "text-default-600 group-hover:text-primary-500"
                              }`} />
                            }
                            endContent={
                              item.badge && (
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  color="primary"
                                  className="sidebar-chip-primary"
                                >
                                  {item.badge}
                                </Chip>
                              )
                            }
                          >
                            {!isCollapsed && (
                              <div className="flex items-center justify-between w-full">
                                <span>{item.name}</span>
                                {item.count && (
                                  <Chip 
                                    size="sm" 
                                    variant="flat" 
                                    color="primary"
                                    className="sidebar-chip-primary"
                                  >
                                    {item.count}
                                  </Chip>
                                )}
                                {item.isNew && (
                                  <Chip 
                                    size="sm" 
                                    variant="flat" 
                                    color="success"
                                    className="sidebar-chip-secondary"
                                  >
                                    ใหม่
                                  </Chip>
                                )}
                              </div>
                            )}
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
} 