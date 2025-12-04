/**
 * ========================================
 * USER MANAGEMENT TYPES
 * ========================================
 * Types สำหรับระบบจัดการผู้ใช้ (User Management)
 */

import type { ProfileDTO } from "@/lib/profile";

/**
 * User DTO - ข้อมูล user ที่ใช้ในระบบ
 */
export type UserDTO = ProfileDTO & {
  departmentSubName?: string | null;
  departmentSubSubName?: string | null;
};

/**
 * Response สำหรับ GET /api/users (รายการ users)
 */
export interface UserListResponse {
  success: boolean;
  data: UserDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Payload สำหรับ PUT /api/users/[id] (อัปเดต user)
 */
export interface UserUpdatePayload {
  displayName?: string;
  phone?: string;
  mobile?: string;
  role?: "admin" | "user";
  personTypeId?: number | null;
  positionId?: number | null;
  departmentId?: number | null;
  departmentSubId?: number | null;
  departmentSubSubId?: number | null;
}

/**
 * Response สำหรับ GET /api/users/[id]
 */
export interface UserResponse {
  success: boolean;
  data: UserDTO;
}

/**
 * Response สำหรับ PUT /api/users/[id]
 */
export interface UserUpdateResponse {
  success: boolean;
  data: UserDTO;
}

/**
 * Response สำหรับ DELETE /api/users/[id]
 */
export interface UserDeleteResponse {
  success: boolean;
  message: string;
}

/**
 * Query parameters สำหรับ GET /api/users
 */
export interface UserListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: "admin" | "user";
  departmentId?: number;
}
