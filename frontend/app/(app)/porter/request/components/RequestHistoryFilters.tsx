import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  DateRangePicker,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';

import { MagnifyingGlassIcon, XMarkIcon } from '@/components/ui/icons';
import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';

export interface RequestHistoryFiltersProps {
  searchQuery: string;
  statusFilter: string | null;
  urgencyFilter: string;
  dateRange: RangeValue<CalendarDate> | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onUrgencyChange: (value: string) => void;
  onDateRangeChange: (value: RangeValue<CalendarDate> | null) => void;
  onClearFilters: () => void;
}

export function RequestHistoryFilters({
  searchQuery,
  statusFilter,
  urgencyFilter,
  dateRange,
  onSearchChange,
  onStatusChange,
  onUrgencyChange,
  onDateRangeChange,
  onClearFilters,
}: RequestHistoryFiltersProps) {
  const hasAnyFilter =
    !!searchQuery.trim() ||
    !!statusFilter ||
    !!urgencyFilter ||
    !!(dateRange?.start && dateRange?.end);

  return (
    <Card className={cn(CARD_STYLES.default, 'mb-4')}>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-0">
            <Input
              isClearable
              aria-label="ค้นหาประวัติคำขอ"
              className="w-full min-w-0"
              label="ค้นหา"
              labelPlacement="outside"
              placeholder="ค้นหาด้วยชื่อผู้ป่วย หรือ HN..."
              size="md"
              startContent={
                <MagnifyingGlassIcon className="w-5 h-5 text-default-400" />
              }
              value={searchQuery}
              variant="bordered"
              onClear={() => onSearchChange('')}
              onValueChange={onSearchChange}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Select
              aria-label="กรองตามสถานะ"
              className="w-full min-w-0"
              label="สถานะ"
              labelPlacement="outside"
              placeholder="สถานะ"
              selectedKeys={statusFilter ? [statusFilter] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as string | undefined;

                onStatusChange(k && k !== 'all' ? k : null);
              }}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="WAITING_CENTER">รอศูนย์รับ</SelectItem>
              <SelectItem key="WAITING_ACCEPT">รอผู้ปฏิบัติรับงาน</SelectItem>
              <SelectItem key="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
              <SelectItem key="COMPLETED">เสร็จสิ้น</SelectItem>
              <SelectItem key="CANCELLED">ยกเลิก</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Select
              aria-label="กรองตามความเร่งด่วน"
              className="w-full min-w-0"
              label="ความเร่งด่วน"
              labelPlacement="outside"
              placeholder="ความเร่งด่วน"
              selectedKeys={urgencyFilter ? [urgencyFilter] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as string | undefined;

                onUrgencyChange(k && k !== 'all' ? k : '');
              }}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="ปกติ">ปกติ</SelectItem>
              <SelectItem key="ด่วน">ด่วน</SelectItem>
              <SelectItem key="ฉุกเฉิน">ฉุกเฉิน</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0 md:col-span-2 2xl:col-span-1">
            <DateRangePicker
              aria-label="ช่วงวันที่"
              className="w-full"
              label="ช่วงวันที่"
              labelPlacement="outside"
              size="md"
              value={dateRange}
              variant="bordered"
              onChange={(range) => {
                onDateRangeChange(range ?? null);
              }}
            />
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

