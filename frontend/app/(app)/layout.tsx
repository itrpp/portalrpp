"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import Loading from "../loading";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import HomeFooter from "@/components/layout/HomeFooter";
import ProfileOrgModal from "@/components/ui/ProfileOrgModal";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // ตั้งค่า initial state ของ Sidebar ตามขนาดหน้าจอ
  useEffect(() => {
    const MOBILE_BREAKPOINT = 1024; // lg breakpoint in Tailwind

    const checkScreenSize = () => {
      // บน mobile ให้เริ่มต้นเป็น false, บน desktop เป็น true
      setIsSidebarOpen(window.innerWidth >= MOBILE_BREAKPOINT);
    };

    // ตรวจสอบครั้งแรก
    checkScreenSize();

    // ฟัง resize event ด้วย debounce เพื่อ performance
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScreenSize, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

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

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
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

  // แสดง layout เฉพาะเมื่อ authenticated แล้ว
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        {/* Top Bar */}
        <Topbar
          handleLogout={handleLogout}
          handleNavigate={handleNavigate}
          isNavigating={isNavigating}
          isSidebarOpen={isSidebarOpen}
          pathname={pathname}
          session={session}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-default-50">{children}</div>

        {/* Modal บังคับให้ผู้ใช้ไปปรับปรุงข้อมูลโครงสร้างองค์กรในโปรไฟล์ */}
        <ProfileOrgModal
          isOpen={isProfileOrgModalOpen}
          onConfirm={handleConfirmUpdateProfile}
          onOpenChange={setIsProfileOrgModalOpen}
        />

        {/* App Footer */}
        <HomeFooter />
      </div>
    </div>
  );
}
