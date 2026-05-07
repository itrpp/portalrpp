import { useQuery, UseQueryOptions } from '@tanstack/react-query';

import { porterQueryKeys } from '@/features/porter/lib/queryKeys';

interface DepartmentsMapResponse {
  success: boolean;
  data?: Array<{
    id: number;
    name: string;
  }>;
  error_message?: string;
}

/**
 * Hook สำหรับดึงแผนที่ department (id -> name) แบบรวม
 * ใช้ React Query cache เพื่อลด N+1 queries
 */
export function useDepartmentsMap(
  departmentIds: (number | null | undefined)[],
  options?: Omit<UseQueryOptions<Record<number, string>, Error>, 'queryKey' | 'queryFn'>,
) {
  // กรองเฉพาะ IDs ที่ valid และ unique
  const validIds = Array.from(
    new Set(departmentIds.filter((id): id is number => id != null && typeof id === 'number')),
  );

  return useQuery<Record<number, string>, Error>({
    queryKey: porterQueryKeys.departments.map(),
    queryFn: async () => {
      if (validIds.length === 0) {
        return {};
      }

      // ใช้ batch endpoint เพื่อลด N+1 queries
      const idsParam = validIds.join(',');
      const response = await fetch(`/api/hrd/department-sub-subs?ids=${idsParam}`);

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลหน่วยงานได้');
      }

      const result = (await response.json()) as DepartmentsMapResponse;

      if (!result.success || !result.data) {
        return {};
      }

      // แปลง array เป็น map
      const map: Record<number, string> = {};

      for (const item of result.data) {
        map[item.id] = item.name;
      }

      return map;
    },
    enabled: validIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - department names ไม่ค่อยเปลี่ยน
    ...options,
  });
}

/**
 * Hook สำหรับดึงชื่อ department เดียว (backward compatibility)
 * ใช้ useDepartmentsMap ภายใน
 */
export function useDepartmentName(departmentSubSubId: number | null | undefined): string | null {
  const { data: departmentsMap } = useDepartmentsMap([departmentSubSubId], {
    enabled: departmentSubSubId != null,
  });

  if (!departmentSubSubId || !departmentsMap) {
    return null;
  }

  return departmentsMap[departmentSubSubId] ?? null;
}
