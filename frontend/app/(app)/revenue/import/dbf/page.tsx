'use client';

import React from 'react';

export default function DBFImportPage() {
    return (
        <div className='container mx-auto p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-foreground'>นำเข้าไฟล์ DBF</h1>
                    <p className='text-default-600 mt-2'>อัปโหลดและประมวลผลไฟล์ DBF</p>
                </div>
            </div>
        </div>
    );
} 