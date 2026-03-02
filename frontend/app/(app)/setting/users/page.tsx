'use client';

import type { UserDTO } from '@/types/user';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { Card, CardBody, CardHeader, useDisclosure, Pagination, addToast } from '@heroui/react';

import { UserTable } from './components/UserTable';
import { UserFilters } from './components/UserFilters';
import { useUsers } from './hooks/useUsers';

import { CARD_STYLES } from '@/lib/cardStyles';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { UserIcon } from '@/components/ui/icons';

const UserModal = dynamic(() => import('./components/UserModal').then((m) => ({ default: m.UserModal })), {
  ssr: false,
});

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const {
    users,
    isLoading,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    loadUsers,
    updateUserData,
    removeUser,
  } = useUsers({
    onError: (message) => {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: message,
        color: 'danger',
      });
    },
    onSuccess: (message) => {
      addToast({
        title: 'สำเร็จ',
        description: message,
        color: 'success',
      });
    },
  });

  const {
    isOpen: isUserModalOpen,
    onOpen: onUserModalOpen,
    onClose: onUserModalClose,
  } = useDisclosure();

  // โหลดรายการผู้ใช้ครั้งเดียวเมื่อ mount หรือเมื่อ page/pageSize/search/role เปลี่ยน (ลด waterfall)
  useEffect(() => {
    loadUsers({
      page,
      pageSize,
      search: searchQuery || undefined,
      role: roleFilter ? (roleFilter as 'admin' | 'user') : undefined,
    });
  }, [page, pageSize, searchQuery, roleFilter, loadUsers]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, [setPage]);

  const handleRoleFilterChange = useCallback(
    (
      keys: Parameters<
        NonNullable<
          React.ComponentProps<typeof UserFilters>['onRoleFilterChange']
        >
      >[0],
    ) => {
      const selected = Array.from(keys as Set<string>)[0] as string;

      setRoleFilter(selected && selected !== 'all' ? selected : '');
      setPage(1);
    },
    [setPage],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('');
    setPage(1);
  }, [setPage]);

  const handleEditUser = useCallback(
    (user: UserDTO) => {
      setEditingUser(user);
      onUserModalOpen();
    },
    [onUserModalOpen],
  );

  const getLoadParams = useCallback(
    () => ({
      page,
      pageSize,
      search: searchQuery || undefined,
      role: roleFilter ? (roleFilter as 'admin' | 'user') : undefined,
    }),
    [page, pageSize, searchQuery, roleFilter],
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);

      if (
        !confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user?.displayName || user?.email || userId}"?`)
      ) {
        return;
      }

      setIsDeleting(userId);
      try {
        const success = await removeUser(userId);

        if (success) {
          await loadUsers(getLoadParams());
        }
      } finally {
        setIsDeleting(null);
      }
    },
    [users, removeUser, loadUsers, getLoadParams],
  );

  const handleSaveUser = useCallback(
    async (userId: string, payload: Parameters<typeof updateUserData>[1]) => {
      const success = await updateUserData(userId, payload);

      if (success) {
        await loadUsers(getLoadParams());
      }

      return success;
    },
    [updateUserData, loadUsers, getLoadParams],
  );

  const handleModalClose = useCallback(() => {
    setEditingUser(null);
    onUserModalClose();
  }, [onUserModalClose]);

  const currentUserId = session?.user?.id;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-primary" />
            จัดการผู้ใช้
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลผู้ใช้ในระบบ รวมถึงการกำหนดบทบาทและแก้ไขข้อมูล
          </p>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        roleFilter={roleFilter}
        searchQuery={searchQuery}
        onClearFilters={handleClearFilters}
        onRoleFilterChange={handleRoleFilterChange}
        onSearchChange={handleSearchChange}
      />

      {/* Table */}
      <Card className={CARD_STYLES.default}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">รายชื่อผู้ใช้</h2>
            </div>
            <span className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}>
              ทั้งหมด {total} รายการ
            </span>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          <UserTable
            currentUserId={currentUserId}
            isDeleting={isDeleting}
            isLoading={isLoading}
            users={users}
            onDelete={handleDeleteUser}
            onEdit={handleEditUser}
          />

          {/* Pagination */}
          {total > 0 && (
            <div className={TABLE_STYLES.pagination.containerClass}>
              <div className={TABLE_STYLES.pagination.textClass}>
                แสดง {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} จาก {total}{' '}
                รายการ
              </div>
              <Pagination
                showControls
                color="primary"
                initialPage={1}
                page={page}
                size="sm"
                total={totalPages}
                onChange={setPage}
              />
              <div className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}>
                <div className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}>
                  <label
                    className={TABLE_STYLES.pagination.labelClass}
                    htmlFor="rows-per-page-users"
                  >
                    แสดงต่อหน้า:
                  </label>
                  <select
                    className={TABLE_STYLES.pagination.selectClass}
                    id="rows-per-page-users"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* User Modal */}
      {editingUser && (
        <UserModal
          isCurrentUser={editingUser.id === currentUserId}
          isLoading={isLoading}
          isOpen={isUserModalOpen}
          user={editingUser}
          onClose={handleModalClose}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
