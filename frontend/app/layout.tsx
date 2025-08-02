import React from 'react';
import { siteConfig } from '@/config/site';

import '@/styles/globals.css';
import { Providers } from './providers';
import { ClientLayout } from './client-layout';

import { fontPrompt, fontSans } from '@/config/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${fontPrompt.variable} ${fontSans.variable}`}
      lang='th'
    >
      <head>
        <title>{siteConfig.projectName}</title>
        <meta
          name='description'
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
        />
        <meta
          name='keywords'
          content='โรงพยาบาล,ราชพิพัฒน์,ระบบจัดการข้อมูล,Digital Transformation,Healthcare Management'
        />
        <meta name='author' content={siteConfig.hospitalName} />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        />
        <link rel='icon' href='/images/logo.png' />
        <link rel='apple-touch-icon' href='/images/logo.png' />
        <meta name='theme-color' content='#3b82f6' />
        <meta property='og:title' content={siteConfig.projectName} />
        <meta
          property='og:description'
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
        />
        <meta property='og:type' content='website' />
        <meta property='og:image' content='/images/logo.png' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={siteConfig.projectName} />
        <meta
          name='twitter:description'
          content={`ระบบจัดการข้อมูลดิจิทัล ${siteConfig.hospitalName}`}
        />
        <meta name='twitter:image' content='/images/logo.png' />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontPrompt.className} bg-background text-foreground`}
      >
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
