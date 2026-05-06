import React from 'react';
import { Button, Card, CardBody, Input, Select, SelectItem } from '@heroui/react';

import { MagnifyingGlassIcon, XMarkIcon } from '@/components/ui/icons';
import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';

export interface UserFiltersProps {
  searchQuery: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (
    keys: Parameters<NonNullable<React.ComponentProps<typeof Select>['onSelectionChange']>>[0],
  ) => void;
  onClearFilters: () => void;
}

export function UserFilters({
  searchQuery,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onClearFilters,
}: UserFiltersProps) {
  const hasAnyFilter = !!searchQuery.trim() || !!roleFilter;

  return (
    <Card className={cn(CARD_STYLES.default, 'mb-4')}>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-0 md:col-span-1 2xl:col-span-3">
            <Input
              isClearable
              aria-label="ค้นหาผู้ใช้"
              className="w-full min-w-0"
              label="ค้นหา"
              labelPlacement="outside"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              size="md"
              startContent={<MagnifyingGlassIcon className="w-5 h-5 text-default-400" />}
              value={searchQuery}
              variant="bordered"
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange('')}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0 md:col-span-1">
            <Select
              aria-label="กรองตามบทบาท"
              className="w-full min-w-0"
              label="บทบาท"
              labelPlacement="outside"
              placeholder="ทั้งหมด"
              selectedKeys={roleFilter ? [roleFilter] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={onRoleFilterChange}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="admin">ผู้ดูแลระบบ</SelectItem>
              <SelectItem key="user">ผู้ใช้งาน</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0 md:col-span-1">
            <Button
              className="w-full"
              color="default"
              isDisabled={!hasAnyFilter}
              size="md"
              variant="flat"
              onPress={onClearFilters}
            >
              <XMarkIcon className="w-5 h-5" />
              ล้างตัวกรอง
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

