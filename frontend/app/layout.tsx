import "@/styles/globals.css";
import { Metadata, Viewport } from "next";

import { Providers } from "./providers";
import { ClientLayout } from "./client-layout";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
// import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.projectName,
    template: `%s - ${siteConfig.projectName}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={`${fontSans.variable}`} lang="th">
      <head>
        <title>{siteConfig.projectName}</title>
        <meta
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
          name="description"
        />
        <meta
          content="โรงพยาบาล,ราชพิพัฒน์,ระบบจัดการข้อมูล,Digital Transformation,Healthcare Management"
          name="keywords"
        />
        <meta content={siteConfig.hospitalName} name="author" />
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          name="viewport"
        />
        <link href="/images/logo.png" rel="icon" />
        <link href="/images/logo.png" rel="apple-touch-icon" />
        <meta content="#3b82f6" name="theme-color" />
        <meta content={siteConfig.projectName} property="og:title" />
        <meta
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
          property="og:description"
        />
        <meta content="website" property="og:type" />
        <meta content="/images/logo.png" property="og:image" />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={siteConfig.projectName} name="twitter:title" />
        <meta
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
          name="twitter:description"
        />
        <meta content="/images/logo.png" name="twitter:image" />
      </head>
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
