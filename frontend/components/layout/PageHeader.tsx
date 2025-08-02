'use client';

import React from 'react';
import { useSession } from 'next-auth/react';

// ========================================
// PAGE HEADER COMPONENT
// ========================================

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
    const { data: session } = useSession();

    return (
        <div className='flex flex-col gap-4 p-6 bg-background border-b border-divider'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground'>{title}</h1>
                    {subtitle && (
                        <p className='text-default-600 mt-1'>{subtitle}</p>
                    )}
                    {session?.user && (
                        <p className='text-sm text-default-500 mt-2'>
                            ยินดีต้อนรับ, {session.user.name || session.user.email}
                        </p>
                    )}
                </div>
                {children && <div className='flex items-center gap-2'>{children}</div>}
            </div>
        </div>
    );
}

export default PageHeader; 