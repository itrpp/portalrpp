"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  useDisclosure,
  addToast,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
} from "@heroui/react";

import { PositionModal } from "../../components";
import { usePagination } from "../../hooks/usePagination";
import { useCrudResource } from "../hooks/useCrudResource";

import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { Position } from "@/types/porter";

export default function PositionManagementPage() {
  const {
    items: positions,
    setItems: setPositions,
    isLoading,
  } = useCrudResource<Position>("positions", {
    onError: (message) =>
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: message,
        color: "danger",
      }),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Modal state
  const {
    isOpen: isPositionModalOpen,
    onOpen: onPositionModalOpen,
    onClose: onPositionModalClose,
  } = useDisclosure();
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentPositions,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(positions, { initialRowsPerPage: 10 });

  // Handlers
  const handleAddPosition = () => {
    setEditingPosition(null);
    onPositionModalOpen();
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    onPositionModalOpen();
  };

  const handleDeletePosition = async (positionId: string) => {
    const position = positions.find((p) => p.id === positionId);

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่ง "${position?.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(positionId);
      const response = await fetch(`/api/porter/positions/${positionId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setPositions((prev) => prev.filter((p) => p.id !== positionId));
        addToast({
          title: "ลบตำแหน่งสำเร็จ",
          description: "ตำแหน่งถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบตำแหน่งได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบตำแหน่งได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSavePosition = async (
    positionData: Omit<Position, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!editingPosition) {
        const existingPosition = positions.find(
          (p) => p.name.toLowerCase() === positionData.name.toLowerCase(),
        );

        if (existingPosition) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว",
            color: "danger",
          });
          throw new Error("ชื่อตำแหน่งซ้ำ");
        }
      }

      if (editingPosition) {
        // แก้ไขตำแหน่ง
        const response = await fetch(
          `/api/porter/positions/${editingPosition.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: positionData.name,
              status: positionData.status,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setPositions((prev) =>
            prev.map((p) => (p.id === editingPosition.id ? result.data : p)),
          );
          addToast({
            title: "แก้ไขตำแหน่งสำเร็จ",
            description: "ข้อมูลตำแหน่งถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขตำแหน่งได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขตำแหน่งได้");
        }
      } else {
        // เพิ่มตำแหน่งใหม่
        const response = await fetch("/api/porter/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: positionData.name,
            status: positionData.status,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setPositions((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มตำแหน่งสำเร็จ",
            description: "ตำแหน่งใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มตำแหน่งได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มตำแหน่งได้");
        }
      }
      setEditingPosition(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกตำแหน่งได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "ชื่อตำแหน่ง" },
    { key: "status", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UserGroupIcon className="w-8 h-8 text-primary" />
            จัดการตำแหน่ง
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลตำแหน่งสำหรับระบบ Porter
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAddPosition}
        >
          เพิ่มตำแหน่ง
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการตำแหน่ง
              </h2>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          {isLoading ? (
            <div className="text-center py-8 text-default-500">
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              <Table
                removeWrapper
                aria-label="รายการตำแหน่ง"
                classNames={{
                  wrapper: "min-h-[400px]",
                }}
              >
                <TableHeader columns={columns}>
                  {(column) => (
                    <TableColumn key={column.key}>{column.label}</TableColumn>
                  )}
                </TableHeader>
                <TableBody
                  emptyContent="ยังไม่มีข้อมูลตำแหน่ง"
                  items={currentPositions}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={item.status ? "success" : "default"}
                          size="sm"
                          variant="flat"
                        >
                          {item.status ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            isIconOnly
                            color="primary"
                            isDisabled={isDeleting === item.id || isSaving}
                            size="sm"
                            variant="light"
                            onPress={() => handleEditPosition(item)}
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
                            onPress={() => handleDeletePosition(item.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {positions.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, positions.length)} จาก {""}
                    {positions.length} รายการ
                  </div>
                  <Pagination
                    showControls
                    color="primary"
                    initialPage={1}
                    page={currentPage}
                    size="sm"
                    total={totalPages}
                    onChange={setCurrentPage}
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
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
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
        </CardBody>
      </Card>

      {/* Modal */}
      <PositionModal
        isLoading={isSaving}
        isOpen={isPositionModalOpen}
        position={editingPosition}
        onClose={() => {
          onPositionModalClose();
          setEditingPosition(null);
        }}
        onSave={handleSavePosition}
      />
    </div>
  );
}
