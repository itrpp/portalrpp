"use client";

import React from "react";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";

import { SimpleCrudModal } from "../components/SimpleCrudModal";
import { CrudTable } from "../components/CrudTable";
import { useCrudManagement } from "../hooks/useCrudManagement";

import {
  BuildingOfficeIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { Department } from "@/types/hrd";

export default function DepartmentManagementPage() {
  const {
    items: departments,
    isLoading,
    isSaving,
    isDeleting,
    editingItem: editingDepartment,
    isModalOpen,
    onModalOpen,
    onModalClose,
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentDepartments,
    setCurrentPage,
    setRowsPerPage,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
  } = useCrudManagement<Department>({
    apiEndpoint: "/api/hrd/departments",
    itemName: "กลุ่มภารกิจ",
    itemNamePlural: "กลุ่มภารกิจ",
    cacheOptions: "no-store",
  });

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: Department) => (
        <span className="font-mono text-sm">{item.id}</span>
      ),
    },
    {
      key: "name",
      label: "ชื่อกลุ่มภารกิจ",
      render: (item: Department) => (
        <span className="text-foreground">{item.name}</span>
      ),
    },
    {
      key: "active",
      label: "สถานะ",
      render: (item: Department) => (
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
            <BuildingOfficeIcon className="w-8 h-8 text-primary" />
            จัดการกลุ่มภารกิจ
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลกลุ่มภารกิจสำหรับระบบ
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAdd}
        >
          เพิ่มกลุ่มภารกิจ
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการกลุ่มภารกิจ
              </h2>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-4">
          <CrudTable
            items={currentDepartments}
            columns={columns}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            emptyContent="ยังไม่มีข้อมูลกลุ่มภารกิจ"
          />
        </CardBody>
      </Card>

      {/* Modal */}
      <SimpleCrudModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSave={handleSave}
        item={editingDepartment}
        isLoading={isSaving}
        itemName="กลุ่มภารกิจ"
        itemNameFieldLabel="ชื่อกลุ่มภารกิจ"
        itemNamePlaceholder="เช่น กลุ่มภารกิจการพยาบาล"
        useCheckboxForActive
        activeFieldLabel="สถานะการใช้งาน"
        activeFieldDescription="เปิดใช้งานเมื่อต้องการให้กลุ่มภารกิจนี้สามารถเลือกใช้ได้"
      />
    </div>
  );
}
