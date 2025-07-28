// ========================================
// API Service สำหรับเชื่อมต่อกับ Backend
// ========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ========================================
// TYPES
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
  authMethod?: 'local' | 'ldap';
}

export interface LoginLDAPRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
    };
    token: string;
    refreshToken: string;
  };
  // รองรับ response format ใหม่จาก backend
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;
  expiresIn?: number;
}

export interface LogoutRequest {
  sessionToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ValidateSessionRequest {
  sessionToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  image?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ========================================
// API CLIENT
// ========================================

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: globalThis.RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: globalThis.RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // เพิ่ม Authorization header ถ้ามี token
    const token = this.getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        {}
      );
    }
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('session_token');
    sessionStorage.removeItem('user');
  }

  // ========================================
  // AUTHENTICATION METHODS
  // ========================================

  /**
   * เข้าสู่ระบบ (Local Authentication)
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      // รองรับทั้งรูปแบบเก่าและใหม่
      const userData = response.data?.user || response.user;
      const token = response.data?.token || response.accessToken;
      const refreshToken = response.data?.refreshToken || response.refreshToken;
      
      if (userData && token && refreshToken) {
        this.setToken(token);
        sessionStorage.setItem('refresh_token', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
        // เก็บ sessionToken สำหรับ logout
        if (response.sessionToken) {
          sessionStorage.setItem('session_token', response.sessionToken);
        }
      }
    }

    return response;
  }

  /**
   * เข้าสู่ระบบ (LDAP Authentication)
   */
  async loginLDAP(data: LoginLDAPRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login-ldap', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      // รองรับทั้งรูปแบบเก่าและใหม่
      const userData = response.data?.user || response.user;
      const token = response.data?.token || response.accessToken;
      const refreshToken = response.data?.refreshToken || response.refreshToken;
      
      if (userData && token && refreshToken) {
        this.setToken(token);
        sessionStorage.setItem('refresh_token', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
        // เก็บ sessionToken สำหรับ logout
        if (response.sessionToken) {
          sessionStorage.setItem('session_token', response.sessionToken);
        }
      }
    }

    return response;
  }

  /**
   * ออกจากระบบ
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    const sessionToken = sessionStorage.getItem('session_token');
    
    if (sessionToken) {
      try {
        await this.request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ sessionToken }),
        });
      } catch {
        // console.warn('Logout request failed:', error);
      }
    }

    this.removeToken();
    return { success: true,
message: 'ออกจากระบบสำเร็จ' };
  }

  /**
   * ต่ออายุ Access Token
   */
  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = sessionStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new ApiError('No refresh token available', 401, {});
    }

    const response = await this.request<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success) {
      // รองรับทั้งรูปแบบเก่าและใหม่
      const userData = response.data?.user || response.user;
      const token = response.data?.token || response.accessToken;
      const refreshToken = response.data?.refreshToken || response.refreshToken;
      
      if (userData && token && refreshToken) {
        this.setToken(token);
        sessionStorage.setItem('refresh_token', refreshToken);
        // เก็บ sessionToken ใหม่ถ้ามี
        if (response.sessionToken) {
          sessionStorage.setItem('session_token', response.sessionToken);
        }
      }
    }

    return response;
  }

  /**
   * ตรวจสอบ Session
   */
  async validateSession(): Promise<{ success: boolean; data?: { user: User }; user?: User }> {
    const sessionToken = sessionStorage.getItem('session_token');
    
    if (!sessionToken) {
      return { success: false };
    }

    try {
      const response = await this.request<{ success: boolean; data?: { user: User } }>(
        '/api/auth/validate-session',
        {
          method: 'POST',
          body: JSON.stringify({ sessionToken }),
        }
      );

      return response;
    } catch {
      // console.log("❌ validateSession - Request failed:", error);
      
      // ไม่ log error สำหรับ session validation ที่ล้มเหลว เพราะเป็นเรื่องปกติ
      // console.warn('Session validation failed:', error);
      return { success: false };
    }
  }

  /**
   * ตรวจสอบสถานะ Session แบบละเอียด
   */
  async checkSessionStatus(): Promise<{ success: boolean; data?: { user: User; details: unknown } }> {
    const sessionToken = sessionStorage.getItem('session_token');
    
    if (!sessionToken) {
      return { success: false };
    }

    try {
      const response = await this.request<{ success: boolean; data?: { user: User; details: unknown } }>(
        '/api/auth/check-session-status',
        {
          method: 'POST',
          body: JSON.stringify({ sessionToken }),
        }
      );

      return response;
    } catch {
      return { success: false };
    }
  }

  // ========================================
  // USER PROFILE METHODS
  // ========================================

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน
   */
  async getCurrentUser(): Promise<{ success: boolean; data?: User }> {
    try {
      const response = await this.request<{ success: boolean; data?: User }>('/api/auth/me');
      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * ดึงข้อมูล Profile
   */
  async getProfile(): Promise<{ success: boolean; data?: unknown }> {
    try {
      const response = await this.request<{ success: boolean; data?: unknown }>('/api/auth/profile');
      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * อัปเดต Profile
   */
  async updateProfile(data: ProfileUpdateRequest): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(
      '/api/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );

    return response;
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(
      '/api/auth/change-password',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );

    return response;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * ตรวจสอบว่ามี token หรือไม่
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * ดึงข้อมูลผู้ใช้จาก sessionStorage
   */
  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * ล้างข้อมูลการ authentication ทั้งหมด
   */
  clearAuth(): void {
    this.removeToken();
  }
}

// ========================================
// ERROR HANDLING
// ========================================

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ========================================
// API INSTANCE
// ========================================

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api; // Alias for backward compatibility

// ========================================
// AUTH HOOKS
// ========================================

export const useAuth = () => {
  const isAuthenticated = api.isAuthenticated();
  const user = api.getStoredUser();

  return {
    isAuthenticated,
    user,
    login: api.login.bind(api),
    loginLDAP: api.loginLDAP.bind(api),
    logout: api.logout.bind(api),
    refreshToken: api.refreshToken.bind(api),
    validateSession: api.validateSession.bind(api),
    getCurrentUser: api.getCurrentUser.bind(api),
    getProfile: api.getProfile.bind(api),
    updateProfile: api.updateProfile.bind(api),
    changePassword: api.changePassword.bind(api),
  };
};
