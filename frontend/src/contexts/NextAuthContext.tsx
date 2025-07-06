"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface NextAuthContextType {
  user: User | null;
  token: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
}

const NextAuthContext = createContext<NextAuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(NextAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a NextAuthProvider");
  }
  return context;
};

interface NextAuthProviderProps {
  children: ReactNode;
}

export const NextAuthProvider: React.FC<NextAuthProviderProps> = ({
  children,
}) => {
  const { data: session, status } = useSession();

  const user = session?.user
    ? {
        id: (session.user as { id?: string }).id || "",
        email: session.user.email || "",
        name: session.user.name || "",
        role: (session.user as { role?: string }).role || "user",
      }
    : null;

  const token = (session as { accessToken?: string })?.accessToken || null;
  const isLoading = status === "loading";

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, message: "เข้าสู่ระบบไม่สำเร็จ" };
      }

      return { success: true, message: "เข้าสู่ระบบสำเร็จ" };
    } catch (error) {
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการเข้าสู่ระบบ : ${error}`,
      };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.error || "การสมัครสมาชิกไม่สำเร็จ",
        };
      }

      return { success: true, message: "สมัครสมาชิกสำเร็จ" };
    } catch (error) {
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการสมัครสมาชิก : ${error}`,
      };
    }
  };

  const logout = () => {
    signOut({ redirect: false });
  };

  return (
    <NextAuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </NextAuthContext.Provider>
  );
};
