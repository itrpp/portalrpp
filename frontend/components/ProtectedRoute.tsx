"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@heroui/react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, fallback, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ตรวจสอบว่ากำลังอยู่ในหน้าสาธารณะหรือไม่
    const publicPages = ['/', '/login', '/theme'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPages.includes(currentPath);
    
    // ถ้าไม่ได้ login และไม่ได้อยู่ในหน้าสาธารณะ ให้ redirect ไป login
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      router.push("/login");
      return;
    }

    // ตรวจสอบ role ถ้ามีการกำหนด
    if (!isLoading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, isLoading, router, requiredRole, user?.role]);

  // แสดง loading spinner ขณะตรวจสอบ authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3 transition-colors duration-500">
        <div className="text-center">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-default-600 dark:text-default-400">
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

  // ตรวจสอบ role ถ้ามีการกำหนด
  if (requiredRole && user?.role !== requiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null; // จะ redirect ไป dashboard ใน useEffect
  }

  // ถ้า login แล้วและมีสิทธิ์ ให้แสดง children
  return <>{children}</>;
} 