import type { ThemeProviderProps } from "next-themes";
import type { useRouter } from "next/navigation";

import React from "react";

/**
 * ========================================
 * PROVIDERS TYPES
 * ========================================
 * Types สำหรับ providers components
 */

/**
 * Props สำหรับ Providers component
 */
export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

/**
 * Module declaration สำหรับ @react-types/shared
 * เพิ่ม type definition สำหรับ router options
 */
declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}
