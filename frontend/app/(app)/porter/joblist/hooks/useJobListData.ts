'use client';

import type { CalendarDate } from '@internationalized/date';
import type { JobListTab } from '@/types/porter';
import type { RangeValue } from '@react-types/shared';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { dateRangeToApiBounds, getDefaultJobListDateRange } from '../dateRange';

import { useCenterPorterRequests } from './useCenterPorterRequests';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';

const DEFAULT_PAGE_SIZE = 10;

function tabToStatus(tab: JobListTab): string {
  switch (tab) {
    case 'waiting':
      return 'WAITING_CENTER';
    case 'in-progress':
      return 'WAITING_ACCEPT,IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'WAITING_CENTER';
  }
}

export interface UseJobListDataParams {
  selectedTab: JobListTab;
  search?: string | null;
  urgencyLevel?: string | null;
  dateRange?: RangeValue<CalendarDate> | null;
  assignedToId?: string | null;
}

/**
 * โหลดรายการคำขอศูนย์เปล แบบ server-side pagination + ช่วงวันที่เสมอ
 */
export function useJobListData({
  selectedTab,
  search,
  urgencyLevel,
  dateRange,
  assignedToId,
}: UseJobListDataParams) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  const status = tabToStatus(selectedTab);
  const effectiveRange =
    dateRange?.start && dateRange?.end
      ? dateRange
      : getDefaultJobListDateRange();
  const { created_after, created_before } = dateRangeToApiBounds(effectiveRange);

  const listQuery = useCenterPorterRequests({
    status,
    page,
    pageSize,
    search: search?.trim() || null,
    urgency_level: urgencyLevel || null,
    created_after,
    created_before,
    assigned_to_id: assignedToId?.trim() || null,
  });

  const items = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: porterQueryKeys.jobs.lists(),
    });
    await listQuery.refetch();
  }, [queryClient, listQuery]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(Math.min(Math.max(1, newPageSize), 20));
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedTab, search, urgencyLevel, dateRange, assignedToId]);

  return useMemo(
    () => ({
      items,
      sortedJobs: items,
      total,
      totalPages,
      page,
      pageSize,
      startIndex,
      endIndex,
      isLoading: listQuery.isLoading,
      isFetching: listQuery.isFetching,
      error: listQuery.error?.message ?? null,
      refetch,
      setPage,
      setPageSize,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    }),
    [
      items,
      total,
      totalPages,
      page,
      pageSize,
      startIndex,
      endIndex,
      listQuery.isLoading,
      listQuery.isFetching,
      listQuery.error?.message,
      refetch,
      handlePageChange,
      handlePageSizeChange,
    ],
  );
}
