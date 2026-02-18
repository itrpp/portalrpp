import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '../../lib/queryKeys';

import { PorterJobItem } from '@/types/porter';

export interface UseCenterPorterRequestsParams {
  status?: string | null;
  page?: number;
  pageSize?: number;
  /** ค้นหาจากชื่อผู้ป่วย/HN (ส่งไป API = filter จากข้อมูลทั้งหมด) */
  search?: string | null;
  /** กรองความเร่งด่วน (ส่งไป API = filter จากข้อมูลทั้งหมด) */
  urgency_level?: string | null;
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
 * ใช้ React Query สำหรับ caching และ deduplication
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
  } = params;

  return useQuery<PorterRequestsResponse, Error>({
    queryKey: porterQueryKeys.jobs.list({
      status: status ?? undefined,
      page,
      pageSize,
      search: search?.trim() || undefined,
      urgency_level: urgency_level ?? undefined,
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
