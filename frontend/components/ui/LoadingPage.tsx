'use client';

import React from 'react';

import { LOADING_MESSAGES } from '../../lib/constants';

import { Logo } from '@/components/icons';

interface LoadingPageProps {
  message?: string;
  showProgress?: boolean;
}

/**
 * LoadingPage Component
 *
 * React client component สำหรับแสดงหน้าจอโหลดแบบ full-screen overlay
 * ใช้เวลาเปลี่ยนหน้า / โหลดข้อมูล / ทำงานเบื้องหลังที่ต้องการให้ผู้ใช้รอ
 *
 * @param message - ข้อความหลักตรงกลางหน้าจอ (default: LOADING_MESSAGES.page)
 * @param showProgress - เปิด/ปิด progress bar ด้านล่างข้อความ (default: true)
 */
export function LoadingPage({
  message = LOADING_MESSAGES.page,
  showProgress = true,
}: LoadingPageProps) {
  const [progress, setProgress] = React.useState(0);

  // อัปเดต progress ทุก 200ms แบบสุ่ม 0-15 และหยุดที่ 90%
  React.useEffect(() => {
    if (!showProgress) {
      setProgress(0);

      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        // เพิ่มแบบสุ่ม 0-15 และหยุดที่ 90%
        const increment = Math.random() * 15;
        const newProgress = Math.min(prev + increment, 90);

        return newProgress;
      });
    }, 200); // อัปเดตทุก 200ms

    return () => {
      clearInterval(interval);
    };
  }, [showProgress]);

  return (
    <div
      aria-label={message}
      aria-live="polite"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-background"
      role="status"
    >
      <div className="text-center">
        {/* Logo + Loading Animation Combined */}
        <div className="mb-8">
          <div className="relative h-24 w-24 mx-auto">
            {/* Base Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-default-200 z-0" />

            {/* Spinning Accent Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/60 animate-spin z-10" />

            {/* Soft Glow */}
            <div className="absolute -inset-2 rounded-full bg-primary/10 blur-xl animate-pulse z-0" />

            {/* Logo in Center */}
            <div className="absolute inset-2 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-lg z-20">
              <Logo className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-default-500 mt-2">{LOADING_MESSAGES.pleaseWait}</p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-64 mx-auto">
            <div className="bg-default-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-default-500 mt-2 tabular-nums">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Decorative Elements - จุดกระพริบ 3 จุด */}
        <div className="mt-8 flex justify-center space-x-2">
          <div
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>

      {/* Background Pattern - gradient + pattern จาง ๆ */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)] bg-[length:20px_20px]" />
      </div>
    </div>
  );
}

export default LoadingPage;
