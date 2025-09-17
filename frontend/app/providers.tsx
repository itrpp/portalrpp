'use client';

import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@heroui/react';

// ========================================
// PROVIDERS COMPONENT
// ========================================

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider
            placement="top-right"
            maxVisibleToasts={3}
            toastProps={{
              timeout: 5000,
              color: 'default',
              variant: 'flat',
              radius: 'md',
              classNames: {
                base: 'bg-background border border-default-300 dark:border-default-600 shadow-lg',
                title: 'text-foreground font-medium',
                description: 'text-default-600 dark:text-default-400',
                closeButton: 'text-default-400 hover:text-foreground',
              }
            }}
          />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
