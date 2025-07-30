"use client";

import React from "react";
import { siteConfig } from "@/config/site";
import { Card, CardBody } from "@heroui/react";
import Image from "next/image";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Login Header */}
      <header className="bg-background/80 backdrop-blur-lg border-b border-divider">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 relative">
                <Image
                  alt="โรงพยาบาลราชพิพัฒน์"
                  className="rounded-lg"
                  height={48}
                  src="/images/logo.png"
                  width={48}
                />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">
                  {siteConfig.hospitalName}
                </h1>
                <p className="text-sm text-foreground-500">
                  {siteConfig.projectName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Login Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border border-divider bg-background/90 backdrop-blur-lg">
            <CardBody className="p-8">
              {children}
            </CardBody>
          </Card>
        </div>
      </main>

      {/* Login Footer */}
      <footer className="bg-background/80 backdrop-blur-lg border-t border-divider">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-sm text-foreground-500">
              © 2024 {siteConfig.hospitalName}. สงวนลิขสิทธิ์
            </p>
            <p className="text-xs text-foreground-400 mt-1">
              ระบบจัดการข้อมูลดิจิทัล - Digital Transformation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 