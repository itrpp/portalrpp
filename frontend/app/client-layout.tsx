"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";

import Loading from "./loading";

// ========================================
// CLIENT LAYOUT COMPONENT
// ========================================

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ตรวจสอบว่าเป็นหน้า login หรือ app pages หรือไม่
  const isLoginPage = pathname === "/login";
  const isLandingPage = pathname === "/";

  return (
    <>
      {/* Layout สำหรับหน้า Login */}
      {isLoginPage && (
        <div className="min-h-screen">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      )}

      {/* Layout สำหรับหน้าแรก (Landing Page) */}
      {isLandingPage && (
        <div className="min-h-screen">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      )}

      {/* Layout สำหรับหน้าแรก (Landing Page) */}
      {!isLoginPage && !isLandingPage && (
        <div className="min-h-screen">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      )}
    </>
  );
}
