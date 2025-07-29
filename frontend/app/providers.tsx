"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeToggle";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: {
    attribute?: string;
    defaultTheme?: 'dark' | 'light' | 'system';
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
  };
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider 
      navigate={router.push}
    >
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </HeroUIProvider>
  );
}
