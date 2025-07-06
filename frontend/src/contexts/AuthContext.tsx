"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
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
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        return true;
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setToken(null);
        return false;
      }
    } catch {
      // Token refresh error
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setToken(null);
      return false;
    }
  }, [API_BASE_URL]);

  // ตรวจสอบ token ที่เก็บไว้ใน localStorage เมื่อเริ่มต้น
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        const storedRefreshToken = localStorage.getItem("refreshToken");

        if (storedToken) {
          const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            // Token หมดอายุ, ลองใช้ refresh token
            const refreshSuccess = await refreshToken();
            if (!refreshSuccess) {
              localStorage.removeItem("authToken");
              localStorage.removeItem("refreshToken");
            }
          }
        } else if (storedRefreshToken) {
          const refreshSuccess = await refreshToken();
          if (!refreshSuccess) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
          }
        }
      } catch {
        // Error checking auth status
        // ลอง refresh token ก่อนที่จะล้างข้อมูล
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [API_BASE_URL, refreshToken]);

  // Auto refresh token every 6 days (before 7 days expiry)
  useEffect(() => {
    if (token) {
      const refreshInterval = setInterval(
        async () => {
          await refreshToken();
        },
        6 * 24 * 60 * 60 * 1000,
      ); // 6 days in milliseconds

      return () => clearInterval(refreshInterval);
    }
  }, [token, refreshToken]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // สร้าง AbortController สำหรับ timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 วินาที

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message:
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      return { success: true, message: "เข้าสู่ระบบสำเร็จ" };
    } catch (error) {
      // Login error

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            message: "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง",
          };
        }
        if (error.message.includes("fetch")) {
          return {
            success: false,
            message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          };
        }
      }

      return { success: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message:
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      return { success: true, message: "สมัครสมาชิกสำเร็จ" };
    } catch (error) {
      // Registration error

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            message: "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง",
          };
        }
        if (error.message.includes("fetch")) {
          return {
            success: false,
            message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          };
        }
      }

      return { success: false, message: "เกิดข้อผิดพลาดในการสมัครสมาชิก" };
    }
  };

  const logout = async () => {
    try {
      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (storedRefreshToken) {
        // แจ้งเซิร์ฟเวอร์ว่าต้องการ logout
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        }).catch(() => {
          // Logout error - silently ignore
        });
      }
    } catch {
      // Logout error - silently ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
