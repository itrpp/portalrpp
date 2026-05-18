import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

interface UsePorterUrlSyncParams {
  statusFilter: string | null;
  debouncedSearchQuery: string;
  dateRange: RangeValue<CalendarDate> | null;
  urgencyFilter: string;
  page: number;
}

/**
 * Sync state filters → URL query params
 * State เป็น source of truth (initial restore ผ่าน useState initializer แล้ว)
 * จึงไม่มี URL→state effect และไม่มี race condition ทับค่าที่ user กำลังพิมพ์
 */
export function usePorterUrlSync({
  statusFilter,
  debouncedSearchQuery,
  dateRange,
  urgencyFilter,
  page,
}: UsePorterUrlSyncParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString());

    if (statusFilter) params.set('status', statusFilter);
    else params.delete('status');

    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    else params.delete('search');

    if (dateRange?.start && dateRange?.end) {
      params.set('dateFrom', dateRange.start.toString());
      params.set('dateTo', dateRange.end.toString());
    } else {
      params.delete('dateFrom');
      params.delete('dateTo');
    }

    if (urgencyFilter) params.set('urgency', urgencyFilter);
    else params.delete('urgency');

    if (page > 1) params.set('page', String(page));
    else params.delete('page');

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;

    router.replace(newUrl, { scroll: false });
  }, [statusFilter, debouncedSearchQuery, dateRange, urgencyFilter, page, pathname, router]);
}
