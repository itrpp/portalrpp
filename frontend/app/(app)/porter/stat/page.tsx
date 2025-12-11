"use client";

import React from "react";
import { Card, CardBody, Spinner } from "@heroui/react";

import { StatCard } from "./components/StatCard";
import { DailyJobChart } from "./components/DailyJobChart";
import { PopularLocationChart } from "./components/PopularLocationChart";
import { EmployeePerformanceTable } from "./components/EmployeePerformanceTable";
import { usePorterStats } from "./hooks/usePorterStats";

import {
  ChartBarIcon,
  ClipboardListIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from "@/components/ui/icons";

export default function PorterStatPage() {
  const { stats, isLoading, error } = usePorterStats();

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-primary" />
            สถิติการดำเนินงาน
          </h1>
          <p className="text-default-600 mt-2">
            สถิติการดำเนินงานของระบบพนักงานเปลทั้งหมด
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        {/* เหตุผลการเคลื่อนย้าย */}
        {/* <TransportReasonChart data={stats.transportReasons} /> */}

        {/* จุดรับยอดนิยม */}
        <PopularLocationChart
          color="#0088FE"
          data={stats.popularPickupLocations}
          title="จุดรับยอดนิยม (Top 10)"
        />

        {/* จุดส่งยอดนิยม */}
        <PopularLocationChart
          color="#00C49F"
          data={stats.popularDeliveryLocations}
          title="จุดส่งยอดนิยม (Top 10)"
        />
      </div>

      {/* ประสิทธิผลรายบุคคล */}
      <div className="grid grid-cols-1">
        <EmployeePerformanceTable data={stats.employeePerformance} />
      </div>
    </div>
  );
}
