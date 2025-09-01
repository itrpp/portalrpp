// ========================================
// API Client สำหรับเชื่อมต่อกับ Backend
// ========================================

import { Session } from 'next-auth';

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
// REVENUE TYPES
// ========================================

export interface UploadBatch {
    id: string;
    batchName: string;
    uploadDate: Date;
    totalFiles: number;
    successFiles: number;
    errorFiles: number;
    processingFiles: number;
    totalRecords: number;
    totalSize: number;
    status: 'success' | 'error' | 'processing' | 'partial';
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    exportStatus: 'not_exported' | 'exporting' | 'exported' | 'export_failed';
    files?: UploadHistory[];
}

export interface UploadHistory {
    id: string;
    fileName: string;
    fileSize: number;
    uploadDate: Date;
    status: 'success' | 'error' | 'processing' | 'pending';
    recordsCount?: number;
    errorMessage?: string;
}

export interface ValidationStep {
    running: boolean;
    completed: boolean;
    passed: boolean;
    skipped?: boolean;
    error?: string;
}

export interface ValidationSteps {
    checksum?: ValidationStep;
    integrity?: ValidationStep;
    structure?: ValidationStep;
}

export interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'validating' | 'processing' | 'imported' | 'error' | 'completed' | 'failed';
    progress: number;
    error?: string;
    checksum?: string;
    fileSize?: number;
    validationSteps?: ValidationSteps;
    validationProgress?: number;
    recordsCount?: number;
}

export interface BatchUploadResult {
    batchId: string;
    batchName: string;
    totalFiles: number;
    successFiles: number;
    errorFiles: number;
    results: FileUploadResult[];
    totalSize: number;
    totalRecords: number;
    processingTime: number;
    status: 'success' | 'error' | 'processing' | 'partial';
}

export interface FileUploadResult {
    success: boolean;
    message: string;
    filename?: string;
    fileId?: string;
    fileSize?: number;
    uploadDate?: Date;
    errors?: string[];
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
// SESSION VALIDATION
// ========================================

/**
 * ตรวจสอบว่า session ถูกต้องและมี token ที่จำเป็น
 */
export function validateSession(session: Session | null): { isValid: boolean; error?: string } {
    if (!session) {
        return { 
            isValid: false, 
            error: 'Session ไม่ถูกต้อง - ไม่มี session' 
        };
    }

    // ตรวจสอบว่ามี accessToken หรือ sessionToken อย่างน้อยหนึ่งตัว
    if (!session.accessToken && !session.sessionToken) {
        return { 
            isValid: false, 
            error: 'Session ไม่ถูกต้อง - ไม่มี access token หรือ session token' 
        };
    }

    // ถ้ามี accessToken ให้ตรวจสอบ format
    if (session.accessToken) {
        try {
            const [, payload] = session.accessToken.split('.');
            if (!payload) {
                return { 
                    isValid: false, 
                    error: 'Session ไม่ถูกต้อง - token format ไม่ถูกต้อง' 
                };
            }

            const tokenData = JSON.parse(atob(payload));
            const currentTime = Date.now() / 1000;
            
            // ตรวจสอบว่า token หมดอายุแล้วหรือไม่ (ไม่ใช่จะหมดอายุเร็วๆ นี้)
            if (tokenData.exp < currentTime) {
                return { 
                    isValid: false, 
                    error: 'Session หมดอายุ - token หมดอายุแล้ว' 
                };
            }

            // ไม่ตรวจสอบว่า token จะหมดอายุใน 5 นาทีหรือไม่ ให้ NextAuth จัดการเอง
            return { 
                isValid: true 
            };
        } catch (error) {
            return { 
                isValid: false, 
                error: 'Session ไม่ถูกต้อง - ไม่สามารถตรวจสอบ token ได้' 
            };
        }
    }

    // ถ้ามีเฉพาะ sessionToken ให้ถือว่าถูกต้อง (ให้ backend ตรวจสอบ)
    return { 
        isValid: true 
    };
}

// ========================================
// API CLIENT
// ========================================

class ApiClient {
    private baseURL: string;
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /**
     * สร้าง headers สำหรับ authentication จาก NextAuth session
     */
    private getAuthHeaders(session: Session | null): Record<string, string> {
        const headers: Record<string, string> = {};

        // ส่ง accessToken ถ้ามี
        if (session?.accessToken) {
            headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        // ส่ง sessionToken ถ้ามี
        if (session?.sessionToken) {
            headers['x-session-token'] = session.sessionToken;
            headers['X-Session-Token'] = session.sessionToken;
        }

        return headers;
    }

    /**
     * ตรวจสอบและ refresh token ถ้าจำเป็น
     */
    private async ensureValidSession(session: Session | null): Promise<{ isValid: boolean; error?: string }> {
        // ตรวจสอบ session พื้นฐาน
        if (!session) {
            return { 
                isValid: false, 
                error: 'Session ไม่ถูกต้อง - ไม่มี session' 
            };
        }

        // ตรวจสอบว่ามี accessToken หรือ sessionToken อย่างน้อยหนึ่งตัว
        if (!session.accessToken && !session.sessionToken) {
            return { 
                isValid: false, 
                error: 'Session ไม่ถูกต้อง - ไม่มี access token หรือ session token' 
            };
        }

        // ถ้ามี sessionToken ให้ถือว่าถูกต้อง (ให้ backend ตรวจสอบ)
        if (session.sessionToken) {
            return { 
                isValid: true 
            };
        }

        // ถ้ามี accessToken ให้ตรวจสอบ format และ expiration
        if (session.accessToken) {
            try {
                const [, payload] = session.accessToken.split('.');
                if (!payload) {
                    return { 
                        isValid: false, 
                        error: 'Session ไม่ถูกต้อง - token format ไม่ถูกต้อง' 
                    };
                }

                const tokenData = JSON.parse(atob(payload));
                const currentTime = Date.now() / 1000;
                
                // ตรวจสอบว่า token หมดอายุแล้วหรือไม่
                if (tokenData.exp < currentTime) {
                    return { 
                        isValid: false, 
                        error: 'Session หมดอายุ - token หมดอายุแล้ว' 
                    };
                }

                // ไม่ตรวจสอบว่า token จะหมดอายุใน 5 นาทีหรือไม่ ให้ NextAuth จัดการเอง
                return { 
                    isValid: true 
                };
            } catch (error) {
                return { 
                    isValid: false, 
                    error: 'Session ไม่ถูกต้อง - ไม่สามารถตรวจสอบ token ได้' 
                };
            }
        }

        // ถ้ามีเฉพาะ sessionToken ให้ถือว่าถูกต้อง (ให้ backend ตรวจสอบ)
        return { 
            isValid: true 
        };
    }

    /**
     * Refresh token
     */
    private async refreshToken(session: Session | null): Promise<boolean> {
        if (!session?.refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refreshToken: session.refreshToken,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // อัปเดต session ใน NextAuth
                    // หมายเหตุ: ใน NextAuth v4 ต้องใช้ signIn() หรือ update() เพื่ออัปเดต session
                    // สำหรับตอนนี้เราจะ return true และให้ NextAuth จัดการเอง
                    return true;
                }
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
        }

        return false;
    }

    /**
     * ทำ HTTP request พร้อม error handling และ session validation
     */
    private async request<T>(
        endpoint: string,
        session: Session | null,
        options: globalThis.RequestInit = {}
    ): Promise<T> {
        // ตรวจสอบ session ก่อน
        const sessionValidation = await this.ensureValidSession(session);
        if (!sessionValidation.isValid) {
            throw new ApiError(
                sessionValidation.error || 'Session ไม่ถูกต้อง',
                401,
                { 
                    error: 'UNAUTHORIZED', 
                    message: sessionValidation.error 
                }
            );
        }

        const url = `${this.baseURL}${endpoint}`;

        const config: globalThis.RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(session),
                ...options.headers,
            },
            // เพิ่ม default timeout 60 วินาที ถ้าไม่ได้ระบุ signal
            signal: options.signal || AbortSignal.timeout(60000),
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // ตรวจสอบ 401 Unauthorized
                if (response.status === 401) {
                    // ลอง refresh token อีกครั้ง
                    if (session?.refreshToken && !this.isRefreshing) {
                        this.isRefreshing = true;
                        const refreshResult = await this.refreshToken(session);
                        this.isRefreshing = false;

                        if (refreshResult) {
                            // ลองเรียก API อีกครั้ง
                            const retryResponse = await fetch(url, config);
                            if (retryResponse.ok) {
                                const data = await retryResponse.json();
                                return data;
                            }
                        }
                    }

                    // ถ้า refresh ไม่สำเร็จ ให้ return error response แทนการ throw
                    return {
                        success: false,
                        message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                        error: 'UNAUTHORIZED'
                    } as T;
                }

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
            
            // จัดการ error ประเภทต่างๆ
            let errorMessage = 'Network error';
            if (error instanceof Error) {
                if (error.name === 'TimeoutError') {
                    errorMessage = 'การเชื่อมต่อใช้เวลานานเกินไป';
                } else if (error.message.includes('socket hang up') || error.message.includes('ECONNRESET')) {
                    errorMessage = 'การเชื่อมต่อถูกตัดขาด กรุณาลองใหม่อีกครั้ง';
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
                } else {
                    errorMessage = error.message;
                }
            }
            
            throw new ApiError(
                errorMessage,
                0,
                {}
            );
        }
    }

    /**
     * ทำ upload request สำหรับไฟล์
     */
    private async uploadRequest<T>(
        endpoint: string,
        formData: FormData,
        session: Session | null,
        options: globalThis.RequestInit = {}
    ): Promise<T> {
        // ตรวจสอบ session ก่อน
        const sessionValidation = await this.ensureValidSession(session);
        if (!sessionValidation.isValid) {
            throw new ApiError(
                sessionValidation.error || 'Session ไม่ถูกต้อง',
                401,
                { 
                    error: 'UNAUTHORIZED', 
                    message: sessionValidation.error 
                }
            );
        }

        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {};

        if (session?.accessToken) {
            headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        if (session?.sessionToken) {
            headers['x-session-token'] = session.sessionToken;
            headers['X-Session-Token'] = session.sessionToken;
        }

        const config: globalThis.RequestInit = {
            headers,
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
                
                // ตรวจสอบ 401 Unauthorized
                if (response.status === 401) {
                    // ลอง refresh token อีกครั้ง
                    if (session?.refreshToken && !this.isRefreshing) {
                        this.isRefreshing = true;
                        const refreshResult = await this.refreshToken(session);
                        this.isRefreshing = false;

                        if (refreshResult) {
                            // ลองเรียก API อีกครั้ง
                            const retryResponse = await fetch(url, {
                                ...config,
                                method: 'POST',
                                body: formData,
                            });
                            if (retryResponse.ok) {
                                const data = await retryResponse.json();
                                return data;
                            }
                        }
                    }

                    // ถ้า refresh ไม่สำเร็จ ให้ throw error แทนการ redirect
                    throw new ApiError(
                        'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                        401,
                        { 
                            error: 'UNAUTHORIZED', 
                            message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' 
                        }
                    );
                }

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
    // AUTHENTICATION METHODS
    // ========================================

    /**
     * ดึงข้อมูลผู้ใช้ปัจจุบัน
     */
    async getCurrentUser(session: Session | null): Promise<{ success: boolean; data?: User }> {
        try {
            const response = await this.request<{ success: boolean; data?: User }>(
                '/api/auth/me',
                session
            );
            return response;
        } catch {
            return { success: false };
        }
    }

    /**
     * ดึงข้อมูล Profile
     */
    async getProfile(session: Session | null): Promise<{ success: boolean; data?: unknown }> {
        try {
            const response = await this.request<{ success: boolean; data?: unknown }>(
                '/api/auth/profile',
                session
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
        session: Session | null,
        data: ProfileUpdateRequest
    ): Promise<{ success: boolean; message: string }> {
        const response = await this.request<{ success: boolean; message: string }>(
            '/api/auth/profile',
            session,
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
    async changePassword(
        session: Session | null,
        data: ChangePasswordRequest
    ): Promise<{ success: boolean; message: string }> {
        const response = await this.request<{ success: boolean; message: string }>(
            '/api/auth/change-password',
            session,
            {
                method: 'PUT',
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
    async getDBFFiles(session: Session | null): Promise<DBFFile[]> {
        return await this.request<DBFFile[]>('/api/dbf/files', session);
    }

    /**
     * ดึงไฟล์ DBF ตาม ID
     */
    async getDBFFile(session: Session | null, id: string): Promise<DBFFile> {
        return await this.request<DBFFile>(`/api/dbf/files/${id}`, session);
    }

    /**
     * อัปโหลดไฟล์ DBF
     */
    async uploadDBFFile(session: Session | null, file: File, schema?: any): Promise<DBFFile> {
        const formData = new FormData();
        formData.append('file', file);

        if (schema) {
            formData.append('schema', JSON.stringify(schema));
        }

        return await this.uploadRequest<DBFFile>('/api/dbf/files', formData, session);
    }

    /**
     * ลบไฟล์ DBF
     */
    async deleteDBFFile(session: Session | null, id: string): Promise<void> {
        await this.request(`/api/dbf/files/${id}`, session, {
            method: 'DELETE',
        });
    }

    /**
     * ดึงรายการการส่งออกทั้งหมด
     */
    async getDBFExports(session: Session | null): Promise<DBFExport[]> {
        return await this.request<DBFExport[]>('/api/dbf/exports', session);
    }

    /**
     * สร้างการส่งออกใหม่
     */
    async createDBFExport(session: Session | null, data: {
        fileId: string;
        filename: string;
        format: string;
    }): Promise<DBFExport> {
        return await this.request<DBFExport>('/api/dbf/exports', session, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * อัปเดตการส่งออก
     */
    async updateDBFExport(
        session: Session | null,
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
        return await this.request<DBFExport>(`/api/dbf/exports/${id}`, session, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // ========================================
    // REVENUE METHODS
    // ========================================

    /**
     * ดึงรายการ batches
     */
    async getRevenueBatches(session: Session | null, params?: {
        page?: number;
        limit?: number;
        status?: string;
        userId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ success: boolean; data?: { batches: UploadBatch[]; pagination: any } }> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.status) queryParams.append('status', params.status);
            if (params?.userId) queryParams.append('userId', params.userId);
            if (params?.startDate) queryParams.append('startDate', params.startDate);
            if (params?.endDate) queryParams.append('endDate', params.endDate);

            const endpoint = `/api/revenue/batches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            
            const response = await this.request<{ success: boolean; data?: { batches: UploadBatch[]; pagination: any }; error?: string }>(
                endpoint,
                session
            );
            
            // ตรวจสอบว่าเป็น error response หรือไม่
            if (!response.success && response.error === 'UNAUTHORIZED') {
                console.error('Session expired when getting revenue batches');
                return { 
                    success: false,
                    data: { 
                        batches: [], 
                        pagination: {} 
                    }
                };
            }
            
            return response;
        } catch (error) {
            console.error('Error getting revenue batches:', error);
            
            // ถ้าเป็น 401 error ให้ return success: false แทนการ throw
            if (error instanceof ApiError && error.status === 401) {
                return { 
                    success: false,
                    data: { 
                        batches: [], 
                        pagination: {} 
                    }
                };
            }
            
            return { 
                success: false,
                data: { 
                    batches: [], 
                    pagination: {} 
                }
            };
        }
    }

    /**
     * สร้าง batch ใหม่
     */
    async createRevenueBatch(session: Session | null, data: {
        batchName: string;
        userId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{ success: boolean; data?: UploadBatch }> {
        try {
            const response = await this.request<{ success: boolean; data?: UploadBatch }>(
                '/api/revenue/batches',
                session,
                {
                    method: 'POST',
                    body: JSON.stringify(data),
                }
            );
            return response;
        } catch (error) {
            console.error('Error creating revenue batch:', error);
            return { success: false };
        }
    }

    /**
     * ดึงข้อมูล batch เฉพาะ
     */
    async getRevenueBatch(session: Session | null, id: string): Promise<{ success: boolean; data?: UploadBatch }> {
        try {
            const response = await this.request<{ success: boolean; data?: UploadBatch }>(
                `/api/revenue/batches/${id}`,
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting revenue batch:', error);
            return { success: false };
        }
    }

    /**
     * ลบ batch
     */
    async deleteRevenueBatch(session: Session | null, id: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await this.request<{ success: boolean; message?: string }>(
                `/api/revenue/batches/${id}`,
                session,
                {
                    method: 'DELETE',
                }
            );
            return response;
        } catch (error) {
            console.error('Error deleting revenue batch:', error);
            return { success: false };
        }
    }

    /**
     * ลบไฟล์เดี่ยวในระบบรายได้
     */
    async deleteRevenueFile(session: Session | null, id: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await this.request<{ success: boolean; message?: string }>(
                `/api/revenue/files/${id}`,
                session,
                {
                    method: 'DELETE',
                }
            );
            return response;
        } catch (error) {
            console.error('Error deleting revenue file:', error);
            return { success: false };
        }
    }

    /**
     * ตรวจสอบสถานะไฟล์ตาม ID (polling)
     */
    async getRevenueFileStatus(session: Session | null, id: string): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await this.request<{ success: boolean; data?: any }>(
                `/api/revenue/files/${id}/status`,
                session,
                {
                    method: 'GET',
                    signal: AbortSignal.timeout(10000), // 10 วินาที สำหรับการดึงสถานะ
                }
            );
            return response;
        } catch (error: any) {
            console.error('Error getting revenue file status:', error);
            return {
                success: false,
                data: {
                    message: 'เกิดข้อผิดพลาดในการดึงสถานะไฟล์'
                }
            };
        }
    }

    /**
     * ตรวจสอบไฟล์รายได้ตาม ID (REST API)
     */
    async validateRevenueFileById(session: Session | null, id: string): Promise<{ success: boolean; data?: any }> {
        try {
            const sessionValidation = this.getAuthHeaders(session);
            
            if (!session?.accessToken && !session?.sessionToken) {
                throw new ApiError('Session ไม่ถูกต้อง', 401, {});
            }

            // เรียก REST API endpoint ธรรมดา
            const response = await fetch(`${this.baseURL}/api/revenue/files/${id}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...sessionValidation
                }
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
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('Error validating revenue file:', error);
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError('เกิดข้อผิดพลาดในการตรวจสอบไฟล์', 500, {});
        }
    }

    /**
     * Polling สถานะการ validation
     */
    private async pollValidationStatus(session: Session | null, id: string, onProgress?: (status: any) => void): Promise<{ success: boolean; data?: any }> {
        const maxAttempts = 60; // 60 ครั้ง = 5 นาที (polling ทุก 5 วินาที)
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const statusResponse = await this.getRevenueFileStatus(session, id);
                
                if (!statusResponse.success) {
                    throw new Error('ไม่สามารถดึงสถานะได้');
                }

                const status = statusResponse.data;
                
                // แจ้ง progress ให้ UI
                if (onProgress) {
                    onProgress(status);
                }

                // ตรวจสอบว่าเสร็จสิ้นแล้วหรือยัง
                if (status.status === 'success' || status.status === 'error') {
                    return {
                        success: status.status === 'success',
                        data: status
                    };
                }

                // รอ 5 วินาทีก่อน poll ครั้งต่อไป
                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;

            } catch (error: any) {
                console.error('Error polling validation status:', error);
                attempts++;
                
                // ถ้าลองครบแล้วยังไม่ได้
                if (attempts >= maxAttempts) {
                                    return {
                    success: false,
                    data: {
                        message: 'การตรวจสอบไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
                    }
                };
                }

                // รอ 5 วินาทีก่อนลองใหม่
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }

                        return {
                    success: false,
                    data: {
                        message: 'การตรวจสอบไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
                    }
                };
    }

    /**
     * ดึงไฟล์ใน batch
     */
    async getRevenueBatchFiles(session: Session | null, id: string, params?: {
        page?: number;
        limit?: number;
        status?: string;
        fileType?: string;
    }): Promise<{ success: boolean; data?: { batch: UploadBatch; files: UploadHistory[]; pagination: any } }> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.status) queryParams.append('status', params.status);
            if (params?.fileType) queryParams.append('fileType', params.fileType);

            const endpoint = `/api/revenue/batches/${id}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            
            const response = await this.request<{ success: boolean; data?: { batch: UploadBatch; files: UploadHistory[]; pagination: any } }>(
                endpoint,
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting revenue batch files:', error);
            return { success: false };
        }
    }

    /**
     * ประมวลผล batch
     */
    async processRevenueBatch(session: Session | null, id: string): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await this.request<{ success: boolean; data?: any }>(
                `/api/revenue/batches/${id}/process`,
                session,
                {
                    method: 'POST',
                }
            );
            return response;
        } catch (error) {
            console.error('Error processing revenue batch:', error);
            return { success: false };
        }
    }

    /**
     * อัปโหลดไฟล์เดี่ยว
     */
    async uploadRevenueFile(session: Session | null, file: File, batchId?: string): Promise<{ success: boolean; data?: FileUploadResult }> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (batchId) {
                formData.append('batchId', batchId);
            }

            const response = await this.uploadRequest<{ success: boolean; data?: FileUploadResult }>(
                '/api/revenue/upload',
                formData,
                session
            );

            return response;
        } catch (error) {
            console.error('Error uploading revenue file:', error);
            throw error;
        }
    }

    async uploadRevenueFileWithProgress(
        session: Session | null, 
        file: File, 
        batchId?: string,
        onProgress?: (progress: number) => void,
        checksum?: string
    ): Promise<{ success: boolean; data?: FileUploadResult }> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            if (batchId) {
                formData.append('batchId', batchId);
            }
            if (checksum) {
                formData.append('checksum', checksum);
            }

            // ติดตามความคืบหน้า (0 -> 100)
            if (onProgress) {
                try {
                    onProgress(0);
                } catch (_err) {
                    void 0;
                }
            }

            xhr.upload.addEventListener('progress', (event) => {
                if (!onProgress) return;
                if (event.lengthComputable) {
                    const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
                    try {
                        onProgress(progress);
                    } catch (_err) {
                        void 0;
                    }
                }
            });

            // จัดการ response
            xhr.addEventListener('load', () => {
                console.log('XHR Response Status:', xhr.status);
                console.log('XHR Response Text:', xhr.responseText);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Parsed response:', response);
                        if (onProgress) {
                            try { onProgress(100); } catch (_err) { void 0; }
                        }
                        resolve(response);
                    } catch (error) {
                        console.error('JSON parse error:', error);
                        reject(new Error(`Invalid JSON response: ${xhr.responseText}`));
                    }
                } else {
                    // พยายาม parse error response
                    let errorMessage = `Upload failed with status ${xhr.status}`;
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.message) {
                            errorMessage = errorResponse.message;
                        }
                        if (errorResponse.error) {
                            errorMessage += `: ${errorResponse.error}`;
                        }
                    } catch (parseError) {
                        // ถ้าไม่สามารถ parse ได้ ใช้ response text
                        if (xhr.responseText) {
                            errorMessage += `: ${xhr.responseText}`;
                        }
                    }
                    reject(new Error(errorMessage));
                }
            });

            // จัดการ error
            xhr.addEventListener('error', () => {
                console.error('XHR Network error');
                if (onProgress) {
                    try { onProgress(0); } catch (_err) { void 0; }
                }
                reject(new Error('Network error during upload'));
            });

            // จัดการ timeout
            xhr.addEventListener('timeout', () => {
                console.error('XHR Timeout');
                reject(new Error('Upload timeout'));
            });

            // ตั้งค่า headers
            const headers = this.getAuthHeaders(session);
            let uploadUrl = `${this.baseURL}/api/revenue/upload`;
            if (batchId) {
                uploadUrl += `?batchId=${encodeURIComponent(batchId)}`;
            }
            xhr.open('POST', uploadUrl);
            
            // เพิ่ม headers (ไม่รวม Content-Type เพราะ FormData จะจัดการเอง)
            Object.entries(headers).forEach(([key, value]) => {
                if (value && key !== 'Content-Type') {
                    xhr.setRequestHeader(key, value);
                }
            });

            // ตั้งค่า timeout
            xhr.timeout = 60000; // 60 seconds

            console.log('Sending upload request to:', uploadUrl);
            console.log('File size:', file.size);
            console.log('Headers:', headers);

            // ส่ง request
            xhr.send(formData);
        });
    }

    /**
     * อัปโหลดหลายไฟล์เป็น batch
     */
    async uploadRevenueBatch(session: Session | null, files: File[], batchName?: string): Promise<{ success: boolean; data?: BatchUploadResult }> {
        // ปิดการใช้งานการอัปโหลดแบบ batch ชั่วคราว เพื่อหลีกเลี่ยงการประมวลผลอัตโนมัติ
        // ด้านล่างคือโค้ดเดิมที่ถูกคอมเมนต์ไว้ชั่วคราว
        /*
        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));
            if (batchName) {
                formData.append('batchName', batchName);
            }

            const response = await this.uploadRequest<{ success: boolean; data?: BatchUploadResult }>(
                '/api/revenue/upload/batch',
                formData,
                session
            );
            return response;
        } catch (error) {
            console.error('Error uploading revenue batch:', error);
            return { success: false };
        }
        */

        return { success: false };
    }

    /**
     * ตรวจสอบไฟล์
     */
    async validateRevenueFile(session: Session | null, file: File): Promise<{ success: boolean; data?: any }> {
        // ปิดการใช้งานการตรวจสอบ/ประมวลผลไฟล์ชั่วคราว เหลือเฉพาะการอัปโหลด
        // ด้านล่างคือโค้ดเดิมที่ถูกคอมเมนต์ไว้ชั่วคราว
        /*
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await this.uploadRequest<{ success: boolean; data?: any }>(
                '/api/revenue/validate',
                formData,
                session
            );
            return response;
        } catch (error) {
            console.error('Error validating revenue file:', error);
            return { success: false };
        }
        */

        return { success: false };
    }

    /**
     * ดึงสถิติ
     */
    async getRevenueStatistics(session: Session | null): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await this.request<{ success: boolean; data?: any }>(
                '/api/revenue/statistics',
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting revenue statistics:', error);
            return { success: false };
        }
    }

    /**
     * ดึงประวัติ
     */
    async getRevenueHistory(session: Session | null, params?: {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
    }): Promise<{ success: boolean; data?: any }> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.type) queryParams.append('type', params.type);
            if (params?.status) queryParams.append('status', params.status);

            const endpoint = `/api/revenue/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            
            const response = await this.request<{ success: boolean; data?: any }>(
                endpoint,
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting revenue history:', error);
            return { success: false };
        }
    }

    // ========================================
    // DBF RECORDS METHODS
    // ========================================

    /**
     * ดึงข้อมูล DBF records จากฐานข้อมูล
     */
    async getDBFRecords(session: Session | null, fileId: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<{ success: boolean; data?: any }> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());

            const endpoint = `/api/revenue/files/${fileId}/dbf-records${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            
            const response = await this.request<{ success: boolean; data?: any }>(
                endpoint,
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting DBF records:', error);
            return { success: false };
        }
    }

    /**
     * ตรวจสอบสถานะการประมวลผล DBF
     */
    async getDBFStatus(session: Session | null, fileId: string): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await this.request<{ success: boolean; data?: any }>(
                `/api/revenue/files/${fileId}/dbf-status`,
                session
            );
            return response;
        } catch (error) {
            console.error('Error getting DBF status:', error);
            return { success: false };
        }
    }

    /**
     * ประมวลผลไฟล์ DBF ใหม่ (force reprocess)
     */
    async processDBFFile(session: Session | null, fileId: string): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await this.request<{ success: boolean; data?: any }>(
                `/api/revenue/files/${fileId}/process-dbf`,
                session,
                {
                    method: 'POST',
                }
            );
            return response;
        } catch (error) {
            console.error('Error processing DBF file:', error);
            return { success: false };
        }
    }

    // ========================================
    // SESSION MANAGEMENT METHODS
    // ========================================

    /**
     * ดึงรายการ active sessions
     */
    async getActiveSessions(session: Session | null): Promise<{
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
            }>('/api/auth/active-sessions', session);

            return response;
        } catch (error) {
            console.error('Error getting active sessions:', error);
            throw new ApiError('เกิดข้อผิดพลาดในการดึงรายการ session', 500, error);
        }
    }

    /**
     * ลบ session อื่นๆ
     */
    async revokeOtherSessions(session: Session | null): Promise<{
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
            }>('/api/auth/revoke-other-sessions', session, {
                method: 'POST',
            });

            return response;
        } catch (error) {
            console.error('Error revoking other sessions:', error);
            throw new ApiError('เกิดข้อผิดพลาดในการลบ session อื่นๆ', 500, error);
        }
    }
}

// ========================================
// API INSTANCE
// ========================================

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api; // Alias for backward compatibility 