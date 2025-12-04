"use client";

import type { UserDTO } from "@/types/user";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardBody,
  CardHeader,
  useDisclosure,
  Input,
  Select,
  SelectItem,
  Pagination,
  addToast,
} from "@heroui/react";

import { UserTable } from "./components/UserTable";
import { UserModal } from "./components/UserModal";
import { useUsers } from "./hooks/useUsers";

import { UserIcon, MagnifyingGlassIcon } from "@/components/ui/icons";

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
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
        title: "เกิดข้อผิดพลาด",
        description: message,
        color: "danger",
      });
    },
    onSuccess: (message) => {
      addToast({
        title: "สำเร็จ",
        description: message,
        color: "success",
      });
    },
  });

  const {
    isOpen: isUserModalOpen,
    onOpen: onUserModalOpen,
    onClose: onUserModalClose,
  } = useDisclosure();

  // โหลดข้อมูลเมื่อ component mount หรือ filter เปลี่ยน
  useEffect(() => {
    loadUsers({
      page: 1,
      pageSize: 10,
      search: searchQuery || undefined,
      role: roleFilter ? (roleFilter as "admin" | "user") : undefined,
    });
  }, [searchQuery, roleFilter]);

  // Reload เมื่อ page หรือ pageSize เปลี่ยน
  useEffect(() => {
    loadUsers({
      page,
      pageSize,
      search: searchQuery || undefined,
      role: roleFilter ? (roleFilter as "admin" | "user") : undefined,
    });
  }, [page, pageSize]);

  const handleEditUser = (user: UserDTO) => {
    setEditingUser(user);
    onUserModalOpen();
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);

    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user?.displayName || user?.email || userId}"?`,
      )
    ) {
      return;
    }

    setIsDeleting(userId);
    try {
      const success = await removeUser(userId);

      if (success) {
        // Reload users list
        await loadUsers({
          page,
          pageSize,
          search: searchQuery || undefined,
          role: roleFilter ? (roleFilter as "admin" | "user") : undefined,
        });
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveUser = async (
    userId: string,
    payload: Parameters<typeof updateUserData>[1],
  ) => {
    const success = await updateUserData(userId, payload);

    if (success) {
      // Reload users list
      await loadUsers({
        page,
        pageSize,
        search: searchQuery || undefined,
        role: roleFilter ? (roleFilter as "admin" | "user") : undefined,
      });
    }

    return success;
  };

  const handleModalClose = () => {
    setEditingUser(null);
    onUserModalClose();
  };

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
      <Card className="shadow-lg border border-default-200">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              isClearable
              className="flex-1"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              startContent={
                <MagnifyingGlassIcon className="w-5 h-5 text-default-400" />
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
            <Select
              className="w-full md:w-48"
              placeholder="เลือกบทบาท"
              selectedKeys={roleFilter ? [roleFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                setRoleFilter(selected || "");
              }}
            >
              <SelectItem key="admin">ผู้ดูแลระบบ</SelectItem>
              <SelectItem key="user">ผู้ใช้งาน</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายชื่อผู้ใช้
              </h2>
            </div>
            <div className="text-sm text-default-600">
              ทั้งหมด {total} รายการ
            </div>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-default-600">
                แสดง {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, total)} จาก {total} รายการ
              </div>
              <Pagination
                showControls
                color="primary"
                page={page}
                size="sm"
                total={totalPages}
                onChange={setPage}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-default-600">แสดงต่อหน้า:</span>
                <Select
                  className="w-24"
                  selectedKeys={[pageSize.toString()]}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;

                    setPageSize(Number.parseInt(selected, 10));
                    setPage(1);
                  }}
                >
                  <SelectItem key="10">10</SelectItem>
                  <SelectItem key="20">20</SelectItem>
                  <SelectItem key="50">50</SelectItem>
                </Select>
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
