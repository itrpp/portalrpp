import type {
  UserDTO,
  UserListQueryParams,
  UserUpdatePayload,
} from "@/types/user";

import { useState, useCallback } from "react";

import { getUserList, getUserById, updateUser, deleteUser } from "@/lib/users";

interface UseUsersOptions {
  onError?: (errorMessage: string) => void;
  onSuccess?: (message: string) => void;
}

export function useUsers(options: UseUsersOptions = {}) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  /**
   * โหลดรายการ users
   */
  const loadUsers = useCallback(
    async (params?: UserListQueryParams) => {
      setIsLoading(true);
      try {
        const response = await getUserList({
          page: params?.page || page,
          pageSize: params?.pageSize || pageSize,
          search: params?.search,
          role: params?.role,
          departmentId: params?.departmentId,
        });

        setUsers(response.data);
        setTotal(response.total);
        setPage(response.page);
        setPageSize(response.pageSize);
        setTotalPages(
          response.totalPages || Math.ceil(response.total / response.pageSize),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดรายการผู้ใช้ได้";

        options.onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, options],
  );

  /**
   * ดึงข้อมูล user โดย ID
   */
  const loadUserById = useCallback(
    async (userId: string): Promise<UserDTO | null> => {
      try {
        const user = await getUserById(userId);

        return user;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "ไม่สามารถดึงข้อมูลผู้ใช้ได้";

        options.onError?.(message);

        return null;
      }
    },
    [options],
  );

  /**
   * อัปเดตข้อมูล user
   */
  const updateUserData = useCallback(
    async (userId: string, payload: UserUpdatePayload): Promise<boolean> => {
      try {
        const updatedUser = await updateUser(userId, payload);

        // อัปเดต user ใน list
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === userId ? updatedUser : user)),
        );

        options.onSuccess?.("อัปเดตข้อมูลผู้ใช้สำเร็จ");

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้";

        options.onError?.(message);

        return false;
      }
    },
    [options],
  );

  /**
   * ลบ user
   */
  const removeUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        await deleteUser(userId);

        // ลบ user ออกจาก list
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
        setTotal((prevTotal) => prevTotal - 1);

        options.onSuccess?.("ลบผู้ใช้สำเร็จ");

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถลบผู้ใช้ได้";

        options.onError?.(message);

        return false;
      }
    },
    [options],
  );

  return {
    users,
    isLoading,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    loadUsers,
    loadUserById,
    updateUserData,
    removeUser,
  };
}
