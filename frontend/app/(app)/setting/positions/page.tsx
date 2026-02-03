"use client";

import React from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";

import { SimpleCrudModal } from "../components/SimpleCrudModal";
import { CrudTable } from "../components/CrudTable";
import { useCrudManagement } from "../hooks/useCrudManagement";

import { UserGroupIcon, PlusIcon } from "@/components/ui/icons";
import { Position } from "@/types/hrd";

export default function PositionManagementPage() {
  const {
    isLoading,
    isSaving,
    isDeleting,
    editingItem: editingPosition,
    isModalOpen,
    onModalClose,
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentPositions,
    setCurrentPage,
    setRowsPerPage,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
  } = useCrudManagement<Position>({
    apiEndpoint: "/api/hrd/positions",
    itemName: "ตำแหน่ง",
    itemNamePlural: "ตำแหน่ง",
  });

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: Position) => (
        <span className="font-mono text-sm">{item.id}</span>
      ),
    },
    {
      key: "name",
      label: "ชื่อตำแหน่ง",
      render: (item: Position) => (
        <span className="text-foreground">{item.name}</span>
      ),
    },
    {
      key: "active",
      label: "สถานะ",
      render: (item: Position) => (
        <Chip
          color={item.active ? "success" : "default"}
          size="sm"
          variant="flat"
        >
          {item.active ? "ใช้งาน" : "ไม่ใช้งาน"}
        </Chip>
      ),
    },
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
          <p className="text-default-600 mt-2">จัดการข้อมูลตำแหน่งสำหรับระบบ</p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAdd}
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
          <CrudTable
            columns={columns}
            currentPage={currentPage}
            emptyContent="ยังไม่มีข้อมูลตำแหน่ง"
            endIndex={endIndex}
            isDeleting={isDeleting}
            isLoading={isLoading}
            isSaving={isSaving}
            items={currentPositions}
            rowsPerPage={rowsPerPage}
            startIndex={startIndex}
            totalPages={totalPages}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </CardBody>
      </Card>

      {/* Modal */}
      <SimpleCrudModal
        additionalFields={({
          item,
          isLoading: isFieldLoading,
          values,
          setValue,
        }) => (
          <>
            {!item && (
              <Input
                isRequired
                classNames={{
                  input:
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                }}
                isDisabled={isFieldLoading}
                label="ID ตำแหน่ง"
                placeholder="เช่น 1"
                type="number"
                value={String(values.id || "")}
                variant="bordered"
                onChange={(e) => {
                  const idValue = e.target.value;

                  setValue(
                    "id",
                    idValue ? Number.parseInt(idValue, 10) : undefined,
                  );
                }}
              />
            )}
            <Input
              isDisabled={isFieldLoading}
              label="Position SP ID"
              placeholder="เช่น SP001 (ไม่บังคับ)"
              value={String(values.positionSpId || "")}
              variant="bordered"
              onChange={(e) =>
                setValue("positionSpId", e.target.value || undefined)
              }
            />
          </>
        )}
        isLoading={isSaving}
        isOpen={isModalOpen}
        item={editingPosition}
        itemName="ตำแหน่ง"
        itemNameFieldLabel="ชื่อตำแหน่ง"
        itemNamePlaceholder="เช่น พยาบาลวิชาชีพ"
        onClose={onModalClose}
        onSave={handleSave}
      />
    </div>
  );
}
