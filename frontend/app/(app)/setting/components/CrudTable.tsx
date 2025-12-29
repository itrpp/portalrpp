"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
  Button,
} from "@heroui/react";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";

export interface CrudItem {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface CrudTableColumn<T extends CrudItem = CrudItem> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

export interface CrudTableProps<T extends CrudItem> {
  items: T[];
  columns: CrudTableColumn<T>[];
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: number | null;
  currentPage: number;
  rowsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  onEdit: (item: T) => void;
  onDelete: (itemId: number) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  emptyContent?: string;
  showActions?: boolean;
}

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
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          <Table
            removeWrapper
            aria-label="รายการข้อมูล"
            classNames={{
              wrapper: "min-h-[400px]",
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
                          color="primary"
                          isDisabled={isDeleting === item.id || isSaving}
                          size="sm"
                          variant="light"
                          onPress={() => onEdit(item)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          color="danger"
                          isDisabled={isDeleting === item.id}
                          isLoading={isDeleting === item.id}
                          size="sm"
                          variant="light"
                          onPress={() => onDelete(item.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
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
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-default-600">
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    className="text-sm text-default-600"
                    htmlFor="rows-per-page"
                  >
                    แสดงต่อหน้า:
                  </label>
                  <select
                    className="px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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

