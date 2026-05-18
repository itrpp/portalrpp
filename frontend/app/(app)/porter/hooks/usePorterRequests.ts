import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';
import { PorterJobItem } from '@/types/porter';

interface UsePorterRequestsParams {
  userId?: string;
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string;
}

interface PorterRequestsResponse {
  success: boolean;
  data?: PorterJobItem[];
  total?: number;
  page?: number;
  page_size?: number;
  error_message?: string;
}

/** Normalize ค่า filter — รวม logic ครั้งเดียวเพื่อให้ queryKey และ queryFn ตรงกันแน่นอน */
function normalizeFilters(params: UsePorterRequestsParams) {
  const status = params.status?.trim() || undefined;
  const search = params.search?.trim() || undefined;

  return {
    userId: params.userId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    status,
    search,
  };
}

/**
 * Hook สำหรับดึงรายการคำขอของผู้ใช้ (user requests)
 * ใช้ React Query สำหรับ caching และ deduplication
 */
export function usePorterRequests(
  params: UsePorterRequestsParams,
  options?: Omit<UseQueryOptions<PorterRequestsResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  const normalized = normalizeFilters(params);
  const { userId, page, pageSize, status, search } = normalized;

  return useQuery<PorterRequestsResponse, Error>({
    queryKey: porterQueryKeys.requests.list(normalized),
    queryFn: async () => {
      if (!userId) {
        return {
          success: true,
          data: [],
          total: 0,
          page: 1,
          page_size: pageSize,
        };
      }

      const queryParams = new URLSearchParams({
        requester_user_id: userId,
        page: String(page),
        page_size: String(pageSize),
      });

      if (status) queryParams.set('status', status);
      if (search) queryParams.set('search', search);

      const response = await fetch(`/api/porter/requests?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลรายการคำขอได้');
      }

      return (await response.json()) as PorterRequestsResponse;
    },
    enabled: !!userId,
    staleTime: 30_000,
    ...options,
  });
}
