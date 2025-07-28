"use client";

import React from "react";
import { Providers } from "@/app/providers";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers
      themeProps={{
        attribute: "class",
        defaultTheme: "light",
        enableSystem: false,
        disableTransitionOnChange: true,
        storageKey: "rpp-theme",
      }}
    >
      {children}
    </Providers>
  );
}
