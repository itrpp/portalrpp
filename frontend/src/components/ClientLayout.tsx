"use client";

import { NextAuthProvider } from "@/contexts/NextAuthContext";
import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <SessionProvider>
      <NextAuthProvider>
        <HeroUIProvider>{children}</HeroUIProvider>
      </NextAuthProvider>
    </SessionProvider>
  );
}
