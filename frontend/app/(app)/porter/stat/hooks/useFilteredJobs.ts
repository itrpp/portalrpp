import { useMemo } from 'react';

import { PorterJobItem } from '@/types/porter';

/**
 * เดิมกรองวันที่ฝั่ง client — ตอนนี้ jobs มาจาก API ตามช่วงวันที่แล้ว
 * คง hook ไว้ให้ charts ที่ยังเรียกใช้ได้โดยไม่ตัดข้อมูลซ้ำ
 */
export function useFilteredJobs(
  jobs: PorterJobItem[] | undefined,
  _filterState?: unknown,
): PorterJobItem[] {
  return useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    return jobs;
  }, [jobs]);
}
