'use client';

import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  DateRangePicker,
} from '@heroui/react';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, XMarkIcon } from '@/components/ui/icons';

export interface JobListFiltersProps {
  searchQuery: string;
  urgencyFilter: string;
  dateRange: RangeValue<CalendarDate> | null;
  staffNameFilter: string;
  onSearchChange: (value: string) => void;
  onUrgencyChange: (value: string) => void;
  onDateRangeChange: (value: RangeValue<CalendarDate> | null) => void;
  onStaffNameChange: (value: string) => void;
  onClearFilters: () => void;
  onPageReset: () => void;
}

/**
 * บล็อก filter รายการคำขอ (ค้นหาชื่อผู้ป่วย/HN, ความเร่งด่วน, ช่วงวันที่, ชื่อเจ้าหน้าที่เปล)
 * ใช้ร่วมกับ useJobListData ที่ส่ง search/urgency ไป API และโหลดชุดใหญ่เมื่อมี date/staff เพื่อ filter จากข้อมูลทั้งหมด
 */
export function JobListFilters({
  searchQuery,
  urgencyFilter,
  dateRange,
  staffNameFilter,
  onSearchChange,
  onUrgencyChange,
  onDateRangeChange,
  onStaffNameChange,
  onClearFilters,
  onPageReset,
}: JobListFiltersProps) {
  const hasAnyFilter =
    !!searchQuery.trim() ||
    !!urgencyFilter ||
    !!(dateRange?.start && dateRange?.end) ||
    !!staffNameFilter.trim();

  return (
    <Card className={cn(CARD_STYLES.default, 'mb-4')}>
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <Input
              isClearable
              aria-label="ค้นหารายการคำขอ"
              className="flex-1 min-w-[200px]"
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
              onValueChange={(value) => {
                onSearchChange(value);
                onPageReset();
              }}
            />
            <Select
              aria-label="กรองตามความเร่งด่วน"
              className="w-full sm:w-48"
              label="ความเร่งด่วน"
              labelPlacement="outside"
              placeholder="ความเร่งด่วน"
              selectedKeys={urgencyFilter ? [urgencyFilter] : ['all']}
              size="md"
              variant="bordered"
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as string | undefined;

                onUrgencyChange(k && k !== 'all' ? k : '');
                onPageReset();
              }}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="ปกติ">ปกติ</SelectItem>
              <SelectItem key="ด่วน">ด่วน</SelectItem>
              <SelectItem key="ฉุกเฉิน">ฉุกเฉิน</SelectItem>
            </Select>
            <Input
              isClearable
              aria-label="ค้นหาชื่อเจ้าหน้าที่เปล"
              className="w-full sm:w-48"
              label="ชื่อเจ้าหน้าที่เปล"
              labelPlacement="outside"
              placeholder="ค้นหาชื่อเจ้าหน้าที่..."
              size="md"
              value={staffNameFilter}
              variant="bordered"
              onClear={() => {
                onStaffNameChange('');
                onPageReset();
              }}
              onValueChange={(value) => {
                onStaffNameChange(value);
                onPageReset();
              }}
            />
            <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
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
                  onPageReset();
                }}
              />
            </div>
            <Button
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
