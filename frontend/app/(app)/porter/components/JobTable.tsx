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

import {
  buildMetaChipData,
  getUrgencyStyle,
  renderStatusChip,
} from "./helpers/jobPresentation";
import { useDepartmentName } from "./helpers/useDepartmentName";

import { formatThaiDateTimeShort } from "@/lib/utils";
import { JobTableProps, PorterJobItem } from "@/types/porter";
import { formatLocationString } from "@/lib/porter";

// Component สำหรับแสดงชื่อหน่วยงาน
function DepartmentNameChip({
  departmentSubSubId,
}: {
  departmentSubSubId: number | null;
}) {
  const departmentName = useDepartmentName(departmentSubSubId);

  return (
    <Chip color="default" size="sm" variant="bordered">
      {departmentName || "-"}
    </Chip>
  );
}

// Component สำหรับแสดง meta chips
function MetaChips({ job }: { job: PorterJobItem }) {
  const departmentName = useDepartmentName(job.form.requesterDepartment);

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
  onPageChange,
  onRowsPerPageChange,
  onSelectionChange,
}: JobTableProps) {
  const columns = useMemo(() => [{ key: "job", label: "รายการ" }], []);

  return (
    <>
      <Table
        removeWrapper
        aria-label="รายการคำขอ"
        classNames={{
          thead: "hidden",
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
        <TableBody emptyContent="ไม่มีรายการคำขอในหมวดนี้" items={items}>
          {(item) => (
            <TableRow>
              <TableCell>
                <div
                  className={`w-full rounded-md border ${getUrgencyStyle(item.form.urgencyLevel).containerClass} p-3`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Chip color="success" size="sm" variant="dot">
                      {formatThaiDateTimeShort(
                        new Date(item.form.requestedDateTime),
                      )}
                    </Chip>
                    {item.form.urgencyLevel !== "ปกติ" && (
                      <Chip
                        color={
                          getUrgencyStyle(item.form.urgencyLevel).chipColor
                        }
                        size="sm"
                        variant="flat"
                      >
                        {item.form.urgencyLevel}
                      </Chip>
                    )}
                    <span className="text-default-700 font-medium">
                      {`รับผู้ป่วยจาก ${formatLocationString(item.form.pickupLocationDetail)}`}
                    </span>
                    <span className="text-default-700 font-medium">
                      ➜ {formatLocationString(item.form.deliveryLocationDetail)}
                    </span>

                    <DepartmentNameChip
                      departmentSubSubId={item.form.requesterDepartment ?? null}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div>{renderStatusChip(item)}</div>
                    <MetaChips job={item} />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {sortedJobs.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-default-600">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                className="text-sm text-default-600"
                htmlFor={paginationId}
              >
                แสดงต่อหน้า:
              </label>
              <select
                className="px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                id={paginationId}
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
