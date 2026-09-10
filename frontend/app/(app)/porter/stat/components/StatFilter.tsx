'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  DateRangePicker,
  Button,
  Select,
  SelectItem,
  CardHeader,
  addToast,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

import {
  STAT_MAX_RANGE_DAYS,
  getDefaultStatFilterState,
  resolveStatDateBounds,
} from '../dateBounds';

import { toBuddhistEra } from '@/lib/utils';

export type FilterMode = 'date-range' | 'month' | 'fiscal-year';

export interface FilterState {
  mode: FilterMode;
  dateRange?: RangeValue<CalendarDate>;
  month?: number;
  year?: number;
  fiscalYear?: number;
}

interface StatFilterProps {
  onFilterChange: (filter: FilterState) => void;
}

const MONTHS = [
  { value: 1, label: 'มกราคม' },
  { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' },
  { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' },
  { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' },
  { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' },
  { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' },
  { value: 12, label: 'ธันวาคม' },
];

function clampDateRangeValue(
  range: RangeValue<CalendarDate>,
): { range: RangeValue<CalendarDate>; clamped: boolean } {
  const tempState: FilterState = { mode: 'date-range', dateRange: range };
  const bounds = resolveStatDateBounds(tempState);

  if (!bounds.clamped) {
    return { range, clamped: false };
  }

  const [sy, sm, sd] = bounds.created_after.split('-').map(Number);
  const [ey, em, ed] = bounds.created_before.split('-').map(Number);

  return {
    range: {
      start: new CalendarDate(sy, sm, sd),
      end: new CalendarDate(ey, em, ed),
    },
    clamped: true,
  };
}

export function StatFilter({ onFilterChange }: StatFilterProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentFiscalYear = toBuddhistEra(currentYear);

  const [filterState, setFilterState] = useState<FilterState>(() =>
    getDefaultStatFilterState(),
  );

  useEffect(() => {
    onFilterChange(filterState);
  }, [filterState, onFilterChange]);

  const handleModeChange = (mode: FilterMode) => {
    const newState: FilterState = { mode };

    if (mode === 'month') {
      newState.month = filterState.month || currentMonth;
      newState.year = filterState.year || currentYear;
    } else if (mode === 'fiscal-year') {
      newState.fiscalYear = filterState.fiscalYear || currentFiscalYear;
    } else if (mode === 'date-range') {
      newState.dateRange = getDefaultStatFilterState().dateRange;
    }

    setFilterState(newState);
  };

  const handleClearFilter = () => {
    setFilterState(getDefaultStatFilterState());
  };

  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i;
    const buddhistYear = toBuddhistEra(year);

    return { value: year, label: buddhistYear.toString() };
  });

  const fiscalYearOptions = Array.from({ length: 7 }, (_, i) => {
    const fiscalYear = currentFiscalYear - 5 + i;

    return { value: fiscalYear, label: fiscalYear.toString() };
  });

  return (
    <Card className="shadow-md border border-default-200">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 w-full">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              ตัวกรองข้อมูล
            </h3>
            <p className="text-default-500 text-xs mt-1">
              โหลดเฉพาะช่วงที่เลือก (สูงสุด {STAT_MAX_RANGE_DAYS} วัน)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <Select
              label="โหมดตัวกรอง"
              selectedKeys={[filterState.mode]}
              size="sm"
              variant="bordered"
              onSelectionChange={(keys) => {
                const selectedMode = Array.from(keys)[0] as FilterMode;

                handleModeChange(selectedMode);
              }}
            >
              <SelectItem key="date-range">ช่วงวันที่</SelectItem>
              <SelectItem key="month">ตามเดือน</SelectItem>
            </Select>
          </div>

          {filterState.mode === 'date-range' && (
            <div className="flex-1 min-w-[280px]">
              <DateRangePicker
                description={`สูงสุด ${STAT_MAX_RANGE_DAYS} วัน`}
                label="ช่วงวันที่"
                size="sm"
                value={filterState.dateRange}
                variant="bordered"
                visibleMonths={2}
                onChange={(value) => {
                  if (!value?.start || !value?.end) {
                    return;
                  }

                  const { range, clamped } = clampDateRangeValue(value);

                  if (clamped) {
                    addToast({
                      title: 'จำกัดช่วงวันที่',
                      description: `เลือกได้สูงสุด ${STAT_MAX_RANGE_DAYS} วัน — ปรับวันเริ่มให้อัตโนมัติ`,
                      color: 'warning',
                    });
                  }

                  setFilterState({
                    ...filterState,
                    dateRange: range,
                  });
                }}
              />
            </div>
          )}

          {filterState.mode === 'month' && (
            <>
              <div className="flex-1 min-w-[120px]">
                <Select
                  label="เดือน"
                  selectedKeys={
                    filterState.month ? [filterState.month.toString()] : []
                  }
                  size="sm"
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selectedMonth = parseInt(
                      Array.from(keys)[0] as string,
                    );

                    setFilterState({
                      ...filterState,
                      month: selectedMonth,
                    });
                  }}
                >
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <Select
                  label="ปี"
                  selectedKeys={
                    filterState.year ? [filterState.year.toString()] : []
                  }
                  size="sm"
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selectedYearValue = parseInt(
                      Array.from(keys)[0] as string,
                    );

                    setFilterState({
                      ...filterState,
                      year: selectedYearValue,
                    });
                  }}
                >
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value.toString()}>
                      {year.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </>
          )}

          {filterState.mode === 'fiscal-year' && (
            <div className="flex-1 min-w-[150px]">
              <Select
                label="ปีงบประมาณ"
                selectedKeys={
                  filterState.fiscalYear
                    ? [filterState.fiscalYear.toString()]
                    : []
                }
                size="sm"
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selectedFiscalYear = parseInt(
                    Array.from(keys)[0] as string,
                  );

                  setFilterState({
                    ...filterState,
                    fiscalYear: selectedFiscalYear,
                  });
                }}
              >
                {fiscalYearOptions.map((fiscalYear) => (
                  <SelectItem key={fiscalYear.value.toString()}>
                    {fiscalYear.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Button
              className="bg-orange-100 text-orange-700 hover:bg-orange-200"
              color="default"
              size="lg"
              variant="flat"
              onPress={handleClearFilter}
            >
              ล้างตัวกรอง
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
