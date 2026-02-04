import type React from "react";

/**
 * รายการ CRUD ทั่วไป (id, name, active)
 */
export interface CrudItem {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

/**
 * คอลัมน์ของ CrudTable
 */
export interface CrudTableColumn<T extends CrudItem = CrudItem> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

/**
 * Props ของ CrudTable component
 */
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

/**
 * รายการ CRUD แบบง่าย (สำหรับ SimpleCrudModal)
 */
export interface SimpleCrudItem {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

/**
 * Props ของ SimpleCrudModal component
 */
export interface SimpleCrudModalProps<T extends SimpleCrudItem> {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    item: Omit<T, "id" | "createdAt" | "updatedAt"> & { id?: number },
  ) => Promise<void>;
  item?: T | null;
  isLoading?: boolean;
  itemName: string;
  itemNameFieldLabel?: string;
  itemNamePlaceholder?: string;
  useCheckboxForActive?: boolean;
  activeFieldLabel?: string;
  activeFieldDescription?: string;
  additionalFields?: (props: {
    item: T | null;
    isLoading: boolean;
    values: Record<string, unknown>;
    setValue: (key: string, value: unknown) => void;
  }) => React.ReactNode;
}
