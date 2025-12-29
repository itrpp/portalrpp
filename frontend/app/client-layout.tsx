"use client";

import { Suspense } from "react";

import Loading from "./loading";
import { ClientLayoutProps } from "@/types/layout";

/**
 * ========================================
 * CLIENT LAYOUT COMPONENT
 * ========================================
 * Component สำหรับ wrap children ด้วย Suspense boundary
 */
export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </div>
  );
}
