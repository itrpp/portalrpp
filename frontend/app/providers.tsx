"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthProvider } from "@/contexts/AuthContext";

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

// Theme Sync Component
function ThemeSync({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // อ่านค่า theme จาก localStorage
    const storedTheme = localStorage.getItem('portalrpp-theme') as 'light' | 'dark' | null;
    const currentTheme = storedTheme || 'dark';
    
    // ตั้งค่า class บน document (HeroUI ใช้ class แทน data-theme)
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentTheme);
    
    console.log('ThemeSync: Initial theme set:', currentTheme);
    
    // ฟัง theme change events จาก ThemeToggle
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newTheme = customEvent.detail;
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      console.log('ThemeSync: Theme changed to:', newTheme);
    };
    
    window.addEventListener('theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider 
      navigate={router.push}
    >
      <ThemeSync>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeSync>
    </HeroUIProvider>
  );
}
