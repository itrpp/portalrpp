// ========================================
// AUTH UTILITIES
// ========================================

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { validateSession } from '@/app/api/client';

// ========================================
// TYPES
// ========================================

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    session: unknown;
}

// ========================================
// HOOKS
// ========================================

/**
 * Hook สำหรับจัดการ authentication state
 */
export function useAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        error: null,
        session: null,
    });

    useEffect(() => {
        // ตรวจสอบ session status
        if (status === 'loading') {
            setAuthState({
                isAuthenticated: false,
                isLoading: true,
                error: null,
                session: null,
            });
            return;
        }

        if (status === 'unauthenticated') {
            setAuthState({
                isAuthenticated: false,
                isLoading: false,
                error: 'ไม่มีการเข้าสู่ระบบ',
                session: null,
            });
            return;
        }

        if (status === 'authenticated' && session) {
            // ตรวจสอบ session validity
            const validation = validateSession(session);
            
            if (!validation.isValid) {
                setAuthState({
                    isAuthenticated: false,
                    isLoading: false,
                    error: validation.error || 'Session ไม่ถูกต้อง',
                    session: null,
                });
                
                // Redirect ไปหน้า login
                router.push('/login');
                return;
            }

            setAuthState({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                session,
            });
        }
    }, [session, status, router]);

    /**
     * ฟังก์ชัน logout
     */
    const logout = async () => {
        try {
            await signOut({ 
                redirect: false 
            });
            router.push('/login');
        } catch {
            // Handle logout error silently
        }
    };

    /**
     * ฟังก์ชันตรวจสอบ session validity
     */
    const checkSessionValidity = () => {
        if (!session) {
            return { isValid: false,
error: 'ไม่มีการเข้าสู่ระบบ' };
        }
        return validateSession(session);
    };

    /**
     * ฟังก์ชัน refresh session
     */
    const refreshSession = async () => {
        try {
            // ใช้ NextAuth refresh token mechanism
            await signOut({ 
                redirect: false 
            });
            router.push('/login');
        } catch {
            // Handle refresh error silently
        }
    };

    return {
        ...authState,
        logout,
        checkSessionValidity,
        refreshSession,
    };
}

/**
 * Hook สำหรับตรวจสอบ authentication ก่อนเรียก API
 */
export function useApiAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();

    /**
     * ตรวจสอบ session ก่อนเรียก API
     */
    const validateApiSession = () => {
        if (status === 'loading') {
            return { isValid: false,
error: 'กำลังโหลด session...' };
        }

        if (status === 'unauthenticated') {
            return { isValid: false,
error: 'ไม่มีการเข้าสู่ระบบ' };
        }

        if (!session) {
            return { isValid: false,
error: 'Session ไม่ถูกต้อง' };
        }

        return validateSession(session);
    };

    /**
     * ฟังก์ชันสำหรับจัดการ API error
     */
    const handleApiError = (error: unknown) => {
        if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
            // Session หมดอายุ
            router.push('/login');
            return;
        }
    };

    return {
        session,
        status,
        validateApiSession,
        handleApiError,
    };
}

// ========================================
// UTILITIES
// ========================================

/**
 * ตรวจสอบว่า token หมดอายุหรือไม่
 */
export function isTokenExpired(token: string): boolean {
    try {
        const [, payload] = token.split('.');
        if (!payload) return true;

        const tokenData = JSON.parse(atob(payload));
        const currentTime = Date.now() / 1000;
        
        return tokenData.exp < currentTime;
    } catch {
        return true;
    }
}

/**
 * ตรวจสอบว่า token จะหมดอายุเร็วๆ นี้หรือไม่
 */
export function isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
    try {
        const [, payload] = token.split('.');
        if (!payload) return true;

        const tokenData = JSON.parse(atob(payload));
        const currentTime = Date.now() / 1000;
        const bufferTime = bufferMinutes * 60;
        
        return tokenData.exp < (currentTime + bufferTime);
    } catch {
        return true;
    }
}

/**
 * แปลงเวลา expiration เป็นวันที่อ่านได้
 */
export function formatTokenExpiration(token: string): string {
    try {
        const [, payload] = token.split('.');
        if (!payload) return 'ไม่ทราบ';

        const tokenData = JSON.parse(atob(payload));
        const expirationDate = new Date(tokenData.exp * 1000);
        
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(expirationDate);
    } catch {
        return 'ไม่ทราบ';
    }
} 