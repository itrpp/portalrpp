"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

import "@/styles/globals.css";
import { Providers } from "./providers";

import { fontPrompt, fontSans } from "@/config/fonts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ตรวจสอบว่าเป็นหน้า home หรือ login หรือไม่
  const isLoginPage = pathname === "/login";

  return (
    <html
      suppressHydrationWarning
      className={`${fontPrompt.variable} ${fontSans.variable}`}
      lang="th"
    >
      <head>
        <title>{siteConfig.projectName}</title>
        <meta name="description" content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`} />
        <meta name="keywords" content="โรงพยาบาล,ราชพิพัฒน์,ระบบจัดการข้อมูล,Digital Transformation,Healthcare Management" />
        <meta name="author" content={siteConfig.hospitalName} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/images/logo.png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta property="og:title" content={siteConfig.projectName} />
        <meta property="og:description" content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteConfig.projectName} />
        <meta name="twitter:description" content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`} />
        <meta name="twitter:image" content="/images/logo.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontPrompt.className} bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-background via-content2/20 to-content3/20 transition-all duration-500">
            <main className="flex-1 transition-all duration-300 ease-in-out">
              <div className="p-4 sm:p-6 lg:p-8">                  
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
