'use client';

import type { Selection } from '@react-types/shared';
import type { PorterJobItem } from '@/types/porter';

import React from 'react';
import { Button, Card, CardBody, CardHeader } from '@heroui/react';

import { PorterJobListTable } from '../../components';

import { CARD_STYLES } from '@/lib/cardStyles';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { ClipboardListIcon, RefreshIcon } from '@/components/ui/icons';

export interface JobListTableCardProps {
  items: PorterJobItem[];
  sortedJobs: PorterJobItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  /** โหลดครั้งแรก (ไม่มีข้อมูล) — แสดง full loading */
  isLoading: boolean;
  /** กำลัง refetch — แสดง loading ที่ปุ่มรีเฟรช */
  isFetching?: boolean;
  paginationId: string;
  selectedKeys?: Selection;
  emptyContent?: React.ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectionChange?: (keys: Selection) => void;
  onRefresh: () => void;
}

/**
 * การ์ดตารางรายการคำขอรับพนักงานเปล
 * มีหัวข้อ "รายการคำขอ" + ปุ่มรีเฟรช และ CardBody แสดงสถานะโหลดหรือตาราง + pagination
 */
function JobListTableCardComponent({
  items,
  sortedJobs,
  total,
  totalPages,
  page,
  pageSize,
  startIndex,
  endIndex,
  isLoading,
  isFetching = false,
  paginationId,
  selectedKeys,
  emptyContent,
  onPageChange,
  onPageSizeChange,
  onSelectionChange,
  onRefresh,
}: JobListTableCardProps) {
  const showFullLoading = isLoading;
  const refreshButtonLoading = isLoading || isFetching;

  return (
    <Card className={CARD_STYLES.default}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">รายการคำขอ</h2>
          </div>
          <Button
            color="primary"
            isLoading={refreshButtonLoading}
            size="md"
            variant="flat"
            onPress={onRefresh}
          >
            <RefreshIcon className="w-5 h-5" />
            รีเฟรช
          </Button>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        {showFullLoading ? (
          <div className="text-center py-8 text-default-500">
            <p>{TABLE_STYLES.loading.content}</p>
          </div>
        ) : (
          <PorterJobListTable
            currentPage={page}
            emptyContent={emptyContent}
            endIndex={endIndex}
            isLoading={false}
            items={items}
            paginationId={paginationId}
            rowsPerPage={pageSize}
            selectedKeys={selectedKeys}
            sortedJobs={sortedJobs}
            startIndex={startIndex}
            totalCount={total}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onRowsPerPageChange={onPageSizeChange}
            onSelectionChange={onSelectionChange}
          />
        )}
      </CardBody>
    </Card>
  );
}

export const JobListTableCard = React.memo(JobListTableCardComponent);
