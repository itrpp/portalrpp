"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Button,
  Chip,
} from '@heroui/react';
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
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
          name: "โครงการ",
          href: "/projects",
          icon: Squares2X2Icon,
          badge: "+"
        },
        {
          name: "งาน",
          href: "/tasks",
          icon: ClipboardDocumentListIcon,
          badge: "+"
        },
        {
          name: "ทีม",
          href: "/team",
          icon: UserGroupIcon
        },
        {
          name: "ติดตาม",
          href: "/tracker",
          icon: ChartBarIcon,
          isNew: true
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
          count: 3
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
      title: "ทีมของคุณ",
      items: [
        {
          name: "HU HeroUI",
          href: "/teams/hu",
          icon: UserIcon,
          badge: "HU"
        },
        {
          name: "TV Tailwind Variants",
          href: "/teams/tv",
          icon: UserIcon,
          badge: "TV"
        },
        {
          name: "HP HeroUI Pro",
          href: "/teams/hp",
          icon: UserIcon,
          badge: "HP"
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
          className="bg-background border border-divider shadow-lg"
          size="sm"
        >
          <Bars3Icon className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-background/80 z-40"
          onClick={handleMobileClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        h-screen bg-background border-r border-divider 
        transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 px-6 border-b border-divider flex items-center justify-between">
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
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} className="py-2">
                {!isCollapsed && (
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
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
                          className={`w-full justify-start h-10 ${isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-content2"
                            }`}
                          startContent={<item.icon className="w-4 h-4" />}
                          endContent={
                            item.badge && (
                              <Chip size="sm" variant="flat" color="primary">
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
                                <Chip size="sm" variant="flat" color="primary">
                                  {item.count}
                                </Chip>
                              )}
                              {item.isNew && (
                                <Chip size="sm" variant="flat" color="success">
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
                            className={`w-full justify-start h-10 ${isActive(item.href)
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-content2"
                              }`}
                            startContent={<item.icon className="w-4 h-4" />}
                            endContent={
                              item.badge && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {item.badge}
                                </Chip>
                              )
                            }
                          >
                            {!isCollapsed && (
                              <div className="flex items-center justify-between w-full">
                                <span>{item.name}</span>
                                {item.count && (
                                  <Chip size="sm" variant="flat" color="primary">
                                    {item.count}
                                  </Chip>
                                )}
                                {item.isNew && (
                                  <Chip size="sm" variant="flat" color="success">
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