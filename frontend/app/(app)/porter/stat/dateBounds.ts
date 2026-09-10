import { getLocalTimeZone, today, CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import { getDateRangeFromFilter, toISODateString } from '@/lib/utils';

/** จำนวนวันในช่วงเริ่มต้น */
export const STAT_DEFAULT_LOOKBACK_DAYS = 30;

/** ช่วงวันที่สูงสุดที่อนุญาต (รวมวันเริ่มและวันจบ) */
export const STAT_MAX_RANGE_DAYS = 90;

export type StatFilterMode = 'date-range' | 'month' | 'fiscal-year';

/** รูปทรง filter สำหรับ resolve ช่วงวันที่ (ไม่ import จาก StatFilter เพื่อเลี่ยง circular) */
export interface StatDateFilterInput {
  mode: StatFilterMode;
  dateRange?: RangeValue<CalendarDate>;
  month?: number;
  year?: number;
  fiscalYear?: number;
}

export function getDefaultStatFilterState(): StatDateFilterInput {
  const end = today(getLocalTimeZone());
  const start = end.subtract({ days: STAT_DEFAULT_LOOKBACK_DAYS });

  return {
    mode: 'date-range',
    dateRange: { start, end },
  };
}

function daysInclusive(startStr: string, endStr: string): number {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const ms = end.getTime() - start.getTime();

  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function clampStartToMaxRange(
  startStr: string,
  endStr: string,
): { startDate: string; endDate: string; clamped: boolean } {
  const span = daysInclusive(startStr, endStr);

  if (span <= STAT_MAX_RANGE_DAYS) {
    return { startDate: startStr, endDate: endStr, clamped: false };
  }

  const end = new Date(`${endStr}T00:00:00`);
  const start = new Date(end);

  start.setDate(start.getDate() - (STAT_MAX_RANGE_DAYS - 1));

  return {
    startDate: toISODateString(start),
    endDate: endStr,
    clamped: true,
  };
}

/**
 * แปลง filter → created_after / created_before (YYYY-MM-DD)
 * มี default 30 วัน และ clamp สูงสุด 90 วัน
 */
export function resolveStatDateBounds(
  filterState: StatDateFilterInput | null | undefined,
): {
  created_after: string;
  created_before: string;
  clamped: boolean;
} {
  const fromFilter = filterState
    ? getDateRangeFromFilter(filterState)
    : ({} as { startDate?: string; endDate?: string });

  let startDate = fromFilter.startDate;
  let endDate = fromFilter.endDate;

  if (!startDate || !endDate) {
    const fallback = getDefaultStatFilterState();
    const range = getDateRangeFromFilter(fallback);

    startDate = range.startDate!;
    endDate = range.endDate!;
  }

  const clamped = clampStartToMaxRange(startDate, endDate);

  return {
    created_after: clamped.startDate,
    created_before: clamped.endDate,
    clamped: clamped.clamped,
  };
}

/** รายการวันที่ YYYY-MM-DD จาก start ถึง end (inclusive) */
export function eachDateInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(toISODateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
