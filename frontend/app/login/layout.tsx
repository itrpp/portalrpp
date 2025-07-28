import React from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `เข้าสู่ระบบ - ${siteConfig.projectName}`,
  description: `เข้าสู่ระบบ ${siteConfig.projectName} ด้วย Windows Active Directory`,
  keywords: [
    "เข้าสู่ระบบ",
    "Login",
    "Windows AD",
    "Active Directory",
    "โรงพยาบาลราชพิพัฒน์",
  ],
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 