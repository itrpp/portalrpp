import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from '@react-types/shared';

import { getLocalTimeZone, today } from '@internationalized/date';

/** จำนวนวันในช่วงเริ่มต้น (วันนี้รวมด้วย = 7 วัน) */
export const JOB_LIST_DEFAULT_RANGE_DAYS = 7;

/** ช่วงวันที่สูงสุดที่อนุญาต (รวมวันเริ่มและวันจบ) */
export const JOB_LIST_MAX_RANGE_DAYS = 90;

export function getDefaultJobListDateRange(): RangeValue<CalendarDate> {
  const end = today(getLocalTimeZone());
  const start = end.subtract({ days: JOB_LIST_DEFAULT_RANGE_DAYS - 1 });

  return { start, end };
}

/** คืนช่วงที่ clamp ไม่เกิน MAX วัน (ตัดวันเริ่มให้อยู่ในเพดาน) */
export function clampJobListDateRange(
  range: RangeValue<CalendarDate> | null,
): RangeValue<CalendarDate> | null {
  if (!range?.start || !range?.end) return range;

  const maxStart = range.end.subtract({ days: JOB_LIST_MAX_RANGE_DAYS - 1 });

  if (range.start.compare(maxStart) < 0) {
    return { start: maxStart, end: range.end };
  }

  return range;
}

export function dateRangeToApiBounds(
  range: RangeValue<CalendarDate> | null | undefined,
): { created_after: string | null; created_before: string | null } {
  if (!range?.start || !range?.end) {
    return { created_after: null, created_before: null };
  }

  return {
    created_after: range.start.toString(),
    created_before: range.end.toString(),
  };
}
