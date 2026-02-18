'use client';

import type { UserDTO } from '@/types/user';

import React from 'react';
import {
  Avatar,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from '@heroui/react';

import { PencilIcon, TrashIcon, UserIcon } from '@/components/ui/icons';
import { TABLE_STYLES } from '@/lib/tableStyles';

const TABLE_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'avatar', label: '' },
  { key: 'name', label: 'ชื่อ' },
  { key: 'departmentSub', label: 'กลุ่มงาน' },
  { key: 'departmentSubSub', label: 'หน่วยงาน' },
  { key: 'phone', label: 'โทรศัพท์ภายใน' },
  { key: 'role', label: 'บทบาท' },
  { key: 'actions', label: 'การจัดการ' },
];

function getRoleColor(role: string): 'danger' | 'default' {
  return role === 'admin' ? 'danger' : 'default';
}

function getRoleLabel(role: string): string {
  return role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน';
}

interface UserTableProps {
  users: UserDTO[];
  isLoading?: boolean;
  onEdit: (user: UserDTO) => void;
  onDelete: (userId: string) => void;
  isDeleting?: string | null;
  currentUserId?: string;
}

export function UserTable({
  users,
  isLoading = false,
  onEdit,
  onDelete,
  isDeleting,
  currentUserId,
}: UserTableProps) {
  return (
    <Table
      removeWrapper
      aria-label="รายชื่อผู้ใช้"
      classNames={{
        wrapper: TABLE_STYLES.wrapper,
        th: TABLE_STYLES.th,
        td: TABLE_STYLES.td,
        tr: TABLE_STYLES.tr,
      }}
    >
      <TableHeader columns={TABLE_COLUMNS}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody
        emptyContent={isLoading ? TABLE_STYLES.loading.content : 'ยังไม่มีข้อมูลผู้ใช้'}
        isLoading={isLoading}
        items={users}
      >
        {(user) => {
          // ใช้ displayName ถ้าไม่มีให้ใช้ ldapDisplayName
          const displayName = user.displayName || user.ldapDisplayName || 'ไม่ระบุ';

          return (
            <TableRow key={user.id}>
              <TableCell>
                <Avatar
                  isBordered
                  className="w-10 h-10"
                  fallback={<UserIcon className="w-5 h-5 text-default-400" />}
                  radius="full"
                  size="sm"
                  src={user.image ?? undefined}
                />
              </TableCell>
              <TableCell>
                <span className="text-foreground font-medium">{displayName}</span>
              </TableCell>
              <TableCell>
                <span className="text-foreground">{user.departmentSubName || 'ไม่ระบุ'}</span>
              </TableCell>
              <TableCell>
                <span className="text-foreground">{user.departmentSubSubName || 'ไม่ระบุ'}</span>
              </TableCell>
              <TableCell>
                <span className="text-foreground">{user.phone || 'ไม่ระบุ'}</span>
              </TableCell>
              <TableCell>
                <Chip color={getRoleColor(user.role || 'user')} size="sm" variant="flat">
                  {getRoleLabel(user.role || 'user')}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Tooltip content="แก้ไข">
                    <Button
                      isIconOnly
                      aria-label="แก้ไขผู้ใช้"
                      color="primary"
                      isDisabled={isLoading}
                      size="sm"
                      variant="light"
                      onPress={() => onEdit(user)}
                    >
                      <PencilIcon aria-hidden className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={user.id === currentUserId ? 'ไม่สามารถลบตัวเองได้' : 'ลบผู้ใช้'}
                  >
                    <Button
                      isIconOnly
                      aria-label={user.id === currentUserId ? 'ไม่สามารถลบตัวเองได้' : 'ลบผู้ใช้'}
                      color="danger"
                      isDisabled={isLoading || isDeleting === user.id || user.id === currentUserId}
                      size="sm"
                      variant="light"
                      onPress={() => onDelete(user.id)}
                    >
                      <TrashIcon aria-hidden className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}
