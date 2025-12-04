/**
 * ========================================
 * USER MANAGEMENT UTILITIES
 * ========================================
 * Utility functions สำหรับจัดการ users
 */

import type {
  UserDTO,
  UserListResponse,
  UserListQueryParams,
  UserResponse,
  UserUpdatePayload,
  UserUpdateResponse,
} from "@/types/user";

/**
 * ดึงรายการ users พร้อม pagination, search, และ filter
 */
export async function getUserList(
  params?: UserListQueryParams,
): Promise<UserListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append("pageSize", params.pageSize.toString());
  }
  if (params?.search) {
    queryParams.append("search", params.search);
  }
  if (params?.role) {
    queryParams.append("role", params.role);
  }
  if (params?.departmentId) {
    queryParams.append("departmentId", params.departmentId.toString());
  }

  const url = `/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.message || "ไม่สามารถดึงรายการผู้ใช้ได้");
  }

  return response.json();
}

/**
 * ดึงข้อมูล user โดย ID
 */
export async function getUserById(userId: string): Promise<UserDTO> {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
  }

  const result: UserResponse = await response.json();

  return result.data;
}

/**
 * อัปเดตข้อมูล user
 */
export async function updateUser(
  userId: string,
  payload: UserUpdatePayload,
): Promise<UserDTO> {
  const response = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(
      error.message || error.error || "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้",
    );
  }

  const result: UserUpdateResponse = await response.json();

  return result.data;
}

/**
 * ลบ user
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.message || error.error || "ไม่สามารถลบผู้ใช้ได้");
  }

  await response.json();

  return;
}
