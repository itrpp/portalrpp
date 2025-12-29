"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import {
  SidebarProps,
  SidebarItem,
  SidebarSection,
} from "@/types";

export default function Sidebar({ isOpen, onToggle }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);

  // ใช้ prop isOpen ถ้ามี ถ้าไม่มีใช้ false (controlled component)
  const sidebarIsOpen = isOpen ?? false;
  
  // ตรวจสอบว่าเป็น mobile หรือ desktop
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lock body scroll เมื่อ Sidebar เปิดบน mobile
  useEffect(() => {
    if (sidebarIsOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarIsOpen, isMobile]);

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

  // ตรวจสอบว่าเป็น superadmin (ฝ่ายวิชาการ admin) - memoized
  const isSuperAdmin = useMemo(() => {
    const departmentSubSubId = session?.user?.departmentSubSubId;
    const role = session?.user?.role;

    return departmentSubSubId === 170000 && role === "admin";
  }, [session?.user?.departmentSubSubId, session?.user?.role]);

  // ตรวจสอบสิทธิ์การเข้าถึงเมนูศูนย์เปล - memoized
  const canAccessPorterCenter = useMemo(() => {
    const departmentSubSubId = session?.user?.departmentSubSubId;

    return isSuperAdmin || departmentSubSubId === 4007;
  }, [isSuperAdmin, session?.user?.departmentSubSubId]);

  // ตรวจสอบสิทธิ์การเข้าถึงเมนูตั้งค่าศูนย์เปล - memoized
  const canAccessPorterCenterSettings = useMemo(() => {
    const departmentSubSubId = session?.user?.departmentSubSubId;
    const role = session?.user?.role;

    return isSuperAdmin || (departmentSubSubId === 4007 && role === "admin");
  }, [isSuperAdmin, session?.user?.departmentSubSubId, session?.user?.role]);

  // Memoize navigation sections เพื่อป้องกันการสร้างใหม่ทุกครั้งที่ render
  const navigationSections: SidebarSection[] = useMemo(() => [
    {
      title: "ภาพรวม",
      isDisabled: false,
      items: [
        {
          name: "หน้าแรก",
          href: "/home",
          icon: HomeIcon,
        },
      ],
    },
    {
      title: "ศูนย์เคลื่อนย้ายผู้ป่วย",
      isDisabled: false,
      items: [
        {
          name: "สถิติการดำเนินการ",
          href: "/porter/stat",
          icon: ChartBarIcon,
        },
        {
          name: "ขอเปลรับ - ส่งผู้ป่วย",
          href: "/porter/request",
          icon: EmergencyBedIcon,
        },
        ...(canAccessPorterCenter
          ? [
              {
                name: "ศูนย์สั่งการ",
                href: "#",
                icon: BedIcon,
                subItems: [
                  {
                    name: "รายการคำขอ",
                    href: "/porter/joblist",
                    icon: ClipboardListIcon,
                  },
                  ...(canAccessPorterCenterSettings
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
      isDisabled: !isSuperAdmin,
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
  ], [isSuperAdmin, canAccessPorterCenter, canAccessPorterCenterSettings]);

  // Memoize isActive function
  const isActive = useCallback((href: string) => {
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
  }, [pathname]);

  const handleClose = useCallback(() => {
    onToggle?.();
  }, [onToggle]);

  const handleOpen = useCallback(() => {
    onToggle?.();
  }, [onToggle]);

  const toggleExpanded = useCallback((itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }

      return newSet;
    });
  }, []);

  const handleNavigate = useCallback(async (href: string) => {
    if (isNavigating || pathname === href) {
      return;
    }

    setIsNavigating(true);
    // ปิด Sidebar บน mobile หลังจาก navigate
    if (isMobile) {
      handleClose();
    }
    try {
      await router.push(href);
    } catch (error) {
      // Log error แต่ไม่แสดงให้ผู้ใช้เห็น (error handling ที่ดีกว่า)
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === "development") {
        console.error("Navigation error:", error);
      }
    } finally {
      // Reset loading state after a short delay to allow navigation to start
      setTimeout(() => {
        setIsNavigating(false);
      }, 300);
    }
  }, [isNavigating, pathname, router, isMobile, handleClose]);

  const renderSidebarItem = (item: SidebarItem, isSubItem = false) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.has(item.name);
    const isItemActive = isActive(item.href);

    return (
      <div key={item.name} className={cn("px-2", isSubItem && "ml-4")}>
        {item.href === "#" ? (
          <Button
            className={cn(
              "sidebar-item w-full justify-start h-10 group",
              isItemActive && "active"
            )}
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
                className={cn(
                  "w-4 h-4 transition-colors",
                  isItemActive
                    ? "text-white"
                    : "text-default-600 group-hover:text-primary-500"
                )}
              />
            }
            variant="light"
            onPress={() => {
              if (hasSubItems) {
                toggleExpanded(item.name);
              } else if (isMobile) {
                // ปิด sidebar บน mobile หลังจากเลือกเมนู
                handleClose();
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
            className="sidebar-item w-full justify-start h-10 group active"
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
              </div>
            }
            startContent={
              <item.icon
                className="w-4 h-4 transition-colors text-primary-500"
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
            className="sidebar-item w-full justify-start h-10 group"
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
                    className={cn(
                      "w-3 h-3 transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                )}
              </div>
            }
            isDisabled={isNavigating}
            startContent={
              <item.icon
                className="w-4 h-4 transition-colors text-default-600 group-hover:text-primary-500"
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

  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarIsOpen && isMobile) {
        handleClose();
      }
    };

    if (sidebarIsOpen && isMobile) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [sidebarIsOpen, isMobile, handleClose]);

  return (
    <>
      {/* Mobile Overlay - แสดงเฉพาะบน mobile เมื่อ Sidebar เปิด */}
      {sidebarIsOpen && isMobile && (
        <div
          aria-label="ปิดเมนู"
          aria-hidden={!sidebarIsOpen}
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-background/80 z-40"
          role="button"
          tabIndex={-1}
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClose();
            }
          }}
        />
      )}

      {/* Sidebar - รองรับ Light/Dark Theme */}
      <aside
        aria-label="เมนูนำทางหลัก"
        aria-hidden={!sidebarIsOpen}
        role="navigation"
        className={cn(
          "sidebar fixed inset-y-0 left-0 z-50 h-screen",
          "transition-transform duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          sidebarIsOpen ? "translate-x-0" : "-translate-x-full"
        )}
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
            {isMobile && (
              <div className="lg:hidden">
                <Button
                  aria-label="ปิดเมนู"
                  isIconOnly
                  className="text-foreground hover:bg-content2 transition-colors"
                  size="sm"
                  variant="light"
                  onPress={handleClose}
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Navigation - รองรับการ scroll และ theme */}
          <div className="sidebar-navigation flex-1 overflow-y-auto">
            {navigationSections.map((section) => (
              <div
                key={section.title}
                className={cn("py-2", section.isDisabled && "hidden")}
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
      </aside>
    </>
  );
}
