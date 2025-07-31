'use client';

import * as React from 'react';
import { HeroUIProvider } from '@heroui/react';
import { useRouter } from 'next/navigation';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ui';

export interface ProvidersProps {
  children: React.ReactNode;
}

declare module '@react-types/shared' {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>['push']>[1]
    >;
  }
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </HeroUIProvider>
  );
}
