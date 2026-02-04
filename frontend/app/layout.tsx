import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { ClientLayout } from "./client-layout";

import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { RootLayoutProps } from "@/types/layout";

/**
 * Base URL สำหรับ resolve รูป Open Graph / Twitter (ต้องตั้งเพื่อไม่ให้ Next ใช้ localhost)
 * ใช้ NEXTAUTH_URL ถ้ามี ไม่เช่นนั้นใช้ localhost ตอน dev
 */
const metadataBase = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL)
  : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteConfig.projectName,
    template: `%s - ${siteConfig.projectName}`,
  },
  description: `ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`,
  keywords: [
    "โรงพยาบาล",
    "ราชพิพัฒน์",
    "ระบบจัดการข้อมูล",
    "Digital Transformation",
    "Healthcare Management",
  ],
  authors: [{ name: siteConfig.hospitalName }],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: siteConfig.projectName,
    description: `ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`,
    type: "website",
    images: ["/images/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.projectName,
    description: `ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`,
    images: ["/images/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html suppressHydrationWarning className={`${fontSans.variable}`} lang="th">
      <body
        suppressHydrationWarning
        className={`${fontSans.className} bg-background text-foreground`}
      >
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
