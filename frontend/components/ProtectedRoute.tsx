"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@heroui/react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ตรวจสอบว่ากำลังอยู่ในหน้าสาธารณะหรือไม่
    const publicPages = ['/', '/login'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPages.includes(currentPath);
    
    // ถ้าไม่ได้ login และไม่ได้อยู่ในหน้าสาธารณะ ให้ redirect ไป login
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // แสดง loading spinner ขณะตรวจสอบ authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="text-center">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            กำลังตรวจสอบการเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้ login ให้แสดง fallback หรือ redirect
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null; // จะ redirect ไป login ใน useEffect
  }

  // ถ้า login แล้วให้แสดง children
  return <>{children}</>;
} 