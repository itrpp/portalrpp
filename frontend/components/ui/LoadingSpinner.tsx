'use client';

import { Spinner } from '@heroui/react';

// ========================================
// LOADING SPINNER COMPONENT
// ========================================

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    text?: string;
}

export function LoadingSpinner({
    size = 'lg',
    color = 'primary',
    text = 'กำลังโหลด...'
}: LoadingSpinnerProps) {
    return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3'>
            <div className='text-center'>
                <Spinner size={size} color={color} />
                {text && (
                    <p className='mt-4 text-default-600 dark:text-default-400'>
                        {text}
                    </p>
                )}
            </div>
        </div>
    );
} 