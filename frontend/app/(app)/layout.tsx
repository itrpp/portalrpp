"use client";

import React, { useEffect, useState } from "react";
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import Loading from "../loading";

import Sidebar from "@/components/layout/Sidebar";
import {
  HomeIcon,
  ChevronRightIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from "@/components/ui/icons";
import HomeFooter from "@/components/layout/HomeFooter";

interface BreadcrumbItemType {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

type OrgStructureUser = {
  personTypeId?: number | null;
  positionId?: number | null;
  departmentId?: number | null;
  departmentSubId?: number | null;
  departmentSubSubId?: number | null;
};

function isProfileOrgIncomplete(user: OrgStructureUser | null | undefined) {
  if (!user) {
    return true;
  }

  const {
    personTypeId,
    positionId,
    departmentId,
    departmentSubId,
    departmentSubSubId,
  } = user;

  return (
    personTypeId == null ||
    positionId == null ||
    departmentId == null ||
    departmentSubId == null ||
    departmentSubSubId == null
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProfileOrgModalOpen, setIsProfileOrgModalOpen] = useState(false);

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

  // บังคับให้ผู้ใช้ที่ยังไม่ได้กรอกโครงสร้างองค์กรครบ ไปหน้าโปรไฟล์
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (!session?.user) {
      return;
    }

    // อย่าบังคับบนหน้าโปรไฟล์เอง เพื่อลดความเสี่ยง loop
    if (pathname === "/profile") {
      return;
    }

    if (isProfileOrgIncomplete(session.user as OrgStructureUser)) {
      setIsProfileOrgModalOpen(true);
    }
  }, [status, session, pathname]);

  const handleLogout = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/login",
    });
  };

  const handleConfirmUpdateProfile = () => {
    setIsProfileOrgModalOpen(false);
    router.push("/profile");
  };

  const handleNavigate = async (href: string) => {
    if (isNavigating || pathname === href) {
      return;
    }

    setIsNavigating(true);
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
        departments: "กลุ่มภารกิจ",
        "department-subs": "กลุ่มงาน",
        "department-sub-subs": "หน่วยงาน",
        "person-types": "กลุ่มบุคลากร",
        positions: "ตำแหน่ง",
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
        <div className="h-16 bg-background border-b border-divider flex items-center justify-end md:justify-between px-6 lg:px-6 lg:pt-0 lg:pl-6 pl-20">
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

            {/* User Menu - แสดงเฉพาะเมื่อมี session */}
            {session?.user && (
              <Dropdown isDisabled={isNavigating} placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-content2 rounded-lg p-2">
                    <Avatar
                      isBordered
                      color={
                        (session.user as any).role === "admin"
                          ? "success"
                          : "primary"
                      }
                      fallback={
                        <UserIcon className="w-4 h-4 text-default-400" />
                      }
                      name={
                        session.user.image
                          ? undefined
                          : (session.user as any).role === "admin"
                            ? "A"
                            : "U"
                      }
                      size="sm"
                      src={session.user.image ?? undefined}
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
                    isDisabled={isNavigating}
                    startContent={<UserIcon className="w-4 h-4" />}
                    onPress={() => handleNavigate("/profile")}
                  >
                    {isNavigating && pathname === "/profile" ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        กำลังโหลด...
                      </span>
                    ) : (
                      "โปรไฟล์"
                    )}
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    isDisabled={isNavigating}
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

        {/* Modal บังคับให้ผู้ใช้ไปปรับปรุงข้อมูลโครงสร้างองค์กรในโปรไฟล์ */}
        <Modal
          isOpen={isProfileOrgModalOpen}
          onOpenChange={setIsProfileOrgModalOpen}
          isDismissable={false}
          isKeyboardDismissDisabled
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  กรุณาปรับปรุงข้อมูลโปรไฟล์
                </ModalHeader>
                <ModalBody>
                  <p>
                    ระบบตรวจพบว่าข้อมูลโครงสร้างองค์กรของคุณยังไม่ครบถ้วน
                    กรุณาไปที่หน้าจอโปรไฟล์เพื่อกรอกข้อมูล
                    เช่น กลุ่มบุคลากร, ตำแหน่ง, กลุ่มภารกิจ, กลุ่มงาน และหน่วยงาน
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" onPress={handleConfirmUpdateProfile}>
                    ไปที่หน้าปรับปรุงข้อมูลโปรไฟล์
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* App Footer */}
        <HomeFooter />
      </div>
    </div>
  );
}
