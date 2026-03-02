'use client';

import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';
import type { PorterEmployee } from '@/types/porter';

import React from 'react';
import {
  Autocomplete,
  AutocompleteItem,
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

  const [employees, setEmployees] = React.useState<PorterEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(false);

  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoadingEmployees(true);
        const response = await fetch('/api/porter/employees?status=true');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          const activeEmployees = result.data.filter(
            (emp: PorterEmployee) => emp.status === true,
          );

          setEmployees(activeEmployees);
        } else {
          setEmployees([]);
        }
      } catch {
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    void loadEmployees();
  }, []);

  return (
    <Card className={cn(CARD_STYLES.default, 'mb-4')}>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-0">
            <Input
              isClearable
              aria-label="ค้นหารายการคำขอ"
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
              onValueChange={(value) => {
                onSearchChange(value);
                onPageReset();
              }}
            />
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
                onPageReset();
              }}
            >
              <SelectItem key="all">ทั้งหมด</SelectItem>
              <SelectItem key="ปกติ">ปกติ</SelectItem>
              <SelectItem key="ด่วน">ด่วน</SelectItem>
              <SelectItem key="ฉุกเฉิน">ฉุกเฉิน</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Autocomplete
              allowsCustomValue
              isClearable
              aria-label="ค้นหาชื่อเจ้าหน้าที่เปล"
              className="w-full min-w-0"
              inputValue={staffNameFilter}
              isDisabled={isLoadingEmployees || employees.length === 0}
              label="ชื่อเจ้าหน้าที่เปล"
              labelPlacement="outside"
              menuTrigger="input"
              placeholder={
                isLoadingEmployees
                  ? 'กำลังโหลดรายชื่อเจ้าหน้าที่...'
                  : employees.length > 0
                    ? 'ค้นหาชื่อเจ้าหน้าที่...'
                    : 'ไม่พบรายชื่อเจ้าหน้าที่'
              }
              size="md"
              variant="bordered"
              onClear={() => {
                onStaffNameChange('');
                onPageReset();
              }}
              onInputChange={(value) => {
                onStaffNameChange(value);
                onPageReset();
              }}
            >
              {employees.map((employee) => {
                const fullName = `${employee.firstName} ${employee.lastName}`;

                return (
                  <AutocompleteItem key={employee.id} textValue={fullName}>
                    {fullName}
                  </AutocompleteItem>
                );
              })}
            </Autocomplete>
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
                onPageReset();
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
