'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api as apiClient } from '@/utils/api';
import type { User } from '@/types';

// ========================================
// TYPES
// ========================================

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (
    email: string,
    password: string,
    authMethod?: 'local' | 'ldap'
  ) => Promise<boolean>;
  // eslint-disable-next-line no-unused-vars
  loginLDAP: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

// ========================================
// CONTEXT
// ========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========================================
// PROVIDER
// ========================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ========================================
  // INITIALIZATION
  // ========================================

  const initializeAuth = async () => {
    try {
      // ตรวจสอบข้อมูลผู้ใช้จาก sessionStorage ก่อน
      const storedUser = apiClient.getStoredUser();
      const hasToken = apiClient.isAuthenticated();

      if (storedUser && hasToken) {
        setUser(storedUser);
        setLoading(false);
        return;
      }

      // มี token แต่ไม่มีข้อมูลผู้ใช้ ให้ดึงข้อมูลใหม่
      if (hasToken) {
        try {
          const userResult = await apiClient.getCurrentUser();
          if (userResult.success && userResult.data) {
            setUser(userResult.data);
            sessionStorage.setItem('user', JSON.stringify(userResult.data));
          }
        } catch {
          // ไม่เรียก clearAuth() และไม่ล้างข้อมูล - ให้ผู้ใช้ตัดสินใจเอง
        }
      }
    } catch {
      // ไม่เรียก clearAuth() และไม่ล้างข้อมูล - ให้ผู้ใช้ตัดสินใจเอง
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  // ========================================
  // AUTHENTICATION METHODS
  // ========================================

  const login = async (
    email: string,
    password: string,
    authMethod: 'local' | 'ldap' = 'local'
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const response =
        authMethod === 'ldap'
          ? await apiClient.loginLDAP({ username: email,
password })
          : await apiClient.login({ email,
password,
authMethod });

      if (response.success) {
        const userData = response.data?.user || response.user;
        const token = response.data?.token || response.accessToken;
        const refreshToken =
          response.data?.refreshToken || response.refreshToken;

        if (userData && token && refreshToken) {
          // อัปเดตข้อมูลผู้ใช้จาก getUserInfo เพื่อให้ข้อมูลตรงกับ backend
          try {
            const currentUserResult = await apiClient.getCurrentUser();
            if (currentUserResult.success && currentUserResult.data) {
              setUser(currentUserResult.data);
              sessionStorage.setItem(
                'user',
                JSON.stringify(currentUserResult.data)
              );
            } else {
              // ใช้ข้อมูลจาก login response ถ้า getUserInfo ไม่สำเร็จ
              setUser(userData);
              sessionStorage.setItem('user', JSON.stringify(userData));
            }
          } catch (error) {
            // ใช้ข้อมูลจาก login response ถ้า getUserInfo ไม่สำเร็จ
            setUser(userData);
            sessionStorage.setItem('user', JSON.stringify(userData));
          }

          sessionStorage.setItem('auth_token', token);
          sessionStorage.setItem('refresh_token', refreshToken);

          // เก็บ sessionToken ถ้ามี
          if (response.sessionToken) {
            sessionStorage.setItem('session_token', response.sessionToken);
          }

          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginLDAP = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    return login(username, password, 'ldap');
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await apiClient.logout();
    } catch {
      // console.error("Logout error:", error);
    } finally {
      setUser(null);
      apiClient.clearAuth();
      setLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await apiClient.refreshToken();

      if (response.success) {
        const userData = response.data?.user || response.user;
        const token = response.data?.token || response.accessToken;
        const refreshToken =
          response.data?.refreshToken || response.refreshToken;

        if (userData && token && refreshToken) {
          // อัปเดตข้อมูลผู้ใช้จาก getUserInfo เพื่อให้ข้อมูลตรงกับ backend
          try {
            const currentUserResult = await apiClient.getCurrentUser();
            if (currentUserResult.success && currentUserResult.data) {
              setUser(currentUserResult.data);
              sessionStorage.setItem(
                'user',
                JSON.stringify(currentUserResult.data)
              );
            } else {
              // ใช้ข้อมูลจาก refresh response ถ้า getUserInfo ไม่สำเร็จ
              setUser(userData);
              sessionStorage.setItem('user', JSON.stringify(userData));
            }
          } catch {
            // ใช้ข้อมูลจาก refresh response ถ้า getUserInfo ไม่สำเร็จ
            setUser(userData);
            sessionStorage.setItem('user', JSON.stringify(userData));
          }

          sessionStorage.setItem('auth_token', token);
          sessionStorage.setItem('refresh_token', refreshToken);

          // เก็บ sessionToken ถ้ามี
          if (response.sessionToken) {
            sessionStorage.setItem('session_token', response.sessionToken);
          }

          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const response = await apiClient.validateSession();

      if (response.success) {
        // รองรับทั้งรูปแบบเก่าและใหม่
        const userData = response.data?.user || response.user;

        if (userData) {
          setUser(userData);
          // อัปเดต sessionStorage
          sessionStorage.setItem('user', JSON.stringify(userData));
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user && apiClient.isAuthenticated(),
    isLoading: loading,
    login,
    loginLDAP,
    logout,
    refreshToken,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ========================================
// HOOK
// ========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
