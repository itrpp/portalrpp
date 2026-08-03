'use client';

import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import { useMemo } from 'react';

import { useCenterPorterRequests } from './useCenterPorterRequests';

import { PorterJobItem } from '@/types/porter';
import { getISODatePart } from '@/lib/utils';

const FETCH_ALL_SIZE = 2000;

export interface UseJobListCountsParams {
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

/**
 * Hook สำหรับดึงจำนวนรายการแต่ละ tab (รองรับ filter ทั้งหมด)
 * ใช้แสดง badge ใน tab ตลอดเวลา ไม่ว่า tab จะถูกเลือกหรือไม่
 */
export function useJobListCounts({
  search,
  urgencyLevel,
  vehicleType,
  dateRange,
  staffNameFilter,
}: UseJobListCountsParams = {}) {
  /** มี filter ที่ต้องกรอง client-side (ต้องโหลดชุดใหญ่) */
  const hasClientSideFilter =
    !!(dateRange?.start && dateRange?.end) ||
    !!(staffNameFilter?.trim()) ||
    !!(vehicleType?.trim());

  const commonParams = {
    search: search?.trim() || null,
    urgency_level: urgencyLevel || null,
  };

  const fetchSize = hasClientSideFilter ? FETCH_ALL_SIZE : 1;

  const waiting = useCenterPorterRequests({
    status: 'WAITING_CENTER',
    page: 1,
    pageSize: fetchSize,
    ...commonParams,
  });
  const waitingAccept = useCenterPorterRequests({
    status: 'WAITING_ACCEPT',
    page: 1,
    pageSize: fetchSize,
    ...commonParams,
  });
  const inProgress = useCenterPorterRequests({
    status: 'IN_PROGRESS',
    page: 1,
    pageSize: fetchSize,
    ...commonParams,
  });
  const completed = useCenterPorterRequests({
    status: 'COMPLETED',
    page: 1,
    pageSize: fetchSize,
    ...commonParams,
  });
  const cancelled = useCenterPorterRequests({
    status: 'CANCELLED',
    page: 1,
    pageSize: fetchSize,
    ...commonParams,
  });

  return useMemo(() => {
    if (hasClientSideFilter) {
      // กรอง client-side แล้วนับจำนวน
      const waitingFiltered = filterByClientSideFilters(
        waiting.data?.data ?? [],
        dateRange,
        staffNameFilter,
        vehicleType,
      );
      const waitingAcceptFiltered = filterByClientSideFilters(
        waitingAccept.data?.data ?? [],
        dateRange,
        staffNameFilter,
        vehicleType,
      );
      const inProgressFiltered = filterByClientSideFilters(
        inProgress.data?.data ?? [],
        dateRange,
        staffNameFilter,
        vehicleType,
      );
      const completedFiltered = filterByClientSideFilters(
        completed.data?.data ?? [],
        dateRange,
        staffNameFilter,
        vehicleType,
      );
      const cancelledFiltered = filterByClientSideFilters(
        cancelled.data?.data ?? [],
        dateRange,
        staffNameFilter,
        vehicleType,
      );

      return {
        waitingCount: waitingFiltered.length,
        inProgressCount:
          waitingAcceptFiltered.length + inProgressFiltered.length,
        completedCount: completedFiltered.length,
        cancelledCount: cancelledFiltered.length,
      };
    }

    // ใช้ total จาก API โดยตรง (เมื่อไม่มี client-side filter)
    return {
      waitingCount: waiting.data?.total ?? 0,
      inProgressCount:
        (waitingAccept.data?.total ?? 0) + (inProgress.data?.total ?? 0),
      completedCount: completed.data?.total ?? 0,
      cancelledCount: cancelled.data?.total ?? 0,
    };
  }, [
    hasClientSideFilter,
    waiting.data?.data,
    waiting.data?.total,
    waitingAccept.data?.data,
    waitingAccept.data?.total,
    inProgress.data?.data,
    inProgress.data?.total,
    completed.data?.data,
    completed.data?.total,
    cancelled.data?.data,
    cancelled.data?.total,
    dateRange,
    staffNameFilter,
    vehicleType,
  ]);
}
