'use client';

import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import { useMemo } from 'react';

import { dateRangeToApiBounds, getDefaultJobListDateRange } from '../dateRange';

import { useCenterPorterRequests } from './useCenterPorterRequests';

export interface UseJobListCountsParams {
  search?: string | null;
  urgencyLevel?: string | null;
  dateRange?: RangeValue<CalendarDate> | null;
  assignedToId?: string | null;
}

/**
 * จำนวนรายการแต่ละ tab จาก total ของ API (page_size=1)
 * ใช้ filter เดียวกับ list — ไม่โหลดชุดใหญ่มา count ใน client
 */
export function useJobListCounts({
  search,
  urgencyLevel,
  dateRange,
  assignedToId,
}: UseJobListCountsParams = {}) {
  const effectiveRange =
    dateRange?.start && dateRange?.end
      ? dateRange
      : getDefaultJobListDateRange();
  const { created_after, created_before } = dateRangeToApiBounds(effectiveRange);

  const commonParams = {
    search: search?.trim() || null,
    urgency_level: urgencyLevel || null,
    created_after,
    created_before,
    assigned_to_id: assignedToId?.trim() || null,
    page: 1,
    pageSize: 1,
    count_only: true as const,
  };

  const waiting = useCenterPorterRequests({
    status: 'WAITING_CENTER',
    ...commonParams,
  });
  const inProgress = useCenterPorterRequests({
    status: 'WAITING_ACCEPT,IN_PROGRESS',
    ...commonParams,
  });
  const completed = useCenterPorterRequests({
    status: 'COMPLETED',
    ...commonParams,
  });
  const cancelled = useCenterPorterRequests({
    status: 'CANCELLED',
    ...commonParams,
  });

  return useMemo(
    () => ({
      waitingCount: waiting.data?.total ?? 0,
      inProgressCount: inProgress.data?.total ?? 0,
      completedCount: completed.data?.total ?? 0,
      cancelledCount: cancelled.data?.total ?? 0,
    }),
    [
      waiting.data?.total,
      inProgress.data?.total,
      completed.data?.total,
      cancelled.data?.total,
    ],
  );
}
