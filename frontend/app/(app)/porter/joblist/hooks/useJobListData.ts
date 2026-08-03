'use client';

import type { CalendarDate } from '@internationalized/date';
import type { JobListTab } from '@/types/porter';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RangeValue } from '@react-types/shared';

import { useCenterPorterRequests } from './useCenterPorterRequests';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';
import { sortJobs } from '@/lib/porter';
import { PorterJobItem } from '@/types/porter';
import { getISODatePart } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 5;
const IN_PROGRESS_FETCH_SIZE = 500;
/** เมื่อมี filter ช่วงวันที่/ชื่อเจ้าหน้าที่/ประเภทรถ ใช้โหลดข้อมูลมาก enough เพื่อ filter จากทั้งหมด */
const FETCH_ALL_SIZE = 2000;

function toDateOnly(value: CalendarDate | null): Date | null {
  if (!value) return null;

  return new Date(value.year, value.month - 1, value.day);
}

function filterByCompletedDate(
  items: PorterJobItem[],
  start: CalendarDate | null,
  end: CalendarDate | null,
): PorterJobItem[] {
  if (!start && !end) return items;

  return items.filter((job) => {
    if (!job.completedAt) return false;
    const jobDate = new Date(job.completedAt);
    const jobDateOnly = new Date(
      jobDate.getFullYear(),
      jobDate.getMonth(),
      jobDate.getDate(),
    );

    if (start) {
      const startDate = toDateOnly(start);

      if (startDate && jobDateOnly < startDate) return false;
    }
    if (end) {
      const endDate = toDateOnly(end);

      if (endDate && jobDateOnly > endDate) return false;
    }

    return true;
  });
}

function filterByCancelledDate(
  items: PorterJobItem[],
  start: CalendarDate | null,
  end: CalendarDate | null,
): PorterJobItem[] {
  if (!start && !end) return items;

  return items.filter((job) => {
    if (!job.cancelledAt) return false;
    const jobDate = new Date(job.cancelledAt);
    const jobDateOnly = new Date(
      jobDate.getFullYear(),
      jobDate.getMonth(),
      jobDate.getDate(),
    );

    if (start) {
      const startDate = toDateOnly(start);

      if (startDate && jobDateOnly < startDate) return false;
    }
    if (end) {
      const endDate = toDateOnly(end);

      if (endDate && jobDateOnly > endDate) return false;
    }

    return true;
  });
}

function tabToStatus(tab: JobListTab): string | null {
  switch (tab) {
    case 'waiting':
      return 'WAITING_CENTER';
    case 'in-progress':
      return null;
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return null;
  }
}

export interface UseJobListDataParams {
  selectedTab: JobListTab;
  completedStartDate?: CalendarDate | null;
  completedEndDate?: CalendarDate | null;
  cancelledStartDate?: CalendarDate | null;
  cancelledEndDate?: CalendarDate | null;
  /** ค้นหาชื่อผู้ป่วย/HN — ส่งไป API (filter จากข้อมูลทั้งหมด) */
  search?: string | null;
  /** ความเร่งด่วน — ส่งไป API (filter จากข้อมูลทั้งหมด) */
  urgencyLevel?: string | null;
  /** ประเภทรถ — กรอง client-side ต้องโหลดชุดใหญ่ */
  vehicleType?: string | null;
  /** ช่วงวันที่ (createdAt) — กรอง client-side ต้องโหลดชุดใหญ่ */
  dateRange?: RangeValue<CalendarDate> | null;
  /** ชื่อเจ้าหน้าที่เปล — กรอง client-side ต้องโหลดชุดใหญ่ */
  staffNameFilter?: string | null;
}

/**
 * Hook สำหรับโหลดข้อมูลรายการคำขอแบบศูนย์เปล (จัดรูปแบบเดียวกับหน้า request)
 * ใช้ React Query + server-side pagination ตาม tab (ยกเว้น in-progress ที่ merge 2 status)
 */
/** กรองตามช่วงวันที่ (createdAt), ชื่อเจ้าหน้าที่เปล และประเภทรถ */
function filterByClientSideFilters(
  items: PorterJobItem[],
  dateRange: RangeValue<CalendarDate> | null | undefined,
  staffNameFilter: string | null | undefined,
  vehicleType: string | null | undefined,
): PorterJobItem[] {
  let filtered = items;

  if (dateRange?.start && dateRange?.end) {
    const startStr = dateRange.start.toString();
    const endStr = dateRange.end.toString();

    filtered = filtered.filter((job) => {
      if (!job.createdAt) return false;

      const jobDateStr = getISODatePart(job.createdAt);

      return jobDateStr >= startStr && jobDateStr <= endStr;
    });
  }

  if (staffNameFilter?.trim()) {
    const q = staffNameFilter.toLowerCase().trim();

    filtered = filtered.filter(
      (job) =>
        job.assignedToName?.toLowerCase().includes(q) === true,
    );
  }

  if (vehicleType?.trim()) {
    filtered = filtered.filter(
      (job) => job.form.vehicleType === vehicleType,
    );
  }

  return filtered;
}

export function useJobListData({
  selectedTab,
  completedStartDate,
  completedEndDate,
  cancelledStartDate,
  cancelledEndDate,
  search,
  urgencyLevel,
  vehicleType,
  dateRange,
  staffNameFilter,
}: UseJobListDataParams) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  const status = tabToStatus(selectedTab);
  const completedHasDateFilter =
    !!completedStartDate || !!completedEndDate;
  const cancelledHasDateFilter =
    !!cancelledStartDate || !!cancelledEndDate;

  /** มี filter ที่ต้องกรอง client-side (ต้องโหลดชุดใหญ่) */
  const hasClientSideFilter =
    !!(dateRange?.start && dateRange?.end) ||
    !!(staffNameFilter?.trim()) ||
    !!(vehicleType?.trim());

  const fetchSize = hasClientSideFilter ? FETCH_ALL_SIZE : (selectedTab === 'in-progress' ? IN_PROGRESS_FETCH_SIZE : pageSize);
  const fetchPage = hasClientSideFilter ? 1 : (selectedTab === 'in-progress' ? 1 : page);

  const useSingleQuery =
    selectedTab !== 'in-progress' &&
    !(selectedTab === 'completed' && completedHasDateFilter) &&
    !(selectedTab === 'cancelled' && cancelledHasDateFilter);

  const commonParams = {
    search: search?.trim() || null,
    urgency_level: urgencyLevel || null,
  };

  // Single-status tabs: server-side pagination (หรือโหลดชุดใหญ่เมื่อมี client filter)
  const singleQuery = useCenterPorterRequests(
    selectedTab !== 'in-progress'
      ? { status, page: fetchPage, pageSize: fetchSize, ...commonParams }
      : { status: null, page: 1, pageSize: 1, ...commonParams },
    { enabled: useSingleQuery },
  );

  // in-progress: two statuses, fetch both then merge and client-side paginate
  const inProgressFetchSize = hasClientSideFilter ? FETCH_ALL_SIZE : IN_PROGRESS_FETCH_SIZE;
  const waitingAcceptQuery = useCenterPorterRequests(
    {
      status: 'WAITING_ACCEPT',
      page: 1,
      pageSize: inProgressFetchSize,
      ...commonParams,
    },
    { enabled: selectedTab === 'in-progress' },
  );
  const inProgressQuery = useCenterPorterRequests(
    {
      status: 'IN_PROGRESS',
      page: 1,
      pageSize: inProgressFetchSize,
      ...commonParams,
    },
    { enabled: selectedTab === 'in-progress' },
  );

  const inProgressMerged = useMemo(() => {
    if (selectedTab !== 'in-progress') return [];
    const a = waitingAcceptQuery.data?.data ?? [];
    const b = inProgressQuery.data?.data ?? [];
    const merged = sortJobs([...a, ...b], 'in-progress');

    return filterByClientSideFilters(merged, dateRange, staffNameFilter, vehicleType);
  }, [
    selectedTab,
    waitingAcceptQuery.data?.data,
    inProgressQuery.data?.data,
    dateRange,
    staffNameFilter,
    vehicleType,
  ]);

  const inProgressPaginatedItems = useMemo(() => {
    if (selectedTab !== 'in-progress') return [];
    const start = (page - 1) * pageSize;

    return inProgressMerged.slice(start, start + pageSize);
  }, [selectedTab, inProgressMerged, page, pageSize]);

  const completedFetchAll = selectedTab === 'completed' && completedHasDateFilter;
  const cancelledFetchAll = selectedTab === 'cancelled' && cancelledHasDateFilter;

  const completedAllQuery = useCenterPorterRequests(
    {
      status: 'COMPLETED',
      page: 1,
      pageSize: 1000,
    },
    { enabled: completedFetchAll },
  );
  const cancelledAllQuery = useCenterPorterRequests(
    {
      status: 'CANCELLED',
      page: 1,
      pageSize: 1000,
    },
    { enabled: cancelledFetchAll },
  );

  const singleTabRawData = useMemo(() => {
    if (selectedTab === 'in-progress') return [];
    const raw = singleQuery.data?.data ?? [];

    return hasClientSideFilter
      ? filterByClientSideFilters(raw, dateRange, staffNameFilter, vehicleType)
      : raw;
  }, [
    selectedTab,
    singleQuery.data?.data,
    hasClientSideFilter,
    dateRange,
    staffNameFilter,
    vehicleType,
  ]);

  const items = useMemo(() => {
    if (selectedTab === 'in-progress') {
      return inProgressPaginatedItems;
    }
    if (completedFetchAll) {
      const raw = completedAllQuery.data?.data ?? [];
      const filtered = filterByCompletedDate(
        raw,
        completedStartDate ?? null,
        completedEndDate ?? null,
      );
      const start = (page - 1) * pageSize;

      return filtered.slice(start, start + pageSize);
    }
    if (cancelledFetchAll) {
      const raw = cancelledAllQuery.data?.data ?? [];
      const filtered = filterByCancelledDate(
        raw,
        cancelledStartDate ?? null,
        cancelledEndDate ?? null,
      );
      const start = (page - 1) * pageSize;

      return filtered.slice(start, start + pageSize);
    }
    if (hasClientSideFilter) {
      const start = (page - 1) * pageSize;

      return singleTabRawData.slice(start, start + pageSize);
    }

    return singleQuery.data?.data ?? [];
  }, [
    selectedTab,
    inProgressPaginatedItems,
    singleQuery.data?.data,
    completedFetchAll,
    cancelledFetchAll,
    completedAllQuery.data?.data,
    cancelledAllQuery.data?.data,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
    hasClientSideFilter,
    singleTabRawData,
    page,
    pageSize,
  ]);

  const total = useMemo(() => {
    if (selectedTab === 'in-progress') return inProgressMerged.length;
    if (completedFetchAll) {
      const raw = completedAllQuery.data?.data ?? [];

      return filterByCompletedDate(
        raw,
        completedStartDate ?? null,
        completedEndDate ?? null,
      ).length;
    }
    if (cancelledFetchAll) {
      const raw = cancelledAllQuery.data?.data ?? [];

      return filterByCancelledDate(
        raw,
        cancelledStartDate ?? null,
        cancelledEndDate ?? null,
      ).length;
    }
    if (hasClientSideFilter) return singleTabRawData.length;

    return singleQuery.data?.total ?? 0;
  }, [
    selectedTab,
    inProgressMerged.length,
    singleQuery.data?.total,
    completedFetchAll,
    cancelledFetchAll,
    completedAllQuery.data?.data,
    cancelledAllQuery.data?.data,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
    hasClientSideFilter,
    singleTabRawData.length,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  /** โหลดครั้งแรก (ยังไม่มีข้อมูล) — ใช้แสดง full loading เท่านั้น */
  const isLoading = useMemo(() => {
    if (selectedTab === 'in-progress') {
      return waitingAcceptQuery.isLoading || inProgressQuery.isLoading;
    }
    if (completedFetchAll) return completedAllQuery.isLoading;
    if (cancelledFetchAll) return cancelledAllQuery.isLoading;

    return singleQuery.isLoading;
  }, [
    selectedTab,
    waitingAcceptQuery.isLoading,
    inProgressQuery.isLoading,
    singleQuery.isLoading,
    completedFetchAll,
    cancelledFetchAll,
    completedAllQuery.isLoading,
    cancelledAllQuery.isLoading,
  ]);

  /** กำลัง fetch (รวม refetch) — ใช้แสดง loading ที่ปุ่มรีเฟรช */
  const isFetching = useMemo(() => {
    if (selectedTab === 'in-progress') {
      return waitingAcceptQuery.isFetching || inProgressQuery.isFetching;
    }
    if (completedFetchAll) return completedAllQuery.isFetching;
    if (cancelledFetchAll) return cancelledAllQuery.isFetching;

    return singleQuery.isFetching;
  }, [
    selectedTab,
    waitingAcceptQuery.isFetching,
    inProgressQuery.isFetching,
    singleQuery.isFetching,
    completedFetchAll,
    cancelledFetchAll,
    completedAllQuery.isFetching,
    cancelledAllQuery.isFetching,
  ]);

  const error = useMemo(() => {
    if (selectedTab === 'in-progress') {
      return waitingAcceptQuery.error ?? inProgressQuery.error;
    }
    if (completedFetchAll) return completedAllQuery.error;
    if (cancelledFetchAll) return cancelledAllQuery.error;

    return singleQuery.error;
  }, [
    selectedTab,
    waitingAcceptQuery.error,
    inProgressQuery.error,
    singleQuery.error,
    completedFetchAll,
    cancelledFetchAll,
    completedAllQuery.error,
    cancelledAllQuery.error,
  ]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: porterQueryKeys.jobs.lists(),
    });
    if (selectedTab === 'in-progress') {
      await Promise.all([
        waitingAcceptQuery.refetch(),
        inProgressQuery.refetch(),
      ]);
    } else if (completedFetchAll) {
      await completedAllQuery.refetch();
    } else if (cancelledFetchAll) {
      await cancelledAllQuery.refetch();
    } else {
      await singleQuery.refetch();
    }
  }, [
    queryClient,
    selectedTab,
    completedFetchAll,
    cancelledFetchAll,
    singleQuery,
    waitingAcceptQuery,
    inProgressQuery,
    completedAllQuery,
    cancelledAllQuery,
  ]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    selectedTab,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
    search,
    urgencyLevel,
    vehicleType,
    dateRange,
    staffNameFilter,
  ]);

  return {
    items,
    sortedJobs: items,
    total,
    totalPages,
    page,
    pageSize,
    startIndex,
    endIndex,
    isLoading,
    isFetching,
    error: error?.message ?? null,
    refetch,
    setPage,
    setPageSize,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };
}
