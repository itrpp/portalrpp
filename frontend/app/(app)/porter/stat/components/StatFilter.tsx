"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  DateRangePicker,
  Button,
  Select,
  SelectItem,
  CardHeader,
} from "@heroui/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { RangeValue } from "@react-types/shared";

import { toBuddhistEra } from "@/lib/utils";

export type FilterMode = "date-range" | "month" | "fiscal-year";

export interface FilterState {
  mode: FilterMode;
  dateRange?: RangeValue<CalendarDate>;
  month?: number; // 1-12
  year?: number; // ค.ศ.
  fiscalYear?: number; // พ.ศ.
}

interface StatFilterProps {
  onFilterChange: (filter: FilterState) => void;
}

const MONTHS = [
  { value: 1, label: "มกราคม" },
  { value: 2, label: "กุมภาพันธ์" },
  { value: 3, label: "มีนาคม" },
  { value: 4, label: "เมษายน" },
  { value: 5, label: "พฤษภาคม" },
  { value: 6, label: "มิถุนายน" },
  { value: 7, label: "กรกฎาคม" },
  { value: 8, label: "สิงหาคม" },
  { value: 9, label: "กันยายน" },
  { value: 10, label: "ตุลาคม" },
  { value: 11, label: "พฤศจิกายน" },
  { value: 12, label: "ธันวาคม" },
];

export function StatFilter({ onFilterChange }: StatFilterProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentFiscalYear = toBuddhistEra(currentYear);

  // Default: "ช่วงวันที่" + ย้อนหลัง 30 วัน
  const getDefaultDateRange = (): RangeValue<CalendarDate> => {
    const todayDate = today(getLocalTimeZone());
    const startDate = todayDate.subtract({ days: 30 });

    return {
      start: startDate,
      end: todayDate,
    };
  };

  const [filterState, setFilterState] = useState<FilterState>({
    mode: "date-range",
    dateRange: getDefaultDateRange(),
  });

  // ส่ง filter state ไปให้ parent เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    onFilterChange(filterState);
  }, [filterState, onFilterChange]);

  const handleModeChange = (mode: FilterMode) => {
    const newState: FilterState = { mode };

    if (mode === "month") {
      newState.month = filterState.month || currentMonth;
      newState.year = filterState.year || currentYear;
    } else if (mode === "fiscal-year") {
      newState.fiscalYear = filterState.fiscalYear || currentFiscalYear;
    } else if (mode === "date-range") {
      // Default: 30 วันย้อนหลัง
      const todayDate = today(getLocalTimeZone());
      const startDate = todayDate.subtract({ days: 30 });

      newState.dateRange = {
        start: startDate,
        end: todayDate,
      };
    }

    setFilterState(newState);
  };

  const handleClearFilter = () => {
    const clearedState: FilterState = {
      mode: "date-range",
      dateRange: getDefaultDateRange(),
    };

    setFilterState(clearedState);
  };

  // สร้างรายการปีสำหรับ dropdown (5 ปีย้อนหลัง ถึง 1 ปีข้างหน้า)
  // แสดงเป็นปี พ.ศ. แต่เก็บค่าเป็น ค.ศ. ไว้ใน state
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i;
    const buddhistYear = toBuddhistEra(year);

    return { value: year, label: buddhistYear.toString() };
  });

  // สร้างรายการปีงบประมาณสำหรับ dropdown (5 ปีย้อนหลัง ถึง 1 ปีข้างหน้า)
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
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Filter Mode */}
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
              {/* <SelectItem key="fiscal-year">
                ตามปีงบ
              </SelectItem> */}
            </Select>
          </div>

          {/* Date Range Picker (แสดงเมื่อเลือก "ช่วงวันที่") */}
          {filterState.mode === "date-range" && (
            <div className="flex-1 min-w-[280px]">
              <DateRangePicker
                label="ช่วงวันที่"
                size="sm"
                value={filterState.dateRange}
                variant="bordered"
                visibleMonths={2}
                onChange={(value) => {
                  setFilterState({
                    ...filterState,
                    dateRange: value || undefined,
                  });
                }}
              />
            </div>
          )}

          {/* Month และ Year Select (แสดงเมื่อเลือก "ตามเดือน") */}
          {filterState.mode === "month" && (
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

                    // selectedYearValue เป็น ค.ศ. (value ใน yearOptions)
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

          {/* Fiscal Year Select (แสดงเมื่อเลือก "ตามปีงบ") */}
          {filterState.mode === "fiscal-year" && (
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

          {/* ปุ่มล้างตัวกรอง */}
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
