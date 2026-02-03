"use client";

import React from "react";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";

import { SimpleCrudModal } from "../components/SimpleCrudModal";
import { CrudTable } from "../components/CrudTable";
import { useCrudManagement } from "../hooks/useCrudManagement";

import { UserGroupIcon, PlusIcon } from "@/components/ui/icons";
import { PersonType } from "@/types/hrd";

export default function PersonTypeManagementPage() {
  const {
    isLoading,
    isSaving,
    isDeleting,
    editingItem: editingPersonType,
    isModalOpen,
    onModalClose,
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentPersonTypes,
    setCurrentPage,
    setRowsPerPage,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
  } = useCrudManagement<PersonType>({
    apiEndpoint: "/api/hrd/person-types",
    itemName: "กลุ่มบุคลากร",
    itemNamePlural: "กลุ่มบุคลากร",
  });

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: PersonType) => (
        <span className="font-mono text-sm">{item.id}</span>
      ),
    },
    {
      key: "name",
      label: "ชื่อกลุ่มบุคลากร",
      render: (item: PersonType) => (
        <span className="text-foreground">{item.name}</span>
      ),
    },
    {
      key: "active",
      label: "สถานะ",
      render: (item: PersonType) => (
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
            จัดการกลุ่มบุคลากร
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลกลุ่มบุคลากรสำหรับระบบ
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAdd}
        >
          เพิ่มกลุ่มบุคลากร
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการกลุ่มบุคลากร
              </h2>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          <CrudTable
            columns={columns}
            currentPage={currentPage}
            emptyContent="ยังไม่มีข้อมูลกลุ่มบุคลากร"
            endIndex={endIndex}
            isDeleting={isDeleting}
            isLoading={isLoading}
            isSaving={isSaving}
            items={currentPersonTypes}
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
        isLoading={isSaving}
        isOpen={isModalOpen}
        item={editingPersonType}
        itemName="กลุ่มบุคลากร"
        itemNameFieldLabel="ชื่อกลุ่มบุคลากร"
        itemNamePlaceholder="เช่น กลุ่มบุคลากรทางการแพทย์"
        onClose={onModalClose}
        onSave={handleSave}
      />
    </div>
  );
}
