'use client';

import React from 'react';

// ========================================
// REVENUE PAGE
// ========================================

export default function RevenuePage() {
  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        {/* Header */}
        <div>
          <h1 className='text-3xl font-bold text-foreground'>
            ระบบงานจัดเก็บรายได้
          </h1>
          <p className='text-default-600 mt-2'>
            จัดการไฟล์ DBF และข้อมูลรายได้
          </p>
        </div>
      </div>
    </div>
  );
}
