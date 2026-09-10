'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardBody, CardHeader, Spinner } from '@heroui/react';

import { StatCard } from './components/StatCard';
import { TimeHeatmap } from './components/TimeHeatmap';
import { StatFilter, FilterState } from './components/StatFilter';
import { getDefaultStatFilterState } from './dateBounds';
import { usePorterStats } from './hooks/usePorterStats';

function ChartPlaceholder() {
  return (
    <Card className="min-h-[280px]">
      <CardHeader className="pb-0" />
      <CardBody className="flex items-center justify-center min-h-[240px]">
        <Spinner color="primary" size="lg" />
      </CardBody>
    </Card>
  );
}

const DailyJobChart = dynamic(
  () => import('./components/DailyJobChart').then((m) => m.DailyJobChart),
  { ssr: false, loading: ChartPlaceholder },
);

const PopularLocationChart = dynamic(
  () =>
    import('./components/PopularLocationChart').then((m) => m.PopularLocationChart),
  { ssr: false, loading: ChartPlaceholder },
);

const EmployeePerformanceChart = dynamic(
  () =>
    import('./components/EmployeePerformanceChart').then(
      (m) => m.EmployeePerformanceChart,
    ),
  { ssr: false, loading: ChartPlaceholder },
);

import {
  ChartBarIcon,
  ClipboardListIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from '@/components/ui/icons';
import { LOADING_MESSAGES } from '@/lib/constants';

export default function PorterStatPage() {
  const [filterState, setFilterState] = useState<FilterState | null>(() =>
    getDefaultStatFilterState(),
  );

  const handleFilterChange = useCallback((filter: FilterState) => {
    setFilterState(filter);
  }, []);

  const { stats, isLoading, error } = usePorterStats(filterState);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Spinner color="primary" size="lg" />
            <p className="text-default-600 mt-4">{LOADING_MESSAGES.stats}</p>
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
              <p className="text-danger-700 font-semibold text-lg">เกิดข้อผิดพลาด</p>
              <p className="text-danger-600 mt-2">{error}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-default-200">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary">
              <ChartBarIcon className="w-6 h-6" />
            </div>
            สถิติการดำเนินงาน
          </h1>
          <p className="text-default-600 mt-2 text-sm">
            สถิติการดำเนินงานของศูนย์เคลื่อนย้ายผู้ป่วย (ตามช่วงวันที่ที่เลือก)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <StatCard
          color="primary"
          icon={<ClipboardListIcon className="w-8 h-8" />}
          title="งานทั้งหมด"
          value={stats.totalJobs}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <DailyJobChart data={stats.dailyJobs} />
        </div>

        <div className="lg:col-span-2">
          <StatFilter onFilterChange={handleFilterChange} />
        </div>

        <div className="lg:col-span-2">
          <TimeHeatmap cells={stats.heatmapCells} />
        </div>

        <PopularLocationChart
          color="#0088FE"
          data={stats.popularPickupLocations}
          title="จุดรับ (Top 10)"
        />

        <PopularLocationChart
          color="#00C49F"
          data={stats.popularDeliveryLocations}
          title="จุดส่ง (Top 10)"
        />
      </div>

      <div className="grid grid-cols-1">
        <EmployeePerformanceChart
          data={stats.employeePerformance}
          filterState={filterState}
        />
      </div>
    </div>
  );
}
