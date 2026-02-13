"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * QueryClient สำหรับ Porter module
 * ตั้งค่า default options สำหรับ cache, retry, และ stale time
 */
const porterQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - ข้อมูลยัง fresh อยู่ 1 นาที
      gcTime: 5 * 60 * 1000, // 5 minutes - เก็บ cache ไว้ 5 นาที (เดิมชื่อ cacheTime)
      retry: 1, // retry 1 ครั้งเมื่อ fail
      refetchOnWindowFocus: false, // ไม่ refetch เมื่อ focus window (เพราะมี SSE สำหรับ real-time)
    },
  },
});

/**
 * Provider สำหรับ Porter module ที่ wrap children ด้วย QueryClientProvider
 */
export function PorterQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={porterQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
