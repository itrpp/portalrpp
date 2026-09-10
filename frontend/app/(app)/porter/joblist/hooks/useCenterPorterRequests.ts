import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';
import { PorterJobItem } from '@/types/porter';

export interface UseCenterPorterRequestsParams {
  status?: string | null;
  page?: number;
  pageSize?: number;
  /** ค้นหาจากชื่อผู้ป่วย/HN (ส่งไป API) */
  search?: string | null;
  /** กรองความเร่งด่วน (ส่งไป API) */
  urgency_level?: string | null;
  /** ISO date YYYY-MM-DD — createdAt >= */
  created_after?: string | null;
  /** ISO date YYYY-MM-DD — createdAt <= */
  created_before?: string | null;
  /** กรองตามผู้รับมอบหมาย */
  assigned_to_id?: string | null;
  /** คืนแค่ total ไม่ส่งแถวเต็ม */
  count_only?: boolean;
}

export interface PorterRequestsResponse {
  success: boolean;
  data?: PorterJobItem[];
  total?: number;
  page?: number;
  page_size?: number;
  error_message?: string;
}

/**
 * Hook สำหรับดึงรายการคำขอแบบศูนย์เปล (ไม่กรองตามผู้แจ้ง)
 * ใช้ React Query สำหรับ caching และ deduplication — filter ทั้งหมดส่งไป API
 */
export function useCenterPorterRequests(
  params: UseCenterPorterRequestsParams,
  options?: Omit<
    UseQueryOptions<PorterRequestsResponse, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  const {
    status,
    page = 1,
    pageSize = 10,
    search,
    urgency_level,
    created_after,
    created_before,
    assigned_to_id,
    count_only,
  } = params;

  return useQuery<PorterRequestsResponse, Error>({
    queryKey: porterQueryKeys.jobs.list({
      status: status ?? undefined,
      page,
      pageSize,
      search: search?.trim() || undefined,
      urgency_level: urgency_level ?? undefined,
      dateFrom: created_after ?? undefined,
      dateTo: created_before ?? undefined,
      assigned_to_id: assigned_to_id ?? undefined,
      count_only: count_only || undefined,
    }),
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (status != null && status !== '') {
        queryParams.set('status', status);
      }
      if (search != null && search.trim() !== '') {
        queryParams.set('search', search.trim());
      }
      if (urgency_level != null && urgency_level !== '') {
        queryParams.set('urgency_level', urgency_level);
      }
      if (created_after != null && created_after !== '') {
        queryParams.set('created_after', created_after);
      }
      if (created_before != null && created_before !== '') {
        queryParams.set('created_before', created_before);
      }
      if (assigned_to_id != null && assigned_to_id !== '') {
        queryParams.set('assigned_to_id', assigned_to_id);
      }
      if (count_only) {
        queryParams.set('count_only', 'true');
      }

      const response = await fetch(`/api/porter/requests?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลรายการคำขอได้');
      }

      const result = await response.json();

      return result as PorterRequestsResponse;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}
