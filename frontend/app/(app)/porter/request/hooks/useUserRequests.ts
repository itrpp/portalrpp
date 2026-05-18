import { useCallback, useEffect, useRef, useState } from 'react';

import { usePorterRequests } from '../../hooks/usePorterRequests';

import { PorterJobItem } from '@/types/porter';

const DEFAULT_PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 500;

interface UseUserRequestsOptions {
  userId?: string;
  initialPage?: number;
  initialPageSize?: number;
  initialStatus?: string | null;
  initialSearch?: string;
}

/**
 * Hook สำหรับจัดการ user requests พร้อม pagination และ search
 * ใช้ React Query ภายในสำหรับ data fetching และ caching
 */
export function useUserRequests({
  userId,
  initialPage,
  initialPageSize,
  initialStatus,
  initialSearch,
}: UseUserRequestsOptions) {
  const [page, setPage] = useState(initialPage ?? 1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus ?? null);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch ?? '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(initialSearch ?? '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const {
    data: response,
    isLoading: isLoadingRequests,
    error,
    refetch,
  } = usePorterRequests({
    userId,
    page,
    pageSize,
    status: statusFilter,
    search: debouncedSearchQuery,
  });

  const userRequests: PorterJobItem[] = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Reset page เมื่อ filter เปลี่ยน — ทำใน handler เพื่อหลีกเลี่ยง render กลางคัน (React anti-pattern fix)
  const handleStatusFilterChange = useCallback((status: string | null) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const refreshUserRequests = useCallback(async () => refetch(), [refetch]);

  return {
    userRequests,
    isLoadingRequests,
    page,
    pageSize,
    total,
    totalPages,
    statusFilter,
    searchQuery,
    debouncedSearchQuery,
    handlePageChange,
    handlePageSizeChange,
    handleStatusFilterChange,
    handleSearchChange,
    refreshUserRequests,
    error,
  };
}
