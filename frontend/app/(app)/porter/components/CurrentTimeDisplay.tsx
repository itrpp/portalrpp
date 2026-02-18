'use client';

import React, { useEffect, useState } from 'react';
import { startTransition } from 'react';

/**
 * Component สำหรับแสดงเวลาปัจจุบัน
 * ใช้ startTransition เพื่อไม่ให้ re-render ทั้งหน้าเมื่อเวลาอัปเดต
 */
export function CurrentTimeDisplay() {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      // ใช้ startTransition เพื่อไม่ให้ block UI
      startTransition(() => {
        setCurrentDateTime(new Date());
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <span className="tabular-nums">
      {currentDateTime.toLocaleTimeString('th-TH', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  );
}
