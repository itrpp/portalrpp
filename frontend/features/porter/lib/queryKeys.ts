/**
 * Query key patterns สำหรับ Porter module
 * ใช้เพื่อให้ query keys มีรูปแบบสอดคล้องกันและง่ายต่อการ invalidate
 */

export const porterQueryKeys = {
  all: ['porter'] as const,
  jobs: {
    all: ['porter', 'jobs'] as const,
    lists: () => [...porterQueryKeys.jobs.all, 'list'] as const,
    list: (params?: {
      status?: string | null;
      page?: number;
      pageSize?: number;
      search?: string;
      urgency_level?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => [...porterQueryKeys.jobs.lists(), params] as const,
    details: () => [...porterQueryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...porterQueryKeys.jobs.details(), id] as const,
  },
  requests: {
    all: ['porter', 'requests'] as const,
    lists: () => [...porterQueryKeys.requests.all, 'list'] as const,
    list: (params?: {
      userId?: string;
      page?: number;
      pageSize?: number;
      status?: string | null;
      search?: string;
    }) => [...porterQueryKeys.requests.lists(), params] as const,
    details: () => [...porterQueryKeys.requests.all, 'detail'] as const,
    detail: (id: string) => [...porterQueryKeys.requests.details(), id] as const,
  },
  departments: {
    all: ['porter', 'departments'] as const,
    lists: () => [...porterQueryKeys.departments.all, 'list'] as const,
    list: () => [...porterQueryKeys.departments.lists()] as const,
    map: () => [...porterQueryKeys.departments.all, 'map'] as const,
    details: () => [...porterQueryKeys.departments.all, 'detail'] as const,
    detail: (id: number) => [...porterQueryKeys.departments.details(), id] as const,
  },
  buildings: {
    all: ['porter', 'buildings'] as const,
    lists: () => [...porterQueryKeys.buildings.all, 'list'] as const,
    list: () => [...porterQueryKeys.buildings.lists()] as const,
  },
  stats: {
    all: ['porter', 'stats'] as const,
    overview: () => [...porterQueryKeys.stats.all, 'overview'] as const,
    employee: (employeeId?: string) =>
      [...porterQueryKeys.stats.all, 'employee', employeeId] as const,
  },
} as const;
