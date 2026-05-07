'use client';

import type { PorterJobItem } from '@/types/porter';
import type { FormattedRow } from '../../request/components/RequestHistoryTable';

import React, { useMemo } from 'react';
import {
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';

import {
  getStatusLabel,
  getStatusColor,
  getUrgencyColor,
} from '@/features/porter/components/shared/designTokens';
import { PorterEmptyState } from '@/features/porter/components/shared/PorterEmptyState';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { formatDateTimeFromString } from '@/lib/utils';
import { formatLocationString } from '@/lib/porter';
import {
  BuildingOfficeIcon,
  ClockIcon,
  UserIcon,
} from '@/components/ui/icons';

const COLUMNS = [
  { uid: 'status', name: 'สถานะงาน', align: 'center' as const },
  { uid: 'urgency', name: 'ความเร่งด่วน', align: 'center' as const },
  { uid: 'patient', name: 'ข้อมูลผู้ป่วย' },
  { uid: 'staff', name: 'ข้อมูลผู้ปฏิบัติงาน' },
];

function PorterJobListTableComponent({
  items,
  sortedJobs,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  rowsPerPage,
  paginationId,
  selectedKeys,
  isLoading = false,
  emptyContent = 'ไม่มีรายการคำขอในหมวดนี้',
  loadingContent,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onSelectionChange,
}: import('@/types/porter').PorterJobListTableProps) {
  const displayTotal = totalCount ?? sortedJobs.length;

  const formattedData = useMemo(() => {
    return items.map((item: PorterJobItem) => ({
      id: item.id,
      pickUpStr: formatLocationString(item.form.pickupLocationDetail),
      deliveryStr: formatLocationString(item.form.deliveryLocationDetail),
      pickupAt: item.pickupAt ? formatDateTimeFromString(String(item.pickupAt)) : null,
      deliveryAt: item.deliveryAt ? formatDateTimeFromString(String(item.deliveryAt)) : null,
      createdAt: item.createdAt ? formatDateTimeFromString(String(item.createdAt)) : null,
      acceptedAt: item.acceptedAt ? formatDateTimeFromString(String(item.acceptedAt)) : null,
      assignedAt: item.assignedAt ? formatDateTimeFromString(String(item.assignedAt)) : null,
      requestedDateTime: item.form.requestedDateTime
        ? formatDateTimeFromString(String(item.form.requestedDateTime))
        : null,
    }));
  }, [items]);

  const formattedDataMap = useMemo(() => {
    return new Map(formattedData.map((data) => [data.id, data]));
  }, [formattedData]);

  const resolvedEmptyContent = useMemo(
    () =>
      typeof emptyContent === 'string' ? (
        <PorterEmptyState message={emptyContent} variant="no-data" />
      ) : (
        emptyContent
      ),
    [emptyContent],
  );

  return (
    <>
      <div className="overflow-x-auto">
        <Table
          removeWrapper
          aria-label="รายการคำขอ"
          classNames={{
            base: 'min-w-max',
            wrapper: TABLE_STYLES.wrapper,
            th: TABLE_STYLES.th,
            td: TABLE_STYLES.td,
            tr: TABLE_STYLES.tr,
          }}
          selectedKeys={selectedKeys}
          selectionMode="single"
          onSelectionChange={onSelectionChange}
        >
          <TableHeader columns={COLUMNS}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={'align' in column ? column.align : 'start'}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={resolvedEmptyContent}
            isLoading={isLoading}
            items={items}
            loadingContent={loadingContent ?? TABLE_STYLES.loading.content}
          >
            {isLoading
              ? []
              : items.map((item) => {
                  const formatted = formattedDataMap.get(item.id) as
                    | FormattedRow
                    | undefined;
                  const pickUpStr = formatted?.pickUpStr ?? '-';
                  const deliveryStr = formatted?.deliveryStr ?? '-';
                  const rowKey = String(item.id);

                  return (
                    <TableRow
                      key={rowKey}
                      className={TABLE_STYLES.loading.rowClassName}
                    >
                      <TableCell>
                        <div
                          className={`flex items-center justify-center ${TABLE_STYLES.spacing.gapSmall}`}
                        >
                          <Chip
                            classNames={{ base: 'rounded-full' }}
                            color={getStatusColor(item.status)}
                            size="md"
                            variant="bordered"
                          >
                            {getStatusLabel(item.status)}
                          </Chip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center justify-center ${TABLE_STYLES.spacing.gapSmall}`}
                        >
                          <Chip
                            classNames={{ base: 'rounded-full' }}
                            color={getUrgencyColor(item.form.urgencyLevel ?? '')}
                            size="md"
                            variant="dot"
                          >
                            {item.form.urgencyLevel || 'ปกติ'}
                          </Chip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex flex-col ${TABLE_STYLES.spacing.gapMedium}`}
                        >
                          <div
                            className={`${TABLE_STYLES.text.base} font-semibold text-primary`}
                          >
                            {item.form.patientHN || '-'}
                            {item.form.patientName
                              ? ` · ${item.form.patientName}`
                              : ''}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div
                              className={`flex items-center ${TABLE_STYLES.spacing.gapSmall} whitespace-nowrap`}
                            >
                              <BuildingOfficeIcon
                                className="shrink-0 text-default-500"
                                size={16}
                              />
                              <span
                                className={`shrink-0 ${TABLE_STYLES.colors.secondaryText}`}
                              >
                                รับ :{' '}
                              </span>
                              <span className={TABLE_STYLES.colors.cellText}>
                                {pickUpStr || '-'}
                              </span>
                              <div className="ml-2 flex items-center shrink-0">
                                <ClockIcon
                                  className="shrink-0 text-default-500"
                                  size={14}
                                />
                                <span className="font-semibold text-success-700">
                                  {formatted?.pickupAt || ''}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`flex items-center ${TABLE_STYLES.spacing.gapSmall} whitespace-nowrap`}
                            >
                              <BuildingOfficeIcon
                                className="shrink-0 text-default-500"
                                size={16}
                              />
                              <span
                                className={`shrink-0 ${TABLE_STYLES.colors.secondaryText}`}
                              >
                                ส่ง :
                              </span>
                              <span className={TABLE_STYLES.colors.cellText}>
                                {deliveryStr || '-'}
                              </span>
                              <div className="ml-2 flex items-center shrink-0">
                                <ClockIcon
                                  className="shrink-0 text-default-500"
                                  size={14}
                                />
                                <span className="font-semibold text-success-700">
                                  {formatted?.deliveryAt || ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex flex-col ${TABLE_STYLES.spacing.gapMedium} ${TABLE_STYLES.text.small}`}
                        >
                          <div
                            className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}
                          >
                            <UserIcon
                              className="shrink-0 text-default-500"
                              size={16}
                            />
                            <span className={TABLE_STYLES.colors.secondaryText}>
                              เวลานัดหมาย
                            </span>
                            <ClockIcon
                              className="shrink-0 text-default-500"
                              size={14}
                            />
                            <span className="font-semibold text-success-700">
                              {formatted?.requestedDateTime || '-'}
                            </span>
                          </div>
                          <div
                            className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}
                          >
                            <UserIcon
                              className="shrink-0 text-default-500"
                              size={16}
                            />
                            <span className={TABLE_STYLES.colors.secondaryText}>
                              ศูนย์เปลมอบหมายงาน
                            </span>
                            <ClockIcon
                              className="shrink-0 text-default-500"
                              size={14}
                            />
                            <span className="font-semibold text-success-700">
                              {formatted?.acceptedAt || '-'}
                            </span>
                          </div>
                          <div
                            className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}
                          >
                            <UserIcon
                              className="shrink-0 text-default-500"
                              size={16}
                            />
                            <span className={TABLE_STYLES.colors.secondaryText}>
                              เจ้าหน้าที่เปล
                            </span>
                            <span className={TABLE_STYLES.colors.cellText}>
                              {item.assignedToName || '-'}
                            </span>
                            <ClockIcon
                              className="shrink-0 text-default-500"
                              size={14}
                            />
                            <span className="font-semibold text-success-700">
                              {formatted?.assignedAt || ''}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {displayTotal > 0 && (
        <div className={TABLE_STYLES.pagination.containerClass}>
          <div
            className={`${TABLE_STYLES.pagination.textClass} tabular-nums`}
          >
            แสดง {startIndex + 1} - {Math.min(endIndex, displayTotal)} จาก{' '}
            {displayTotal} รายการ
          </div>
          <Pagination
            showControls
            color="primary"
            initialPage={1}
            page={currentPage}
            size="sm"
            total={totalPages}
            onChange={onPageChange}
          />
          <div className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}>
            <div
              className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}
            >
              <label
                className={TABLE_STYLES.pagination.labelClass}
                htmlFor={paginationId}
              >
                แสดงต่อหน้า:
              </label>
              <select
                aria-label="จำนวนแถวต่อหน้า"
                className={TABLE_STYLES.pagination.selectClass}
                id={paginationId}
                name="rows-per-page"
                value={rowsPerPage}
                onChange={(e) => {
                  onRowsPerPageChange(Number(e.target.value));
                  onPageChange(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(PorterJobListTableComponent);
