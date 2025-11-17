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

import { formatThaiDateTimeShort } from "@/lib/utils";
import { JobTableProps } from "@/types/porter";

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
            <TableRow key={item.id}>
              <TableCell>
                <div
                  className={`w-full rounded-md border ${
                    item.form.urgencyLevel === "ฉุกเฉิน"
                      ? "bg-danger-50/30 border-danger-200"
                      : item.form.urgencyLevel === "ด่วน"
                        ? "bg-warning-50/30 border-warning-200"
                        : "bg-content1 border-default-200"
                  } p-3`}
                >
                  {/* แถวบน: เวลาและแถบ tags หลัก */}
                  <div className="flex items-center gap-2 text-sm">
                    <Chip color="success" size="sm" variant="dot">
                      {formatThaiDateTimeShort(
                        new Date(item.form.requestedDateTime),
                      )}
                    </Chip>
                    {item.form.urgencyLevel !== "ปกติ" && (
                      <Chip
                        color={
                          item.form.urgencyLevel === "ฉุกเฉิน"
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                        variant="flat"
                      >
                        {item.form.urgencyLevel}
                      </Chip>
                    )}
                    <span className="text-default-700 font-medium">
                      {`รับผู้ป่วยจาก ${item.form.pickupLocation}`}
                    </span>
                    <span className="text-default-700 font-medium">
                      ➜ {item.form.deliveryLocation}
                    </span>

                    <Chip color="default" size="sm" variant="bordered">
                      {item.form.requesterDepartment}
                    </Chip>
                  </div>

                  {/* แถวล่าง: สถานะ + ปุ่มการจัดการ */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div>
                      {item.status === "in-progress" && (
                        <Chip color="warning" size="sm" variant="flat">
                          {item.assignedTo
                            ? `กำลังดำเนินการ [ID: ${item.assignedTo}]`
                            : "กำลังดำเนินการ"}
                        </Chip>
                      )}
                      {item.status === "completed" && (
                        <Chip color="success" size="sm" variant="flat">
                          เสร็จสิ้น
                        </Chip>
                      )}
                      {item.status === "cancelled" && (
                        <Chip color="danger" size="sm" variant="flat">
                          {item.assignedTo
                            ? `ยกเลิก [ID: ${item.assignedTo}]`
                            : "ยกเลิก"}
                        </Chip>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-600">
                      <Chip size="sm" variant="flat">
                        {item.form.requesterDepartment}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        {item.form.vehicleType}
                      </Chip>
                      {item.form.hasVehicle && (
                        <Chip size="sm" variant="flat">
                          {`มีรถแล้ว: ${item.form.hasVehicle}`}
                        </Chip>
                      )}
                      {item.form.returnTrip && (
                        <Chip size="sm" variant="flat">
                          {item.form.returnTrip}
                        </Chip>
                      )}
                      {item.form.equipment.length > 0 && (
                        <Chip color="warning" size="sm" variant="flat">
                          {`อุปกรณ์ ${item.form.equipment.length} รายการ`}
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
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
