"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Chip } from "@heroui/react";

import {
  HomeIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardListIcon,
  EmergencyBedIcon,
  BedIcon,
  SettingsIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  BriefcaseIcon,
  UserGroupIcon,
} from "@/components/ui/icons";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  isNew?: boolean;
  subItems?: SidebarItem[];
}

interface SidebarSection {
  title: string;
  isDisabled: boolean;
  items: SidebarItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);

  // Auto-expand parent items when on sub-items
  useEffect(() => {
    const newExpandedItems = new Set<string>();

    // Auto-expand "นำเข้าไฟล์" when on import pages
    if (pathname.startsWith("/revenue/import/")) {
      newExpandedItems.add("นำเข้าไฟล์");
    }

    // Auto-expand "ส่งออกข้อมูล" when on export pages
    if (pathname.startsWith("/revenue/export/")) {
      newExpandedItems.add("ส่งออกข้อมูล");
    }

    // Auto-expand "รายการงานที่ต้องดำเนินการ" when on job list pages
    if (pathname.startsWith("/porter/joblist")) {
      newExpandedItems.add("ศูนย์เปล");
    }

    // Auto-expand "ตั้งค่า" when on setting pages
    if (pathname.startsWith("/porter/setting/")) {
      newExpandedItems.add("ศูนย์เปล");
      newExpandedItems.add("ตั้งค่า");
    }

    // Auto-expand "ตั้งค่าข้อมูลบุคลากร" when on HRD setting pages
    if (
      pathname.startsWith("/setting/departments") ||
      pathname.startsWith("/setting/department-subs") ||
      pathname.startsWith("/setting/department-sub-subs") ||
      pathname.startsWith("/setting/person-types") ||
      pathname.startsWith("/setting/positions")
    ) {
      newExpandedItems.add("ตั้งค่าข้อมูลบุคลากร");
    }

    setExpandedItems(newExpandedItems);
  }, [pathname]);

  // ตรวจสอบว่าเป็น superadmin (ฝ่ายวิชาการ admin)
  const isSuperAdmin = () => {
    const departmentSubSubId = session?.user?.departmentSubSubId;
    const role = session?.user?.role;

    return departmentSubSubId === 170000 && role === "admin";
  };

  // ตรวจสอบสิทธิ์การเข้าถึงเมนูศูนย์เปล
  const canAccessPorterCenter = () => {
    const departmentSubSubId = session?.user?.departmentSubSubId;

    return isSuperAdmin() || departmentSubSubId === 4007;
  };

  // ตรวจสอบสิทธิ์การเข้าถึงเมนูตั้งค่าศูนย์เปล (เฉพาะ admin ของศูนย์เปล หรือ superadmin)
  const canAccessPorterCenterSettings = () => {
    const departmentSubSubId = session?.user?.departmentSubSubId;
    const role = session?.user?.role;

    return isSuperAdmin() || (departmentSubSubId === 4007 && role === "admin");
  };

  const navigationSections: SidebarSection[] = [
    {
      title: "ภาพรวม",
      isDisabled: false,
      items: [
        {
          name: "หน้าแรก",
          href: "/home",
          icon: HomeIcon,
        },
        // {
        //   name: "Dashboard",
        //   href: "#",
        //   icon: Squares2X2Icon,
        // },
      ],
    },
    {
      title: "ระบบการจัดการเวรเปล",
      isDisabled: false,
      items: [
        {
          name: "สถิติการดำเนินการ",
          href: "/porter/stat",
          icon: ChartBarIcon,
        },
        {
          name: "ขอเปล",
          href: "/porter/request",
          icon: EmergencyBedIcon,
        },
        ...(canAccessPorterCenter()
          ? [
              {
                name: "ศูนย์เปล",
                href: "#",
                icon: BedIcon,
                subItems: [
                  {
                    name: "รายการคำขอ",
                    href: "/porter/joblist",
                    icon: ClipboardListIcon,
                  },
                  ...(canAccessPorterCenterSettings()
                    ? [
                        {
                          name: "ตั้งค่า",
                          href: "#",
                          icon: SettingsIcon,
                          subItems: [
                            {
                              name: "จุดรับ - ส่ง",
                              href: "/porter/setting/location",
                              icon: SettingsIcon,
                            },
                            {
                              name: "รายชื่อเจ้าหน้าที่เปล",
                              href: "/porter/setting/employee",
                              icon: UserIcon,
                            },
                          ],
                        } as SidebarItem,
                      ]
                    : []),
                ],
              } as SidebarItem,
            ]
          : []),
      ],
    },
    {
      title: "ระบบงานจัดเก็บรายได้",
      isDisabled: true,
      items: [
        {
          name: "สถิติการดำเนินการ",
          href: "#",
          icon: ChartBarIcon,
        },
        {
          name: "นำเข้าไฟล์",
          href: "#",
          icon: ArrowDownTrayIcon,
          subItems: [
            {
              name: "DBF",
              href: "/revenue/import/dbf",
              icon: DocumentTextIcon,
            },
            {
              name: "REP",
              href: "#",
              icon: DocumentTextIcon,
            },
            {
              name: "Statement",
              href: "#",
              icon: DocumentTextIcon,
            },
          ],
        },
        {
          name: "ส่งออกข้อมูล",
          href: "#",
          icon: ArrowUpTrayIcon,
          subItems: [
            {
              name: "ข้อมูล 16 แฟ้ม IPD",
              href: "/revenue/export/ipd",
              icon: DocumentTextIcon,
            },
            {
              name: "ข้อมูล 16 แฟ้ม OPD",
              href: "/revenue/export/opd",
              icon: DocumentTextIcon,
            },
          ],
        },
      ],
    },

    {
      title: "ผู้ดูแลระบบ",
      isDisabled: !isSuperAdmin(),
      items: [
        {
          name: "จัดการผู้ใช้",
          href: "/setting/users",
          icon: UserIcon,
        },
        {
          name: "ตั้งค่าข้อมูลบุคลากร",
          href: "#",
          icon: UserGroupIcon,
          subItems: [
            {
              name: "กลุ่มภารกิจ",
              href: "/setting/departments",
              icon: BriefcaseIcon,
            },
            {
              name: "กลุ่มงาน",
              href: "/setting/department-subs",
              icon: BriefcaseIcon,
            },
            {
              name: "หน่วยงาน",
              href: "/setting/department-sub-subs",
              icon: BriefcaseIcon,
            },
            {
              name: "กลุ่มบุคลากร",
              href: "/setting/person-types",
              icon: UserGroupIcon,
            },
            {
              name: "ตำแหน่ง",
              href: "/setting/positions",
              icon: UserGroupIcon,
            },
          ],
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    // ตรวจสอบว่าเป็น exact match หรือเป็น sub-path ที่ถูกต้อง
    if (pathname === href) {
      return true;
    }
    // สำหรับ sub-items ที่อยู่ใน parent path
    if (href.includes("/revenue/") && pathname.startsWith(href)) {
      return true;
    }
    // สำหรับ parent items ที่มี sub-items
    if (href === "/revenue" && pathname.startsWith("/revenue/")) {
      return false; // ไม่ highlight parent เมื่ออยู่ที่ sub-item
    }

    return pathname.startsWith(href);
  };

  const handleMobileClose = () => {
    setIsMobileOpen(false);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }

      return newSet;
    });
  };

  const handleNavigate = async (href: string) => {
    if (isNavigating || pathname === href) {
      return;
    }

    setIsNavigating(true);
    handleMobileClose();
    try {
      await router.push(href);
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      // Reset loading state after a short delay to allow navigation to start
      setTimeout(() => {
        setIsNavigating(false);
      }, 300);
    }
  };

  const renderSidebarItem = (item: SidebarItem, isSubItem = false) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.has(item.name);
    const isItemActive = isActive(item.href);

    return (
      <div key={item.name} className={`px-2 ${isSubItem ? "ml-4" : ""}`}>
        {item.href === "#" ? (
          <Button
            className={`sidebar-item w-full justify-start h-10 group ${
              isItemActive ? "active" : ""
            }`}
            endContent={
              <div className="flex items-center gap-1">
                {item.badge && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.badge}
                  </Chip>
                )}
                {hasSubItems && (
                  <ChevronRightIcon
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                )}
              </div>
            }
            startContent={
              <item.icon
                className={`w-4 h-4 transition-colors ${
                  isItemActive
                    ? "text-white"
                    : "text-default-600 group-hover:text-primary-500"
                }`}
              />
            }
            variant="light"
            onPress={() => {
              if (hasSubItems) {
                toggleExpanded(item.name);
                // ไม่ปิด sidebar เมื่อกดปุ่มที่มี sub-items
              } else if (item.name === "ออกจากระบบ") {
                // handleLogout();
                handleMobileClose();
              } else {
                // ปิด sidebar เฉพาะเมื่อกดปุ่มที่ไม่มี sub-items
                handleMobileClose();
              }
            }}
          >
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>{item.name}</span>
                {item.count && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.count}
                  </Chip>
                )}
                {item.isNew && (
                  <Chip
                    className="sidebar-chip-secondary"
                    color="success"
                    size="sm"
                    variant="flat"
                  >
                    ใหม่
                  </Chip>
                )}
              </div>
            )}
          </Button>
        ) : isItemActive ? (
          <Button
            className={`sidebar-item w-full justify-start h-10 group active`}
            endContent={
              <div className="flex items-center gap-1">
                {item.badge && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.badge}
                  </Chip>
                )}
                {/* {hasSubItems && (
                  <ChevronRightIcon
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''
                      }`}
                  />
                )} */}
              </div>
            }
            startContent={
              <item.icon
                className={`w-4 h-4 transition-colors text-primary-500`}
              />
            }
            variant="light"
          >
            {!isCollapsed && (
              <div className="flex items-center text-primary-500 justify-between w-full">
                <span>{item.name}</span>
                {item.count && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.count}
                  </Chip>
                )}
                {item.isNew && (
                  <Chip
                    className="sidebar-chip-secondary"
                    color="success"
                    size="sm"
                    variant="flat"
                  >
                    ใหม่
                  </Chip>
                )}
              </div>
            )}
          </Button>
        ) : (
          <Button
            className={`sidebar-item w-full justify-start h-10 group`}
            endContent={
              <div className="flex items-center gap-1">
                {item.badge && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.badge}
                  </Chip>
                )}
                {hasSubItems && (
                  <ChevronRightIcon
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                )}
              </div>
            }
            isDisabled={isNavigating}
            startContent={
              <item.icon
                className={`w-4 h-4 transition-colors text-default-600 group-hover:text-primary-500`}
              />
            }
            variant="light"
            onPress={() => handleNavigate(item.href)}
          >
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>{item.name}</span>
                {item.count && (
                  <Chip
                    className="sidebar-chip-primary"
                    color="primary"
                    size="sm"
                    variant="flat"
                  >
                    {item.count}
                  </Chip>
                )}
                {item.isNew && (
                  <Chip
                    className="sidebar-chip-secondary"
                    color="success"
                    size="sm"
                    variant="flat"
                  >
                    ใหม่
                  </Chip>
                )}
              </div>
            )}
          </Button>
        )}

        {/* Render sub-items */}
        {hasSubItems && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.subItems?.map((subItem) => renderSidebarItem(subItem, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {!isMobileOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            isIconOnly
            className="bg-background border border-divider shadow-lg hover:bg-content2 transition-colors"
            size="sm"
            variant="light"
            onPress={() => setIsMobileOpen(true)}
          >
            <Bars3Icon className="w-4 h-4 text-foreground" />
          </Button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          aria-label="ปิดเมนู"
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-background/80 z-40"
          role="button"
          tabIndex={0}
          onClick={handleMobileClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleMobileClose();
            }
          }}
        />
      )}

      {/* Sidebar - รองรับ Light/Dark Theme */}
      <div
        className={`
        sidebar fixed lg:static inset-y-0 left-0 z-50
        h-screen

        ${isCollapsed ? "w-16" : "w-64"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        
        transition-all duration-300 ease-in-out
      `}
      >
        <div className="flex flex-col h-full shadow-xl border border-divider">
          {/* Header - พื้นหลังสีฟ้าอ่อน */}
          <div className="sidebar-header h-16 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                priority
                alt="Portal RPP Logo"
                className="w-8 h-8 object-contain"
                height={32}
                src="/images/logo.png"
                width={32}
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
                className="text-foreground hover:bg-content2 transition-colors"
                size="sm"
                variant="light"
                onPress={handleMobileClose}
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation - รองรับการ scroll และ theme */}
          <div className="sidebar-navigation flex-1 overflow-y-auto">
            {navigationSections.map((section) => (
              <div
                key={section.title}
                className={`py-2 ${section.isDisabled ? "hidden" : ""}`}
              >
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => renderSidebarItem(item))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
