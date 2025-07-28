"use client";

import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white shadow-lg border-t-2 border-blue-100">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-sm">
          {/* Copyright และ ข้อมูลระบบ */}
          <div className="text-center sm:text-left text-gray-600" suppressHydrationWarning>
            © {currentYear} {siteConfig.hospitalName}. สงวนลิขสิทธิ์ |{" "}
            {siteConfig.projectName} v{siteConfig.version} | พัฒนาโดยฝ่ายวิชาการ
            โรงพยาบาลราชพิพัฒน์
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              className="text-gray-600 hover:text-blue-600 transition-colors"
              href="#"
            >
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link
              className="text-gray-600 hover:text-blue-600 transition-colors"
              href="#"
            >
              เงื่อนไขการใช้งาน
            </Link>
            <Link
              className="text-gray-600 hover:text-blue-600 transition-colors"
              href="#"
            >
              แผนผังเว็บไซต์
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
