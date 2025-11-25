import { useCallback, useMemo, useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialRowsPerPage?: number;
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {},
) {
  const { initialPage = 1, initialRowsPerPage = 10 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, items.length);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setCurrentPage: handlePageChange,
    setRowsPerPage: handleRowsPerPageChange,
  };
}
