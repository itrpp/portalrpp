import type { UserDTO, UserListQueryParams, UserUpdatePayload } from '@/types/user';

import { useState, useCallback, useRef, useEffect } from 'react';

import { getUserList, getUserById, updateUser, deleteUser } from '@/lib/users';

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

  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * โหลดรายการ users (identity เสถียรเพื่อลด re-run ของ effect ที่เรียกใช้)
   */
  const loadUsers = useCallback(async (params?: UserListQueryParams) => {
    setIsLoading(true);
    try {
      const response = await getUserList({
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        search: params?.search,
        role: params?.role,
        departmentId: params?.departmentId,
      });

      setUsers(response.data);
      setTotal(response.total);
      setPage(response.page);
      setPageSize(response.pageSize);
      setTotalPages(response.totalPages || Math.ceil(response.total / response.pageSize));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดรายการผู้ใช้ได้';

      optionsRef.current.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ดึงข้อมูล user โดย ID
   */
  const loadUserById = useCallback(async (userId: string): Promise<UserDTO | null> => {
    try {
      const user = await getUserById(userId);

      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';

      optionsRef.current.onError?.(message);

      return null;
    }
  }, []);

  /**
   * อัปเดตข้อมูล user
   */
  const updateUserData = useCallback(async (userId: string, payload: UserUpdatePayload): Promise<boolean> => {
    try {
      const updatedUser = await updateUser(userId, payload);

      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? updatedUser : user)));

      optionsRef.current.onSuccess?.('อัปเดตข้อมูลผู้ใช้สำเร็จ');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้';

      optionsRef.current.onError?.(message);

      return false;
    }
  }, []);

  /**
   * ลบ user
   */
  const removeUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      await deleteUser(userId);

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      setTotal((prevTotal) => prevTotal - 1);

      optionsRef.current.onSuccess?.('ลบผู้ใช้สำเร็จ');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถลบผู้ใช้ได้';

      optionsRef.current.onError?.(message);

      return false;
    }
  }, []);

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
