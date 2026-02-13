"use client";

import React from "react";

import { PorterQueryProvider } from "./providers/PorterQueryProvider";

/**
 * Layout สำหรับ Porter module
 * Wrap children ด้วย PorterQueryProvider เพื่อให้ทุกหน้าใน Porter module
 * สามารถใช้ React Query hooks ได้
 */
export default function PorterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PorterQueryProvider>{children}</PorterQueryProvider>;
}
