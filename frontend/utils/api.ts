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
// DBF TYPES
// ========================================

export interface DBFFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  status: string;
  createdAt: string;
  schema?: string;
  userId: string;
}

export interface DBFExport {
  id: string;
  filename: string;
  format: string;
  status: string;
  downloadUrl?: string | undefined;
  recordCount: number;
  updatedRecordCount: number;
  createdAt: string;
  userId: string;
  fileId: string;
}

export interface ExportResult {
  originalFile: string;
  exportedFile: string | null;
  recordCount: number;
  updatedRecordCount?: number;
  downloadUrl: string | null;
  status: string;
  reason?: string;
  error?: string;
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

  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData,
    options: globalThis.RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: globalThis.RequestInit = {
      headers: {
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, {
        ...config,
        method: 'POST',
        body: formData,
      });

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

  // ========================================
  // AUTHENTICATION METHODS (สำหรับ NextAuth)
  // ========================================

  /**
   * สร้าง headers สำหรับ authentication จาก NextAuth session
   */
  private getAuthHeaders(session: any): Record<string, string> {
    const headers: Record<string, string> = {};

    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }

    if (session?.sessionToken) {
      headers['X-Session-Token'] = session.sessionToken;
    }

    return headers;
  }

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน (ใช้ NextAuth session)
   */
  async getCurrentUser(session: any): Promise<{ success: boolean; data?: User }> {
    try {
      const response = await this.request<{ success: boolean; data?: User }>(
        '/api/auth/me',
        {
          headers: this.getAuthHeaders(session),
        }
      );
      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * ดึงข้อมูล Profile
   */
  async getProfile(session: any): Promise<{ success: boolean; data?: unknown }> {
    try {
      const response = await this.request<{ success: boolean; data?: unknown }>(
        '/api/auth/profile',
        {
          headers: this.getAuthHeaders(session),
        }
      );
      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * อัปเดต Profile
   */
  async updateProfile(
    session: any,
    data: ProfileUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(
      '/api/auth/profile',
      {
        method: 'PUT',
        headers: this.getAuthHeaders(session),
        body: JSON.stringify(data),
      }
    );

    return response;
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  async changePassword(
    session: any,
    data: ChangePasswordRequest
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(
      '/api/auth/change-password',
      {
        method: 'PUT',
        headers: this.getAuthHeaders(session),
        body: JSON.stringify(data),
      }
    );

    return response;
  }

  // ========================================
  // DBF METHODS
  // ========================================

  /**
   * ดึงรายการไฟล์ DBF ทั้งหมด
   */
  async getDBFFiles(session: any): Promise<DBFFile[]> {
    return await this.request<DBFFile[]>('/api/dbf/files', {
      headers: this.getAuthHeaders(session),
    });
  }

  /**
   * ดึงไฟล์ DBF ตาม ID
   */
  async getDBFFile(session: any, id: string): Promise<DBFFile> {
    return await this.request<DBFFile>(`/api/dbf/files/${id}`, {
      headers: this.getAuthHeaders(session),
    });
  }

  /**
   * อัปโหลดไฟล์ DBF
   */
  async uploadDBFFile(session: any, file: File, schema?: any): Promise<DBFFile> {
    const formData = new FormData();
    formData.append('file', file);

    if (schema) {
      formData.append('schema', JSON.stringify(schema));
    }

    return await this.uploadRequest<DBFFile>('/api/dbf/files', formData, {
      headers: this.getAuthHeaders(session),
    });
  }

  /**
   * ลบไฟล์ DBF
   */
  async deleteDBFFile(session: any, id: string): Promise<void> {
    await this.request(`/api/dbf/files/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(session),
    });
  }

  /**
   * ดึงรายการการส่งออกทั้งหมด
   */
  async getDBFExports(session: any): Promise<DBFExport[]> {
    return await this.request<DBFExport[]>('/api/dbf/exports', {
      headers: this.getAuthHeaders(session),
    });
  }

  /**
   * สร้างการส่งออกใหม่
   */
  async createDBFExport(session: any, data: {
    fileId: string;
    filename: string;
    format: string;
  }): Promise<DBFExport> {
    return await this.request<DBFExport>('/api/dbf/exports', {
      method: 'POST',
      headers: this.getAuthHeaders(session),
      body: JSON.stringify(data),
    });
  }

  /**
   * อัปเดตการส่งออก
   */
  async updateDBFExport(
    session: any,
    id: string,
    data: {
      filename?: string;
      format?: string;
      status?: string;
      recordCount?: number;
      updatedRecordCount?: number;
      downloadUrl?: string;
    }
  ): Promise<DBFExport> {
    return await this.request<DBFExport>(`/api/dbf/exports/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(session),
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // SESSION MANAGEMENT METHODS
  // ========================================

  async getActiveSessions(session: any): Promise<{
    success: boolean;
    data?: {
      sessions: Array<{
        id: string;
        sessionToken: string;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: string;
        expires: string;
        isCurrentSession: boolean;
      }>;
      totalSessions: number;
    };
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        data?: {
          sessions: Array<{
            id: string;
            sessionToken: string;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: string;
            expires: string;
            isCurrentSession: boolean;
          }>;
          totalSessions: number;
        };
      }>('/api/auth/active-sessions', {
        method: 'GET',
        headers: this.getAuthHeaders(session),
      });

      return response;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw new ApiError('เกิดข้อผิดพลาดในการดึงรายการ session', 500, error);
    }
  }

  async revokeOtherSessions(session: any): Promise<{
    success: boolean;
    message: string;
    data?: {
      deletedCount: number;
      remainingSessions: number;
    };
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message: string;
        data?: {
          deletedCount: number;
          remainingSessions: number;
        };
      }>('/api/auth/revoke-other-sessions', {
        method: 'POST',
        headers: this.getAuthHeaders(session),
      });

      return response;
    } catch (error) {
      console.error('Error revoking other sessions:', error);
      throw new ApiError('เกิดข้อผิดพลาดในการลบ session อื่นๆ', 500, error);
    }
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
