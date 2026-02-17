import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '../lib/queryKeys';

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

/**
 * Hook สำหรับดึงรายการคำขอของผู้ใช้ (user requests)
 * ใช้ React Query สำหรับ caching และ deduplication
 */
export function usePorterRequests(
  params: UsePorterRequestsParams,
  options?: Omit<UseQueryOptions<PorterRequestsResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  const { userId, page = 1, pageSize = 10, status, search } = params;

  return useQuery<PorterRequestsResponse, Error>({
    queryKey: porterQueryKeys.requests.list({
      userId,
      page,
      pageSize,
      status: status ?? undefined,
      search: search?.trim() || undefined,
    }),
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

      if (status != null && status !== '') {
        queryParams.set('status', status);
      }

      if (search && search.trim() !== '') {
        queryParams.set('search', search.trim());
      }

      const response = await fetch(`/api/porter/requests?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลรายการคำขอได้');
      }

      const result = await response.json();

      return result as PorterRequestsResponse;
    },
    enabled: !!userId, // ไม่ fetch ถ้าไม่มี userId
    ...options,
  });
}
