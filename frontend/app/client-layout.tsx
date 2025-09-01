'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

// ========================================
// CLIENT LAYOUT COMPONENT
// ========================================

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ตรวจสอบว่าเป็นหน้า login หรือ app pages หรือไม่
  const isLoginPage = pathname === '/login';
  const isAppPage = pathname.startsWith('/dashboard') || pathname.startsWith('/revenue') || pathname.startsWith('/theme');

  return (
    <>
      {/* Layout สำหรับหน้า Login */}
      {isLoginPage && (
        <div className='min-h-screen bg-gradient-to-br from-background via-content2/20 to-content3/20'>
          {children}
        </div>
      )}

      {/* Layout สำหรับหน้า App (Dashboard, Revenue, Theme) */}
      {isAppPage && (
        <div className='min-h-screen bg-background'>{children}</div>
      )}

      {/* Layout สำหรับหน้าแรก (Landing Page) และหน้าอื่นๆ */}
      {!isLoginPage && !isAppPage && (
        <div className='min-h-screen bg-gradient-to-br from-background via-content2/20 to-content3/20'>
          {children}
        </div>
      )}
    </>
  );
} 