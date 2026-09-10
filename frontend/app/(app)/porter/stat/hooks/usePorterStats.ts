import { useState, useEffect, useMemo } from 'react';

import type { StatDateFilterInput } from '../dateBounds';

import { resolveStatDateBounds } from '../dateBounds';

export interface PorterStatsHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface PorterStats {
  totalJobs: number;
  waitingJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  dailyJobs: Array<{
    date: string;
    ปกติ: number;
    ด่วน: number;
    ฉุกเฉิน: number;
    ยอดรวม: number;
  }>;
  transportReasons: Array<{ reason: string; count: number }>;
  popularPickupLocations: Array<{ location: string; count: number }>;
  popularDeliveryLocations: Array<{ location: string; count: number }>;
  employeePerformance: Array<{
    employeeName: string;
    firstName: string;
    lastName: string;
    assignedJobCount: number;
    averageDuration: number;
  }>;
  heatmapCells: PorterStatsHeatmapCell[];
}

const EMPTY_STATS: PorterStats = {
  totalJobs: 0,
  waitingJobs: 0,
  inProgressJobs: 0,
  completedJobs: 0,
  cancelledJobs: 0,
  dailyJobs: [],
  transportReasons: [],
  popularPickupLocations: [],
  popularDeliveryLocations: [],
  employeePerformance: [],
  heatmapCells: [],
};

type StatsApiSuccess = {
  success: true;
  data: PorterStats;
};

type StatsApiError = {
  success: false;
  error?: string;
  message?: string;
};

/**
 * โหลดสถิติจาก GET /api/porter/stats ครั้งเดียวตามช่วงวันที่
 * ไม่ดึงรายการงานเต็มมา aggregate ใน browser
 */
export function usePorterStats(filterState: StatDateFilterInput | null) {
  const [stats, setStats] = useState<PorterStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bounds = useMemo(
    () => resolveStatDateBounds(filterState),
    // serialize filter fields เพื่อกัน object identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filterState?.mode,
      filterState?.dateRange?.start?.toString(),
      filterState?.dateRange?.end?.toString(),
      filterState?.month,
      filterState?.year,
      filterState?.fiscalYear,
    ],
  );

  useEffect(() => {
    const { created_after, created_before } = bounds;
    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          created_after,
          created_before,
        });
        const response = await fetch(`/api/porter/stats?${params.toString()}`);
        const result = (await response.json()) as StatsApiSuccess | StatsApiError;

        if (!response.ok || !result.success) {
          throw new Error(
            !result.success && result.message
              ? result.message
              : 'ไม่สามารถโหลดข้อมูลสถิติได้',
          );
        }

        if (cancelled) return;

        setStats({
          ...EMPTY_STATS,
          ...result.data,
          heatmapCells: result.data.heatmapCells ?? [],
        });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        );
        setStats(EMPTY_STATS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchStats();

    return () => {
      cancelled = true;
    };
  }, [bounds.created_after, bounds.created_before]);

  return {
    stats,
    isLoading,
    error,
  };
}
