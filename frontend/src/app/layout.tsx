import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { fontPrompt, fontSans } from "../config/fonts";
import { siteConfig } from "../config/site";

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
    icon: "/favicon.ico",
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
        width: 1200,
        height: 630,
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${fontPrompt.variable} ${fontSans.variable}`}>
      <head>
        <meta name="application-name" content={siteConfig.projectName} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="apple-mobile-web-app-title"
          content={siteConfig.projectName}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${fontPrompt.className} bg-gray-50`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
