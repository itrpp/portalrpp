"use client";

import type { CrudItem, CrudTableProps } from "../types";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Button,
} from "@heroui/react";

import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { TABLE_STYLES } from "@/lib/tableStyles";

export type { CrudItem, CrudTableColumn, CrudTableProps } from "../types";

export function CrudTable<T extends CrudItem>({
  items,
  columns,
  isLoading,
  isSaving,
  isDeleting,
  currentPage,
  rowsPerPage,
  totalPages,
  startIndex,
  endIndex,
  onEdit,
  onDelete,
  onPageChange,
  onRowsPerPageChange,
  emptyContent = "ยังไม่มีข้อมูล",
  showActions = true,
}: CrudTableProps<T>) {
  // Add actions column if showActions is true
  const tableColumns = showActions
    ? [...columns, { key: "actions", label: "การจัดการ" }]
    : columns;

  return (
    <>
      {isLoading ? (
        <div className="text-center py-8 text-default-500">
          <p>{TABLE_STYLES.loading.content}</p>
        </div>
      ) : (
        <>
          <Table
            removeWrapper
            aria-label="รายการข้อมูล"
            classNames={{
              wrapper: TABLE_STYLES.wrapper,
              th: TABLE_STYLES.th,
              td: TABLE_STYLES.td,
              tr: TABLE_STYLES.tr,
            }}
          >
            <TableHeader columns={tableColumns}>
              {(column) => (
                <TableColumn key={column.key}>{column.label}</TableColumn>
              )}
            </TableHeader>
            <TableBody emptyContent={emptyContent} items={items}>
              {(item) => {
                const cells = columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? (
                      column.render(item)
                    ) : (
                      <span className="text-foreground">
                        {String(item[column.key] ?? "")}
                      </span>
                    )}
                  </TableCell>
                ));

                if (showActions) {
                  cells.push(
                    <TableCell key="actions">
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          aria-label="แก้ไข"
                          color="primary"
                          isDisabled={isDeleting === item.id || isSaving}
                          size="sm"
                          variant="light"
                          onPress={() => onEdit(item)}
                        >
                          <PencilIcon aria-hidden className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          aria-label="ลบ"
                          color="danger"
                          isDisabled={isDeleting === item.id}
                          isLoading={isDeleting === item.id}
                          size="sm"
                          variant="light"
                          onPress={() => onDelete(item.id)}
                        >
                          <TrashIcon aria-hidden className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>,
                  );
                }

                return <TableRow key={item.id}>{cells}</TableRow>;
              }}
            </TableBody>
          </Table>

          {/* Pagination */}
          {items.length > 0 && (
            <div className={TABLE_STYLES.pagination.containerClass}>
              <div className={TABLE_STYLES.pagination.textClass}>
                แสดง {startIndex + 1} - {Math.min(endIndex, items.length)} จาก{" "}
                {items.length} รายการ
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
                className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}
              >
                <div
                  className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}
                >
                  <label
                    className={TABLE_STYLES.pagination.labelClass}
                    htmlFor="rows-per-page"
                  >
                    แสดงต่อหน้า:
                  </label>
                  <select
                    className={TABLE_STYLES.pagination.selectClass}
                    id="rows-per-page"
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
      )}
    </>
  );
}
