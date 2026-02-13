"use client";

import React, { useMemo } from "react";
import {
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";

import { useDepartmentsMap } from "../hooks/useDepartmentsMap";

import {
  buildMetaChipData,
  getUrgencyStyle,
  renderStatusChip,
} from "./helpers/jobPresentation";
import { PORTER_TABLE_STYLES } from "./shared/tableStyles";
import { DepartmentChip } from "./shared/DepartmentChip";
import { PorterUrgencyChip } from "./shared/PorterUrgencyChip";
import { PorterEmptyState } from "./shared/PorterEmptyState";
import { PorterLoadingSkeleton } from "./shared/PorterLoadingSkeleton";

import { formatLocationString } from "@/lib/porter";
import { JobTableProps, PorterJobItem } from "@/types/porter";
import { formatThaiDateTimeShort } from "@/lib/utils";

// Component สำหรับแสดงชื่อหน่วยงาน
function DepartmentNameChip({
  departmentSubSubId,
  departmentsMap,
}: {
  departmentSubSubId: number | null;
  departmentsMap: Record<number, string> | undefined;
}) {
  const departmentName =
    departmentSubSubId && departmentsMap
      ? (departmentsMap[departmentSubSubId] ?? null)
      : null;

  return <DepartmentChip departmentName={departmentName} />;
}

// Component สำหรับแสดง meta chips
function MetaChips({
  job,
  departmentsMap,
}: {
  job: PorterJobItem;
  departmentsMap: Record<number, string> | undefined;
}) {
  const departmentName =
    job.form.requesterDepartment && departmentsMap
      ? (departmentsMap[job.form.requesterDepartment] ?? null)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-default-600">
      {buildMetaChipData(job, departmentName).map((label) => (
        <Chip key={label} size="sm" variant="flat">
          {label}
        </Chip>
      ))}
    </div>
  );
}

export default function JobTable({
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
  emptyContent = "ไม่มีรายการคำขอในหมวดนี้",
  loadingContent,
  onPageChange,
  onRowsPerPageChange,
  onSelectionChange,
}: JobTableProps) {
  const columns = useMemo(() => [{ key: "job", label: "รายการ" }], []);

  // รวบรวม department IDs ทั้งหมดจาก items เพื่อลด N+1 queries
  const departmentIds = useMemo(() => {
    const ids = new Set<number>();

    items.forEach((item) => {
      if (item.form.requesterDepartment != null) {
        ids.add(item.form.requesterDepartment);
      }
    });

    return Array.from(ids);
  }, [items]);

  // ดึง department map แบบรวม (fetch ครั้งเดียว)
  const { data: departmentsMap } = useDepartmentsMap(departmentIds);

  return (
    <>
      <Table
        removeWrapper
        aria-label="รายการคำขอ"
        classNames={{
          wrapper: PORTER_TABLE_STYLES.wrapper,
          thead: "hidden",
          td: PORTER_TABLE_STYLES.td,
          tr: PORTER_TABLE_STYLES.tr,
        }}
        selectedKeys={selectedKeys}
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      >
        <TableHeader columns={columns} style={{ display: "none" }}>
          {(column) => (
            <TableColumn key={column.key} hideHeader>
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          emptyContent={
            typeof emptyContent === "string" ? (
              <PorterEmptyState message={emptyContent} variant="no-data" />
            ) : (
              emptyContent
            )
          }
          isLoading={isLoading}
          items={items}
          loadingContent={
            loadingContent || (
              <PorterLoadingSkeleton rows={5} variant="table-row" />
            )
          }
        >
          {(item) => (
            <TableRow className={PORTER_TABLE_STYLES.loading.rowClassName}>
              <TableCell>
                <div
                  className={`w-full rounded-md border ${getUrgencyStyle(item.form.urgencyLevel).containerClass} ${PORTER_TABLE_STYLES.spacing.cellPadding.replace("py-4", "py-3")}`}
                >
                  <div
                    className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapMedium} ${PORTER_TABLE_STYLES.text.base}`}
                  >
                    <Chip color="success" size="sm" variant="dot">
                      {formatThaiDateTimeShort(
                        new Date(item.form.requestedDateTime),
                      )}
                    </Chip>
                    {item.form.urgencyLevel !== "ปกติ" && (
                      <PorterUrgencyChip
                        size="sm"
                        urgencyLevel={item.form.urgencyLevel}
                        variant="flat"
                      />
                    )}
                    <span
                      className={`${PORTER_TABLE_STYLES.colors.headerText} font-medium`}
                    >
                      {`รับผู้ป่วยจาก ${formatLocationString(item.form.pickupLocationDetail)}`}
                    </span>
                    <span
                      className={`${PORTER_TABLE_STYLES.colors.headerText} font-medium`}
                    >
                      ➜ {formatLocationString(item.form.deliveryLocationDetail)}
                    </span>

                    <DepartmentNameChip
                      departmentSubSubId={item.form.requesterDepartment ?? null}
                      departmentsMap={departmentsMap}
                    />
                  </div>

                  <div
                    className={`mt-3 flex flex-wrap items-center ${PORTER_TABLE_STYLES.spacing.gapMedium}`}
                  >
                    <div>{renderStatusChip(item)}</div>
                    <MetaChips departmentsMap={departmentsMap} job={item} />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {sortedJobs.length > 0 && (
        <div className={`flex items-center justify-between mt-4 px-2`}>
          <div
            className={`${PORTER_TABLE_STYLES.text.small} ${PORTER_TABLE_STYLES.colors.secondaryText} tabular-nums`}
          >
            แสดง {startIndex + 1} - {""}
            {Math.min(endIndex, sortedJobs.length)} จาก {""}
            {sortedJobs.length} รายการ
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
          <div
            className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapLarge}`}
          >
            <div
              className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapMedium}`}
            >
              <label
                className={`${PORTER_TABLE_STYLES.text.small} ${PORTER_TABLE_STYLES.colors.secondaryText}`}
                htmlFor={paginationId}
              >
                แสดงต่อหน้า:
              </label>
              <select
                aria-label="จำนวนแถวต่อหน้า"
                className={`px-2 py-1 ${PORTER_TABLE_STYLES.text.small} border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent`}
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
