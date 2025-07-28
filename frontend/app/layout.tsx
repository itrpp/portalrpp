import React from "react";
import type { Metadata, Viewport } from "next";

import "@/styles/globals.css";
import ClientLayout from "../components/ClientLayout";

import { fontPrompt, fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
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
  authors: [
    {
      name: siteConfig.hospitalName,
      url: siteConfig.links.rpp,
    },
  ],
  creator: siteConfig.hospitalName,
  publisher: siteConfig.hospitalName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  manifest: "/manifest.json",
  applicationName: siteConfig.projectName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.projectName,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-tap-highlight": "no",
  },
  openGraph: {
    title: siteConfig.projectName,
    description: `ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`,
    url: siteConfig.links.rpp,
    siteName: siteConfig.projectName,
    images: [
      {
        url: "/images/logo.png",
        width: 400,
        height: 400,
        alt: siteConfig.hospitalName,
      },
    ],
    locale: "th_TH",
    type: "website",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)",
color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",
color: "#2a2a2a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${fontPrompt.variable} ${fontSans.variable}`}
      lang="th"
    >
      <body
        suppressHydrationWarning
        className={`${fontPrompt.className} bg-background text-foreground`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
