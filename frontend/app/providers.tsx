"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
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
    <SessionProvider>
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider {...themeProps}>
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
                base: "bg-background border border-default-300 dark:border-default-600 shadow-lg",
                title: "text-foreground font-medium",
                description: "text-default-600 dark:text-default-400",
                closeButton: "text-default-400 hover:text-foreground",
              },
            }}
          />
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
