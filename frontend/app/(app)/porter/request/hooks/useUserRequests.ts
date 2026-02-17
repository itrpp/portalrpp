import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { usePorterRequests } from '../../hooks/usePorterRequests';
import { porterQueryKeys } from '../../lib/queryKeys';

import { PorterJobItem } from '@/types/porter';

const DEFAULT_PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 500;

interface UseUserRequestsOptions {
  userId?: string;
}

/**
 * Hook สำหรับจัดการ user requests พร้อม pagination และ search
 * ใช้ React Query ภายในสำหรับ data fetching และ caching
 */
export function useUserRequests({ userId }: UseUserRequestsOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Reset page to 1 when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearchQuery]);

  // Use React Query hook for data fetching
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

  // Extract data from response
  const userRequests: PorterJobItem[] = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleStatusFilterChange = useCallback((status: string | null) => {
    setStatusFilter(status);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
  }, []);

  const refreshUserRequests = useCallback(async () => {
    // Invalidate queries เพื่อให้ refetch
    await queryClient.invalidateQueries({
      queryKey: porterQueryKeys.requests.list({
        userId,
        page,
        pageSize,
        status: statusFilter ?? undefined,
        search: debouncedSearchQuery || undefined,
      }),
    });

    return refetch();
  }, [queryClient, userId, page, pageSize, statusFilter, debouncedSearchQuery, refetch]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    userRequests,
    isLoadingRequests,
    page,
    pageSize,
    total,
    totalPages,
    statusFilter,
    searchQuery,
    setPage,
    setPageSize,
    handlePageChange,
    handlePageSizeChange,
    handleStatusFilterChange,
    handleSearchChange,
    refreshUserRequests,
    error,
  };
}
