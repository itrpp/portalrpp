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
  addToast,
} from '@heroui/react';

import {
  JOB_LIST_MAX_RANGE_DAYS,
  clampJobListDateRange,
} from '../dateRange';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, XMarkIcon } from '@/components/ui/icons';

export interface JobListFiltersProps {
  searchQuery: string;
  urgencyFilter: string;
  dateRange: RangeValue<CalendarDate> | null;
  staffNameFilter: string;
  assignedToId: string | null;
  onSearchChange: (value: string) => void;
  onUrgencyChange: (value: string) => void;
  onDateRangeChange: (value: RangeValue<CalendarDate> | null) => void;
  onStaffNameChange: (value: string) => void;
  onAssignedToIdChange: (value: string | null) => void;
  onClearFilters: () => void;
  onPageReset: () => void;
}

/**
 * บล็อก filter รายการคำขอ — ช่วงวันที่บังคับ (default 7 วัน, สูงสุด 90 วัน)
 * search/urgency/staff/date ส่งไป API ทั้งหมด
 */
export function JobListFilters({
  searchQuery,
  urgencyFilter,
  dateRange,
  staffNameFilter,
  assignedToId,
  onSearchChange,
  onUrgencyChange,
  onDateRangeChange,
  onStaffNameChange,
  onAssignedToIdChange,
  onClearFilters,
  onPageReset,
}: JobListFiltersProps) {
  const hasClearableFilter =
    !!searchQuery.trim() ||
    !!urgencyFilter ||
    !!assignedToId ||
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
              selectedKey={assignedToId}
              size="md"
              variant="bordered"
              onClear={() => {
                onStaffNameChange('');
                onAssignedToIdChange(null);
                onPageReset();
              }}
              onInputChange={(value) => {
                onStaffNameChange(value);
              }}
              onSelectionChange={(key) => {
                if (key == null) {
                  onAssignedToIdChange(null);
                  onPageReset();

                  return;
                }
                const id = String(key);
                const employee = employees.find((emp) => emp.id === id);

                onAssignedToIdChange(id);
                if (employee) {
                  onStaffNameChange(`${employee.firstName} ${employee.lastName}`);
                }
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
              aria-label="ช่วงวันที่ (สูงสุด 90 วัน)"
              className="w-full"
              description={`จำกัดชุดข้อมูลที่โหลด (สูงสุด ${JOB_LIST_MAX_RANGE_DAYS} วัน)`}
              label="ช่วงวันที่"
              labelPlacement="outside"
              size="md"
              value={dateRange}
              variant="bordered"
              onChange={(range) => {
                if (!range?.start || !range?.end) {
                  return;
                }

                const clamped = clampJobListDateRange(range);
                if (
                  clamped &&
                  range.start.compare(clamped.start) !== 0
                ) {
                  addToast({
                    title: 'จำกัดช่วงวันที่',
                    description: `เลือกได้สูงสุด ${JOB_LIST_MAX_RANGE_DAYS} วัน — ปรับวันเริ่มให้อัตโนมัติ`,
                    color: 'warning',
                  });
                }
                onDateRangeChange(clamped);
                onPageReset();
              }}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Button
              className="w-full"
              color="default"
              isDisabled={!hasClearableFilter}
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
