import { Session } from "next-auth";

import {
  ApiResponse,
  BatchesResponse,
  FileUploadResult,
  UploadBatch,
  UploadHistory,
} from "@/types/revenue";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ========================================
// API CLIENT
// ========================================

class ApiClient {
  private baseURL: string;
  private isRefreshing = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * ดึงรายการ batches
   */
  async getRevenueBatches(
    session: Session | null,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ApiResponse<BatchesResponse>> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.userId) queryParams.append("userId", params.userId);
      if (params?.startDate) queryParams.append("startDate", params.startDate);
      if (params?.endDate) queryParams.append("endDate", params.endDate);

      const res = await fetch(
        `/api/revenue/batches${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        {
          credentials: "include",
        },
      );
      const response = await res.json();

      // ตรวจสอบว่าเป็น error response หรือไม่
      if (!response.success && response.error === "UNAUTHORIZED") {
        return {
          success: false,
          data: {
            batches: [],
            pagination: {
              page: 0,
              limit: 0,
              totalPages: 0,
              totalItems: 0,
            },
          },
        };
      }

      return response;
    } catch (error) {
      // ถ้าเป็น 401 error ให้ return success: false แทนการ throw
      if (error instanceof ApiError && error.status === 401) {
        return {
          success: false,
          data: {
            batches: [],
            pagination: {
              page: 0,
              limit: 0,
              totalPages: 0,
              totalItems: 0,
            },
          },
        };
      }

      return {
        success: false,
        data: {
          batches: [],
          pagination: {
            page: 0,
            limit: 0,
            totalPages: 0,
            totalItems: 0,
          },
        },
      };
    }
  }

  /**
   * ลบ batch
   */
  async deleteRevenueBatch(
    session: Session | null,
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/revenue/batches/${id}`, {
        credentials: "include",
        method: "DELETE",
      });
      const response = await res.json();

      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * สร้าง batch ใหม่
   */
  async createRevenueBatch(
    session: Session | null,
    data: {
      batchName: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<ApiResponse<UploadBatch>> {
    try {
      const res = await fetch(`/api/revenue/batches`, {
        credentials: "include",
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        return { success: false };
      }

      const response = await res.json();

      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * Upload File in batch
   */
  async uploadRevenueFileWithProgress(
    session: Session | null,
    file: File,
    batchId?: string,
    onProgress?: (progress: number) => void,
    checksum?: string,
  ): Promise<ApiResponse<FileUploadResult>> {
    try {
      // เริ่มต้น progress
      if (onProgress) {
        try {
          onProgress(0);
        } catch {
          void 0;
        }
      }

      const formData = new FormData();

      formData.append("file", file);
      if (batchId) {
        formData.append("batchId", batchId);
      }
      if (checksum) {
        formData.append("checksum", checksum);
      }

      // สร้าง URL สำหรับ upload
      let uploadUrl = "/api/revenue/upload";

      if (batchId) {
        uploadUrl += `?batchId=${encodeURIComponent(batchId)}`;
      }

      // ใช้ fetch API แทน xhr
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // จำลอง progress ระหว่างการประมวลผล
      if (onProgress) {
        try {
          onProgress(50); // ครึ่งทาง
        } catch {
          void 0;
        }
      }

      if (!response.ok) {
        // จัดการ error response
        let errorMessage = `Upload failed with status ${response.status}`;

        try {
          const errorResponse = await response.json();

          if (errorResponse.message) {
            errorMessage = errorResponse.message;
          }
          if (errorResponse.error) {
            errorMessage += `: ${errorResponse.error}`;
          }
        } catch {
          // ถ้าไม่สามารถ parse ได้ ใช้ response text
          const responseText = await response.text();

          if (responseText) {
            errorMessage += `: ${responseText}`;
          }
        }

        if (onProgress) {
          try {
            onProgress(0);
          } catch {
            void 0;
          }
        }

        throw new Error(errorMessage);
      }

      // ประมวลผล response ที่สำเร็จ
      const result = await response.json();

      if (onProgress) {
        try {
          onProgress(100);
        } catch {
          void 0;
        }
      }

      return result;
    } catch (error) {
      // จัดการ error ต่างๆ
      if (onProgress) {
        try {
          onProgress(0);
        } catch {
          void 0;
        }
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Upload timeout");
        }
        throw error;
      }

      throw new Error("Network error during upload");
    }
  }

  /**
   * ดึงไฟล์ใน batch
   */
  async getRevenueBatchFiles(
    session: Session | null,
    id: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      fileType?: string;
    },
  ): Promise<{
    success: boolean;
    data?: { batch: UploadBatch; files: UploadHistory[]; pagination: any };
  }> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.fileType) queryParams.append("fileType", params.fileType);

      const endpoint = `/api/revenue/batches/${id}/files${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      // const response = await this.request<{ success: boolean; data?: { batch: UploadBatch; files: UploadHistory[]; pagination: any } }>(
      //     endpoint,
      //     session
      // );
      // return response;
      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        return { success: false };
      }

      const response = (await res.json()) as {
        success: boolean;
        data?: { batch: UploadBatch; files: UploadHistory[]; pagination: any };
      };

      return response;
    } catch {
      return { success: false };
    }
  }

  /**
   * ตรวจสอบไฟล์รายได้ตาม ID (REST API)
   */
  async validateRevenueFileById(
    session: Session | null,
    id: string,
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/revenue/batches/${id}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData,
        );
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
      // return { success: false };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("เกิดข้อผิดพลาดในการตรวจสอบไฟล์", 500, {});
    }
  }

  /**
   * ประมวลผล batch สำหรับ IPD
   */
  async processRevenueBatchIPD(
    session: Session | null,
    id: string,
  ): Promise<{ success: boolean; data?: any }> {
    try {
      const res = await fetch(`/api/revenue/batches/${id}/process-ipd`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        return { success: false, data: errorData };
      }

      const data = await res.json().catch(() => ({}));

      return { success: true, data };
    } catch {
      return { success: false };
    }
  }

  /**
   * ประมวลผล batch สำหรับ OPD
   */
  async processRevenueBatchOPD(
    session: Session | null,
    id: string,
  ): Promise<{ success: boolean; data?: any }> {
    try {
      const res = await fetch(`/api/revenue/batches/${id}/process-opd`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        return { success: false, data: errorData };
      }

      const data = await res.json().catch(() => ({}));

      return { success: true, data };
    } catch {
      return { success: false };
    }
  }

  /**
   * ส่งออกไฟล์จาก batch
   */
  async exportRevenueBatch(
    session: Session | null,
    batchId: string,
    exportType: "opd" | "ipd" = "opd",
  ): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const response = await fetch(`/api/revenue/batches/${batchId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
          "x-session-token": session?.sessionToken || "",
        },
        body: JSON.stringify({ exportType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        return {
          success: false,
          error:
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // ดึงไฟล์ ZIP เป็น Blob
      const blob = await response.blob();

      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api; // Alias for backward compatibility
