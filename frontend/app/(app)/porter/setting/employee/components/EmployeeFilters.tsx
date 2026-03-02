import React from 'react';
import { Button, Card, CardBody, Input, Select, SelectItem } from '@heroui/react';

import { MagnifyingGlassIcon, XMarkIcon } from '@/components/ui/icons';
import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';

interface EmploymentTypeOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  name: string;
}

export interface EmployeeFiltersProps {
  searchQuery: string;
  filterEmploymentTypeId: string;
  filterPositionId: string;
  filterStatus: string;
  employmentTypes: EmploymentTypeOption[];
  positions: PositionOption[];
  onSearchChange: (value: string) => void;
  onEmploymentTypeChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export function EmployeeFilters({
  searchQuery,
  filterEmploymentTypeId,
  filterPositionId,
  filterStatus,
  employmentTypes,
  positions,
  onSearchChange,
  onEmploymentTypeChange,
  onPositionChange,
  onStatusChange,
  onClearFilters,
}: EmployeeFiltersProps) {
  const hasAnyFilter =
    !!searchQuery.trim() ||
    !!filterEmploymentTypeId ||
    !!filterPositionId ||
    !!filterStatus;

  return (
    <Card className={cn(CARD_STYLES.default, 'mb-4')}>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-0 md:col-span-2 2xl:col-span-1">
            <Input
              isClearable
              aria-label="ค้นหาเจ้าหน้าที่"
              className="w-full min-w-0"
              label="ค้นหา"
              labelPlacement="outside"
              placeholder="ค้นหาด้วยชื่อ นามสกุล ชื่อเล่น หรือเลขบัตรประชาชน..."
              size="md"
              startContent={<MagnifyingGlassIcon className="w-5 h-5 text-default-400" />}
              value={searchQuery}
              variant="bordered"
              onClear={() => onSearchChange('')}
              onValueChange={onSearchChange}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Select
              aria-label="กรองตามประเภทการจ้าง"
              className="w-full min-w-0"
              label="ประเภทการจ้าง"
              labelPlacement="outside"
              placeholder="ทั้งหมด"
              selectedKeys={filterEmploymentTypeId ? [filterEmploymentTypeId] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                onEmploymentTypeChange(selected && selected !== 'all' ? selected : '');
              }}
            >
              <>
                <SelectItem key="all">ทั้งหมด</SelectItem>
                {employmentTypes.map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Select
              aria-label="กรองตามตำแหน่ง"
              className="w-full min-w-0"
              label="ตำแหน่ง"
              labelPlacement="outside"
              placeholder="ทั้งหมด"
              selectedKeys={filterPositionId ? [filterPositionId] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                onPositionChange(selected && selected !== 'all' ? selected : '');
              }}
            >
              <>
                <SelectItem key="all">ทั้งหมด</SelectItem>
                {positions.map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Select
              aria-label="กรองตามสถานะ"
              className="w-full min-w-0"
              label="สถานะ"
              labelPlacement="outside"
              placeholder="ทั้งหมด"
              selectedKeys={filterStatus ? [filterStatus] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                onStatusChange(selected && selected !== 'all' ? selected : '');
              }}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="active">ใช้งาน</SelectItem>
              <SelectItem key="inactive">ไม่ใช้งาน</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
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

