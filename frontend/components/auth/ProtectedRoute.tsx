'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui';

// ========================================
// PROTECTED ROUTE COMPONENT
// ========================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    // ถ้าไม่มี session ให้ redirect ไป login
    if (!session) {
      router.push(redirectTo);
      return;
    }

    // ถ้ามี requiredRole แต่ user ไม่มี role ที่ต้องการ
    if (requiredRole && session.user.role !== requiredRole) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, requiredRole, router, redirectTo]);

  // แสดง loading ขณะตรวจสอบ session
  if (status === 'loading') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // ถ้าไม่มี session ให้แสดง loading (จะ redirect ใน useEffect)
  if (!session) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // ถ้ามี requiredRole แต่ user ไม่มี role ที่ต้องการ
  if (requiredRole && session.user.role !== requiredRole) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 border-b-2 border-danger mx-auto"></div>
          <p className="mt-4 text-default-600 dark:text-default-400">
            ไม่มีสิทธิ์เข้าถึงหน้านี้
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
