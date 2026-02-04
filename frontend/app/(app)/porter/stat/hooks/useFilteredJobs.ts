import { useMemo } from "react";

import { FilterState } from "../components/StatFilter";

import { PorterJobItem } from "@/types/porter";
import { getDateRangeFromFilter, getISODatePart } from "@/lib/utils";

/**
 * Hook สำหรับ filter jobs ตาม filterState และ cache ผลลัพธ์
 * ลดการ filter ซ้ำซ้อนระหว่าง components
 */
export function useFilteredJobs(
  jobs: PorterJobItem[] | undefined,
  filterState?: FilterState | null,
): PorterJobItem[] {
  return useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    // ถ้าไม่มี filter state ให้ return jobs ทั้งหมด
    if (!filterState) return jobs;

    const dateRange = getDateRangeFromFilter(filterState);

    // ถ้าไม่มี date range ให้ return jobs ทั้งหมด
    if (!dateRange.startDate || !dateRange.endDate) {
      return jobs;
    }

    // Filter jobs ตาม date range (ใช้ string comparison แทน Date object)
    const filtered: PorterJobItem[] = [];

    for (const job of jobs) {
      if (!job.createdAt) continue;

      // ใช้ string comparison แทน Date object (เร็วกว่า)
      const jobDateStr = getISODatePart(job.createdAt);

      if (
        jobDateStr >= dateRange.startDate &&
        jobDateStr <= dateRange.endDate
      ) {
        filtered.push(job);
      }
    }

    return filtered;
  }, [jobs, filterState]);
}
