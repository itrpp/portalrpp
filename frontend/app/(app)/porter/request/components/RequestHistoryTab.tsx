'use client';

import { useMemo } from 'react';
import { Button, Card, CardBody, CardHeader, Pagination } from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

import { RequestHistoryFilters } from './RequestHistoryFilters';
import { RequestHistoryTable } from './RequestHistoryTable';

import { PorterEmptyState } from '@/features/porter/components/shared/PorterEmptyState';
import { CARD_STYLES } from '@/lib/cardStyles';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { getISODatePart } from '@/lib/utils';
import { PorterJobItem } from '@/types/porter';
import { ClipboardListIcon, RefreshIcon } from '@/components/ui/icons';

interface Props {
  userRequests: PorterJobItem[];
  isLoadingRequests: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  searchQuery: string;
  statusFilter: string | null;
  urgencyFilter: string;
  dateRange: RangeValue<CalendarDate> | null;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string | null) => void;
  onUrgencyChange: (urgency: string) => void;
  onDateRangeChange: (range: RangeValue<CalendarDate> | null) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onEdit: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

export function RequestHistoryTab({
  userRequests,
  isLoadingRequests,
  page,
  pageSize,
  total,
  totalPages,
  searchQuery,
  statusFilter,
  urgencyFilter,
  dateRange,
  onSearchChange,
  onStatusChange,
  onUrgencyChange,
  onDateRangeChange,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
  onRefresh,
  onEdit,
  onCancel,
}: Props) {
  // Filter client-side ตามช่วงวันที่ + ความเร่งด่วน
  const filteredUserRequests = useMemo(() => {
    const startStr = dateRange?.start?.toString();
    const endStr = dateRange?.end?.toString();

    return userRequests.filter((request) => {
      if (startStr != null && endStr != null) {
        if (!request.createdAt) return false;
        const requestDateStr = getISODatePart(request.createdAt);

        if (requestDateStr < startStr || requestDateStr > endStr) return false;
      }
      if (urgencyFilter) {
        const level = request.form?.urgencyLevel ?? 'ปกติ';

        if (level !== urgencyFilter) return false;
      }

      return true;
    });
  }, [userRequests, dateRange, urgencyFilter]);

  const hasActiveFilters = Boolean(
    (dateRange?.start && dateRange?.end) || searchQuery.trim() || urgencyFilter,
  );

  return (
    <div className="mt-[-8px]">
      <RequestHistoryFilters
        dateRange={dateRange}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        urgencyFilter={urgencyFilter}
        onClearFilters={onClearFilters}
        onDateRangeChange={onDateRangeChange}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onUrgencyChange={onUrgencyChange}
      />

      <Card className={CARD_STYLES.default}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ClipboardListIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">รายการคำขอ</h2>
            </div>
            <Button color="success" size="md" variant="flat" onPress={onRefresh}>
              <RefreshIcon className="w-5 h-5" />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          {isLoadingRequests ? (
            <div className="text-center py-8 text-default-500">
              <p>{TABLE_STYLES.loading.content}</p>
            </div>
          ) : (
            <>
              <RequestHistoryTable
                emptyContent={
                  <PorterEmptyState
                    icon={<ClipboardListIcon className="w-12 h-12" />}
                    message={
                      dateRange?.start && dateRange?.end
                        ? 'ไม่พบรายการในช่วงวันที่ที่เลือก'
                        : searchQuery.trim()
                          ? 'ไม่พบรายการที่ตรงกับคำค้นหา'
                          : urgencyFilter
                            ? 'ไม่พบรายการตามความเร่งด่วนที่เลือก'
                            : 'ยังไม่มีประวัติคำขอ'
                    }
                    variant={hasActiveFilters ? 'no-results' : 'no-data'}
                  />
                }
                isLoading={isLoadingRequests}
                items={filteredUserRequests}
                onCancel={onCancel}
                onEdit={onEdit}
              />
              {filteredUserRequests.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div
                    className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                  >
                    แสดง {filteredUserRequests.length > 0 ? 1 : 0} - {filteredUserRequests.length} จาก{' '}
                    {(dateRange?.start && dateRange?.end) || urgencyFilter
                      ? `${filteredUserRequests.length} (กรองแล้ว)`
                      : total}{' '}
                    รายการ
                  </div>
                  {!dateRange && (
                    <Pagination
                      showControls
                      color="primary"
                      initialPage={1}
                      page={page}
                      size="sm"
                      total={totalPages}
                      onChange={onPageChange}
                    />
                  )}
                  {!dateRange && (
                    <div className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}>
                      <div className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}>
                        <label
                          className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                          htmlFor="rows-per-page"
                        >
                          แสดงต่อหน้า:
                        </label>
                        <select
                          className={TABLE_STYLES.pagination.selectClass}
                          id="rows-per-page"
                          value={pageSize}
                          onChange={(e) =>
                            onPageSizeChange(Number.parseInt(e.target.value, 10))
                          }
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
