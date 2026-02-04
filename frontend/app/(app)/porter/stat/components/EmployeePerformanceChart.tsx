"use client";

import React, { useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { RangeValue } from "@react-types/shared";

import { calculateEmployeePerformance } from "../utils/employeePerformance";

import { FilterState } from "./StatFilter";

import { PorterJobItem } from "@/types/porter";
import {
  getDateRangeFromFilter,
  formatDateRangeThai,
  formatDurationMinutes,
  getFiscalYearRange,
  getMonthRange,
} from "@/lib/utils";

interface EmployeePerformanceChartProps {
  jobs: PorterJobItem[];
  filterState?: FilterState | null;
}

type DateRange = RangeValue<CalendarDate> | null;

export function EmployeePerformanceChart({
  jobs,
  filterState,
}: EmployeePerformanceChartProps) {
  // คำนวณวันที่เริ่มต้นและสิ้นสุดสำหรับ default (30 วันย้อนหลัง)
  const getDefaultDateRange = (): RangeValue<CalendarDate> => {
    const todayDate = today(getLocalTimeZone());
    const startDate = todayDate.subtract({ days: 30 });

    return {
      start: startDate,
      end: todayDate,
    };
  };

  const [dateRange] = useState<DateRange>(getDefaultDateRange());

  // คำนวณประสิทธิผลรายบุคคลตาม date range ที่เลือก (Memoized)
  const employeePerformance = useMemo(() => {
    // ถ้าไม่มี jobs ให้ return array ว่าง
    if (!jobs || jobs.length === 0) {
      return [];
    }

    // ถ้ามี filter state จาก parent ให้ใช้แทน
    if (filterState) {
      const dateRangeFromFilter = getDateRangeFromFilter(filterState);

      return calculateEmployeePerformance(
        jobs,
        dateRangeFromFilter.startDate,
        dateRangeFromFilter.endDate,
      );
    }

    // ใช้ internal date range ถ้าไม่มี filter state จาก parent
    const startDateStr = dateRange?.start?.toString();
    const endDateStr = dateRange?.end?.toString();

    return calculateEmployeePerformance(jobs, startDateStr, endDateStr);
  }, [jobs, filterState, dateRange]);

  // เตรียมข้อมูลสำหรับ chart (แสดงทุกคน)
  const chartData = useMemo(() => {
    return employeePerformance.map((employee) => ({
      name: `${employee.firstName} ${employee.lastName}`,
      fullName: `${employee.firstName} ${employee.lastName}`,
      assignedJobCount: employee.assignedJobCount,
      averageDuration: employee.averageDuration,
    }));
  }, [employeePerformance]);

  // สีสำหรับแต่ละ bar (ไล่เฉดสี) - ใช้สีซ้ำถ้ามีพนักงานมากกว่า 10 คน
  const colors = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
    "#8dd1e1",
    "#d084d0",
    "#a4de6c",
    "#ffb347",
    "#87ceeb",
    "#dda0dd",
    "#f0e68c",
  ];

  // แปลง filter state เป็น string สำหรับแสดงช่วงเวลา
  const dateRangeSubtitle = useMemo(() => {
    if (!filterState) {
      // ถ้าไม่มี filter state ให้ใช้ internal date range
      if (dateRange?.start && dateRange?.end) {
        const startDate = new Date(
          dateRange.start.year,
          dateRange.start.month - 1,
          dateRange.start.day,
        );
        const endDate = new Date(
          dateRange.end.year,
          dateRange.end.month - 1,
          dateRange.end.day,
        );

        return formatDateRangeThai(startDate, endDate);
      }

      return "";
    }

    if (filterState.mode === "date-range" && filterState.dateRange) {
      const { start, end } = filterState.dateRange;

      if (start && end) {
        const startDate = new Date(start.year, start.month - 1, start.day);
        const endDate = new Date(end.year, end.month - 1, end.day);

        return formatDateRangeThai(startDate, endDate);
      }
    }

    if (filterState.mode === "month" && filterState.month && filterState.year) {
      const { start, end } = getMonthRange(filterState.year, filterState.month);

      return formatDateRangeThai(start, end);
    }

    if (filterState.mode === "fiscal-year" && filterState.fiscalYear) {
      const { start, end } = getFiscalYearRange(filterState.fiscalYear);

      return formatDateRangeThai(start, end);
    }

    return "";
  }, [filterState, dateRange]);

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              จำนวนงานรายบุคคล
            </h3>
            {dateRangeSubtitle && (
              <p className="text-sm text-default-600 whitespace-nowrap">
                ข้อมูลจากช่วงวันที่ : {dateRangeSubtitle}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        {employeePerformance.length === 0 ? (
          <div className="text-center py-8 text-default-500">
            ยังไม่มีข้อมูลประสิทธิผลรายบุคคลในช่วงวันที่ที่เลือก
          </div>
        ) : (
          <>
            {/* Chart ด้านบน: แสดงจำนวนงาน */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-default-700 mb-2">
                จำนวนงานที่ได้รับมอบหมาย
              </h4>
              <ResponsiveContainer height={400} width="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  syncId="employeePerformance"
                >
                  <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                  <XAxis
                    label={{
                      value: "จำนวนงาน",
                      position: "insideBottom",
                      offset: -5,
                      style: { textAnchor: "middle", fontSize: "12px" },
                    }}
                    stroke="#888"
                    style={{ fontSize: "12px" }}
                    type="number"
                  />
                  <YAxis
                    dataKey="name"
                    stroke="#888"
                    style={{ fontSize: "11px" }}
                    type="category"
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;

                        return (
                          <div
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "12px",
                            }}
                          >
                            <p
                              style={{
                                fontWeight: "bold",
                                fontSize: "12px",
                                marginBottom: "8px",
                              }}
                            >
                              {data.fullName}
                            </p>
                            <div>
                              <span
                                style={{ fontWeight: "600", fontSize: "12px" }}
                              >
                                จำนวนงานที่ได้รับมอบหมาย:{" "}
                              </span>
                              <span
                                style={{ fontWeight: "600", fontSize: "12px" }}
                              >
                                {data.assignedJobCount.toLocaleString("th-TH")}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    }}
                  />
                  <Bar
                    dataKey="assignedJobCount"
                    label={{ position: "right", style: { fontSize: "10px" } }}
                    name="จำนวนงานที่ได้รับมอบหมาย"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-count-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart ด้านล่าง: แสดงเวลาเฉลี่ย */}
            <div>
              <h4 className="text-sm font-medium text-default-700 mb-2">
                เวลาเฉลี่ยในการทำงาน
              </h4>
              <ResponsiveContainer height={400} width="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  syncId="employeePerformance"
                >
                  <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                  <XAxis
                    label={{
                      value: "เวลาเฉลี่ย (นาที)",
                      position: "insideBottom",
                      offset: -5,
                      style: { textAnchor: "middle", fontSize: "12px" },
                    }}
                    stroke="#888"
                    style={{ fontSize: "12px" }}
                    type="number"
                  />
                  <YAxis
                    dataKey="name"
                    stroke="#888"
                    style={{ fontSize: "11px" }}
                    type="category"
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;

                        return (
                          <div
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "12px",
                            }}
                          >
                            <p
                              style={{
                                fontWeight: "bold",
                                fontSize: "12px",
                                marginBottom: "8px",
                              }}
                            >
                              {data.fullName}
                            </p>
                            <div>
                              <span
                                style={{ fontWeight: "600", fontSize: "12px" }}
                              >
                                ระยะเวลาเฉลี่ย:{" "}
                              </span>
                              <span
                                style={{ fontWeight: "600", fontSize: "12px" }}
                              >
                                {formatDurationMinutes(data.averageDuration)}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    }}
                  />
                  <Bar
                    dataKey="averageDuration"
                    label={{ position: "right", style: { fontSize: "10px" } }}
                    name="เวลาเฉลี่ย"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-duration-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {employeePerformance.length > 0 && (
              <div className="text-center mt-4 text-sm text-default-600">
                เจ้าหน้าที่ทั้งหมด {employeePerformance.length} คน
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
