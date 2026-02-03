"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

import { ProvidersProps } from "@/types/providers";

/**
 * ========================================
 * PROVIDERS COMPONENT
 * ========================================
 * Component สำหรับ wrap application ด้วย providers ต่างๆ
 * - SessionProvider (NextAuth)
 * - HeroUIProvider (UI Library)
 * - ThemeProvider (Theme Management)
 * - ToastProvider (Toast Notifications)
 */
export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <SessionProvider>
      <HeroUIProvider locale="th" navigate={router.push}>
        <NextThemesProvider
          {...themeProps}
          enableSystem={false}
          forcedTheme="light"
        >
          {children}
          <ToastProvider
            maxVisibleToasts={3}
            placement="top-right"
            toastProps={{
              timeout: 5000,
              color: "default",
              variant: "flat",
              radius: "md",
              classNames: {
                base: "bg-background border border-default-300 shadow-lg",
                title: "text-foreground font-medium",
                description: "text-default-600",
                closeButton: "text-default-400 hover:text-foreground",
              },
            }}
          />
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
