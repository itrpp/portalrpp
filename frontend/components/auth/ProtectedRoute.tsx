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
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (requiredRole && session.user.role !== requiredRole) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, requiredRole, router]);

  // แสดง loading ขณะตรวจสอบ session
  if (status === 'loading') {
    return fallback || <LoadingSpinner />;
  }

  // ถ้าไม่มี session ให้ redirect ไป login
  if (!session) {
    return null;
  }

  // ถ้ามี requiredRole แต่ user ไม่มี role ที่ต้องการ
  if (requiredRole && session.user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
