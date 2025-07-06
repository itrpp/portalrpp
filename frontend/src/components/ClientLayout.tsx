"use client";

import { NextAuthProvider } from "@/contexts/NextAuthContext";
import { SessionProvider } from "next-auth/react";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <SessionProvider>
      <NextAuthProvider>{children}</NextAuthProvider>
    </SessionProvider>
  );
}
