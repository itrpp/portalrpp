import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';
import { Building } from '@/types/porter';
import { convertBuildingFromProto } from '@/lib/porter';

interface BuildingsResponse {
  success: boolean;
  data?: unknown[];
  error_message?: string;
}

/**
 * Hook สำหรับดึงรายการ buildings
 * ใช้ React Query สำหรับ caching และ deduplication
 */
export function usePorterBuildings(
  options?: Omit<UseQueryOptions<Building[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Building[], Error>({
    queryKey: porterQueryKeys.buildings.list(),
    queryFn: async () => {
      const response = await fetch('/api/porter/buildings');
      const result = (await response.json()) as BuildingsResponse;

      if (!result.success || !result.data) {
        throw new Error(result.error_message ?? 'ไม่สามารถโหลดข้อมูลอาคารได้');
      }

      const convertedBuildings = result.data.map((item: unknown) => convertBuildingFromProto(item));

      return convertedBuildings;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - buildings ไม่ค่อยเปลี่ยน
    ...options,
  });
}
