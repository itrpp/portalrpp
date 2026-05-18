import { useState } from 'react';
import { CalendarDate, parseDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

interface UseDateRangeFilterOptions {
  initialFrom?: string | null;
  initialTo?: string | null;
}

/**
 * Hook สำหรับจัดการ date range filter พร้อม restore ค่าจาก URL params
 */
export function useDateRangeFilter({ initialFrom, initialTo }: UseDateRangeFilterOptions) {
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(() => {
    if (initialFrom && initialTo) {
      try {
        return {
          start: parseDate(initialFrom),
          end: parseDate(initialTo),
        };
      } catch {
        return null;
      }
    }

    return null;
  });

  return { dateRange, setDateRange };
}
