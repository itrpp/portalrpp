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
color: "#000000" },
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
      <head>
        <meta content={siteConfig.projectName} name="application-name" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <meta
          content={siteConfig.projectName}
          name="apple-mobile-web-app-title"
        />
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="/browserconfig.xml" name="msapplication-config" />
        <meta content="#2563eb" name="msapplication-TileColor" />
        <meta content="no" name="msapplication-tap-highlight" />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontPrompt.className} bg-gray-50`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
