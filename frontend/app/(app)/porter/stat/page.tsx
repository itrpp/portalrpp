"use client";

import React, { useState, useMemo } from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";

import { StatCard } from "./components/StatCard";
import { DailyJobChart } from "./components/DailyJobChart";
import { PopularLocationChart } from "./components/PopularLocationChart";
import { EmployeePerformanceChart } from "./components/EmployeePerformanceChart";
import { TimeHeatmap } from "./components/TimeHeatmap";
import { StatFilter, FilterState } from "./components/StatFilter";
import { usePorterStats } from "./hooks/usePorterStats";

import {
  ChartBarIcon,
  ClipboardListIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from "@/components/ui/icons";

export default function PorterStatPage() {
  const { stats, jobs, isLoading, error } = usePorterStats();

  // Default filter: ย้อนหลัง 30 วันจากปัจจุบัน
  const defaultFilterState = useMemo<FilterState>(() => {
    const todayDate = today(getLocalTimeZone());
    const startDate = todayDate.subtract({ days: 30 });

    return {
      mode: "date-range",
      dateRange: {
        start: startDate,
        end: todayDate,
      },
    };
  }, []);

  const [filterState, setFilterState] = useState<FilterState | null>(
    defaultFilterState,
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Spinner color="primary" size="lg" />
            <p className="text-default-600 mt-4">กำลังโหลดข้อมูลสถิติ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border border-danger-200 bg-danger-50">
          <CardBody className="p-6">
            <div className="text-center">
              <p className="text-danger-700 font-semibold text-lg">
                เกิดข้อผิดพลาด
              </p>
              <p className="text-danger-600 mt-2">{error}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-default-200">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary">
              <ChartBarIcon className="w-6 h-6" />
            </div>
            สถิติการดำเนินงาน
          </h1>
          <p className="text-default-600 mt-2 text-sm">
            สถิติการดำเนินงานของศูนย์เคลื่อนย้ายผู้ป่วย
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          color="primary"
          icon={<ClipboardListIcon className="w-8 h-8" />}
          title="งานทั้งหมด"
          value={stats.totalJobs}
        />
        <StatCard
          color="default"
          icon={<ClipboardListIcon className="w-8 h-8" />}
          title="ยังไม่ได้รับงาน"
          value={stats.waitingJobs}
        />
        <StatCard
          color="warning"
          icon={<ClockIcon className="w-8 h-8" />}
          title="อยู่ระหว่างดำเนินการ"
          value={stats.inProgressJobs}
        />
        <StatCard
          color="success"
          icon={<CheckCircleIcon className="w-8 h-8" />}
          title="ดำเนินการเสร็จสิ้น"
          value={stats.completedJobs}
        />
        <StatCard
          color="danger"
          icon={<XMarkIcon className="w-8 h-8" />}
          title="งานที่ยกเลิก"
          value={stats.cancelledJobs}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ปริมาณงานรายวัน */}
        <div className="lg:col-span-2">
          <DailyJobChart data={stats.dailyJobs} />
        </div>

        {/* Filter Component */}
        <div className="lg:col-span-2">
          <StatFilter onFilterChange={setFilterState} />
        </div>

        {/* Time Heatmap */}
        <div className="lg:col-span-2">
          <TimeHeatmap filterState={filterState} jobs={jobs} />
        </div>

        {/* จุดรับยอดนิยม */}
        <PopularLocationChart
          color="#0088FE"
          data={stats.popularPickupLocations}
          filterState={filterState}
          jobs={jobs}
          locationType="pickup"
          title="จุดรับ (Top 10)"
        />

        {/* จุดส่งยอดนิยม */}
        <PopularLocationChart
          color="#00C49F"
          data={stats.popularDeliveryLocations}
          filterState={filterState}
          jobs={jobs}
          locationType="delivery"
          title="จุดส่ง (Top 10)"
        />
      </div>

      {/* เหตุผลการเคลื่อนย้าย */}
      {/* <div className="grid grid-cols-2 gap-4">
        <TransportReasonChart data={stats.transportReasons} />
      </div> */}

      {/* จำนวนงานรายบุคคล */}
      <div className="grid grid-cols-1">
        <EmployeePerformanceChart filterState={filterState} jobs={jobs} />
      </div>
    </div>
  );
}
