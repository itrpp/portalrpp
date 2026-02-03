import { useState, useEffect, useCallback } from "react";
import { useDisclosure } from "@heroui/react";
import { addToast } from "@heroui/react";

/**
 * Generic CRUD Management Hook
 * สำหรับจัดการ state และ operations ของ CRUD pages
 */
export interface CrudItem {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface UseCrudManagementOptions<T extends CrudItem> {
  apiEndpoint: string;
  itemName: string; // ชื่อของ item เช่น "กลุ่มภารกิจ", "กลุ่มบุคลากร"
  itemNamePlural: string; // ชื่อพหูพจน์ เช่น "กลุ่มภารกิจ", "กลุ่มบุคลากร"
  onLoad?: (items: T[]) => void;
  onSave?: (item: T) => void;
  onDelete?: (itemId: number) => void;
  cacheOptions?: RequestInit["cache"];
}

export interface UseCrudManagementReturn<T extends CrudItem> {
  // State
  items: T[];
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: number | null;
  editingItem: T | null;

  // Modal state
  isModalOpen: boolean;
  onModalOpen: () => void;
  onModalClose: () => void;

  // Pagination
  currentPage: number;
  rowsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
  setCurrentPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;

  // Actions
  loadItems: () => Promise<void>;
  handleAdd: () => void;
  handleEdit: (item: T) => void;
  handleDelete: (itemId: number) => Promise<boolean>;
  handleSave: (
    itemData: Omit<T, "id" | "createdAt" | "updatedAt"> & { id?: number },
  ) => Promise<void>;
  resetEditing: () => void;
}

export function useCrudManagement<T extends CrudItem>({
  apiEndpoint,
  itemName,
  itemNamePlural: _itemNamePlural,
  onLoad,
  onSave,
  onDelete,
  cacheOptions,
}: UseCrudManagementOptions<T>): UseCrudManagementReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const {
    isOpen: isModalOpen,
    onOpen: onModalOpen,
    onClose: onModalClose,
  } = useDisclosure();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.ceil(items.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Load items
  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(apiEndpoint, {
        cache: cacheOptions,
      });
      const result = await response.json();

      if (result.success && result.data) {
        setItems(result.data);
        onLoad?.(result.data);
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถโหลดข้อมูลได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, cacheOptions, onLoad]);

  // Load on mount
  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // Handle add
  const handleAdd = useCallback(() => {
    setEditingItem(null);
    onModalOpen();
  }, [onModalOpen]);

  // Handle edit
  const handleEdit = useCallback(
    (item: T) => {
      setEditingItem(item);
      onModalOpen();
    },
    [onModalOpen],
  );

  // Handle delete
  const handleDelete = useCallback(
    async (itemId: number): Promise<boolean> => {
      const item = items.find((i) => i.id === itemId);

      if (
        !confirm(
          `คุณแน่ใจหรือไม่ว่าต้องการลบ${itemName} "${item?.name || itemId}"?`,
        )
      ) {
        return false;
      }

      try {
        setIsDeleting(itemId);
        const response = await fetch(`${apiEndpoint}/${itemId}`, {
          method: "DELETE",
        });
        const result = await response.json();

        if (result.success) {
          setItems((prev) => prev.filter((i) => i.id !== itemId));
          addToast({
            title: `ลบ${itemName}สำเร็จ`,
            description: `${itemName}ถูกลบออกจากระบบแล้ว`,
            color: "success",
          });
          onDelete?.(itemId);

          return true;
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || `ไม่สามารถลบ${itemName}ได้`,
            color: "danger",
          });

          return false;
        }
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: `ไม่สามารถลบ${itemName}ได้`,
          color: "danger",
        });

        return false;
      } finally {
        setIsDeleting(null);
      }
    },
    [apiEndpoint, itemName, items, onDelete],
  );

  // Handle save
  const handleSave = useCallback(
    async (
      itemData: Omit<T, "id" | "createdAt" | "updatedAt"> & { id?: number },
    ): Promise<void> => {
      try {
        setIsSaving(true);

        // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
        if (!editingItem) {
          const existing = items.find(
            (i) =>
              i.name.toLowerCase() === (itemData.name as string).toLowerCase(),
          );

          if (existing) {
            addToast({
              title: "เกิดข้อผิดพลาด",
              description: `ชื่อ${itemName}นี้มีอยู่ในระบบแล้ว`,
              color: "danger",
            });
            throw new Error(`ชื่อ${itemName}ซ้ำ`);
          }
        }

        if (editingItem) {
          // แก้ไข
          const response = await fetch(`${apiEndpoint}/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemData),
          });
          const result = await response.json();

          if (result.success && result.data) {
            setItems((prev) =>
              prev.map((i) => (i.id === editingItem.id ? result.data : i)),
            );
            addToast({
              title: `แก้ไข${itemName}สำเร็จ`,
              description: `ข้อมูล${itemName}ถูกอัปเดตแล้ว`,
              color: "success",
            });
            onSave?.(result.data);
            setEditingItem(null);
          } else {
            addToast({
              title: "เกิดข้อผิดพลาด",
              description: result.message || `ไม่สามารถแก้ไข${itemName}ได้`,
              color: "danger",
            });
            throw new Error(result.message || `ไม่สามารถแก้ไข${itemName}ได้`);
          }
        } else {
          // เพิ่มใหม่
          const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemData),
          });
          const result = await response.json();

          if (result.success && result.data) {
            setItems((prev) => [...prev, result.data]);
            addToast({
              title: `เพิ่ม${itemName}สำเร็จ`,
              description: `${itemName}ใหม่ถูกเพิ่มเข้าไปในระบบแล้ว`,
              color: "success",
            });
            onSave?.(result.data);
            setEditingItem(null);
          } else {
            addToast({
              title: "เกิดข้อผิดพลาด",
              description: result.message || `ไม่สามารถเพิ่ม${itemName}ได้`,
              color: "danger",
            });
            throw new Error(result.message || `ไม่สามารถเพิ่ม${itemName}ได้`);
          }
        }
      } catch (error) {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: `ไม่สามารถบันทึก${itemName}ได้`,
          color: "danger",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [apiEndpoint, itemName, items, editingItem, onSave],
  );

  // Reset editing
  const resetEditing = useCallback(() => {
    setEditingItem(null);
  }, []);

  // Close modal handler
  const handleModalClose = useCallback(() => {
    onModalClose();
    setEditingItem(null);
  }, [onModalClose]);

  return {
    // State
    items,
    isLoading,
    isSaving,
    isDeleting,
    editingItem,

    // Modal state
    isModalOpen: isModalOpen,
    onModalOpen,
    onModalClose: handleModalClose,

    // Pagination
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setCurrentPage,
    setRowsPerPage,

    // Actions
    loadItems,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
    resetEditing,
  };
}
