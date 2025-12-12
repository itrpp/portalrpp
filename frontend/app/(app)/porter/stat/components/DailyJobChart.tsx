"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  DateRangePicker,
  Button,
  ButtonGroup,
} from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { RangeValue } from "@react-types/shared";

import { formatDateShort } from "@/lib/utils";

interface DailyJobChartProps {
  data: Array<{
    date: string;
    ปกติ: number;
    ด่วน: number;
    ฉุกเฉิน: number;
    ยอดรวม: number;
  }>;
}

type DateRange = RangeValue<CalendarDate> | null;

export function DailyJobChart({ data }: DailyJobChartProps) {
  // คำนวณวันที่เริ่มต้นและสิ้นสุดสำหรับ default (30 วันย้อนหลัง)
  const getDefaultDateRange = (): RangeValue<CalendarDate> => {
    const todayDate = today(getLocalTimeZone());
    const startDate = todayDate.subtract({ days: 30 });

    return {
      start: startDate,
      end: todayDate,
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // Handler สำหรับ onChange ที่รับค่า null ได้
  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value || getDefaultDateRange());
  };

  // ฟังก์ชันสำหรับตรวจสอบว่า date range ตรงกับ preset หรือไม่
  const isPresetActive = (
    currentRange: DateRange,
    presetRange: RangeValue<CalendarDate>,
  ): boolean => {
    if (!currentRange?.start || !currentRange?.end) return false;

    return (
      currentRange.start.toString() === presetRange.start.toString() &&
      currentRange.end.toString() === presetRange.end.toString()
    );
  };

  // ฟังก์ชันสำหรับสร้าง date range จากจำนวนวันย้อนหลัง
  const createDateRangeFromDays = (days: number): RangeValue<CalendarDate> => {
    const todayDate = today(getLocalTimeZone());
    const startDate = todayDate.subtract({ days });

    return {
      start: startDate,
      end: todayDate,
    };
  };

  // Presets สำหรับเลือกช่วงวันที่
  const datePresets = [
    {
      label: "7 วัน",
      value: createDateRangeFromDays(7),
    },
    {
      label: "15 วัน",
      value: createDateRangeFromDays(15),
    },
    {
      label: "30 วัน",
      value: createDateRangeFromDays(30),
    },
  ];

  // Filter ข้อมูลตาม date range ที่เลือก
  const filteredData = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return data;

    const startDateStr = dateRange.start.toString();
    const endDateStr = dateRange.end.toString();

    return data.filter((item) => {
      const itemDateStr = item.date;

      return itemDateStr >= startDateStr && itemDateStr <= endDateStr;
    });
  }, [data, dateRange]);

  const chartData = filteredData.map((item) => ({
    date: formatDateShort(item.date),
    dateFull: item.date,
    ปกติ: item.ปกติ,
    ด่วน: item.ด่วน,
    ฉุกเฉิน: item.ฉุกเฉิน,
    ยอดรวม: item.ยอดรวม,
  }));

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            ปริมาณงานรายวัน
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 min-w-[280px]">
              <DateRangePicker
                label="ช่วงวันที่"
                size="sm"
                value={dateRange}
                variant="bordered"
                visibleMonths={2}
                onChange={handleDateRangeChange}
              />
            </div>
            <div className="flex items-center">
              <ButtonGroup radius="md" size="lg" variant="flat">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    className={
                      isPresetActive(dateRange, preset.value)
                        ? "bg-primary text-primary-foreground font-medium"
                        : ""
                    }
                    onPress={() => setDateRange(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        <ResponsiveContainer height={400} width="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
            <XAxis
              angle={-45}
              dataKey="date"
              height={60}
              stroke="#888"
              style={{ fontSize: "11px" }}
              textAnchor="end"
            />
            <YAxis stroke="#888" style={{ fontSize: "12px" }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const ปกติ = data.ปกติ || 0;
                  const ด่วน = data.ด่วน || 0;
                  const ฉุกเฉิน = data.ฉุกเฉิน || 0;
                  const ยอดรวม = data.ยอดรวม || 0;

                  return (
                    <div
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
                        {label}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#22c55e",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ปกติ: {ปกติ}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#f59e0b",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ด่วน: {ด่วน}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#ef4444",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ฉุกเฉิน: {ฉุกเฉิน}</span>
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            paddingTop: "8px",
                            borderTop: "1px solid #e0e0e0",
                            fontWeight: "bold",
                          }}
                        >
                          ยอดรวม: {ยอดรวม}
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              }}
            />
            <Legend />
            <Bar dataKey="ปกติ" fill="#22c55e" name="ปกติ" stackId="a" />
            <Bar dataKey="ด่วน" fill="#f59e0b" name="ด่วน" stackId="a" />
            <Bar dataKey="ฉุกเฉิน" fill="#ef4444" name="ฉุกเฉิน" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
