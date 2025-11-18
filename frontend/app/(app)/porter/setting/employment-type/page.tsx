"use client";

import React, { useState, useEffect, useMemo } from "react";
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

import { EmploymentTypeModal } from "../../components";

import {
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { EmploymentType } from "@/types/porter";

// ========================================
// EMPLOYMENT TYPE MANAGEMENT PAGE
// ========================================

export default function EmploymentTypeManagementPage() {
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal state
  const {
    isOpen: isEmploymentTypeModalOpen,
    onOpen: onEmploymentTypeModalOpen,
    onClose: onEmploymentTypeModalClose,
  } = useDisclosure();
  const [editingEmploymentType, setEditingEmploymentType] =
    useState<EmploymentType | null>(null);

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadEmploymentTypes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/porter/employment-types");
        const result = await response.json();

        if (result.success && result.data) {
          setEmploymentTypes(result.data);
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description:
              result.message || "ไม่สามารถโหลดข้อมูลประเภทการจ้างได้",
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลประเภทการจ้างได้",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmploymentTypes();
  }, []);

  // Pagination
  const totalPages = Math.ceil(employmentTypes.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedEmploymentTypes = useMemo(() => {
    return employmentTypes.slice(startIndex, endIndex);
  }, [employmentTypes, startIndex, endIndex]);

  // Handlers
  const handleAddEmploymentType = () => {
    setEditingEmploymentType(null);
    onEmploymentTypeModalOpen();
  };

  const handleEditEmploymentType = (employmentType: EmploymentType) => {
    setEditingEmploymentType(employmentType);
    onEmploymentTypeModalOpen();
  };

  const handleDeleteEmploymentType = async (employmentTypeId: string) => {
    const employmentType = employmentTypes.find(
      (e) => e.id === employmentTypeId,
    );

    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบประเภทการจ้าง "${employmentType?.name}"?`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(employmentTypeId);
      const response = await fetch(
        `/api/porter/employment-types/${employmentTypeId}`,
        {
          method: "DELETE",
        },
      );
      const result = await response.json();

      if (result.success) {
        setEmploymentTypes((prev) =>
          prev.filter((e) => e.id !== employmentTypeId),
        );
        addToast({
          title: "ลบประเภทการจ้างสำเร็จ",
          description: "ประเภทการจ้างถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบประเภทการจ้างได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบประเภทการจ้างได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveEmploymentType = async (
    employmentTypeData: Omit<
      EmploymentType,
      "id" | "createdAt" | "updatedAt"
    > & { id?: string },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!editingEmploymentType) {
        const existingEmploymentType = employmentTypes.find(
          (e) => e.name.toLowerCase() === employmentTypeData.name.toLowerCase(),
        );

        if (existingEmploymentType) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว",
            color: "danger",
          });
          throw new Error("ชื่อประเภทการจ้างซ้ำ");
        }
      }

      if (editingEmploymentType) {
        // แก้ไขประเภทการจ้าง
        const response = await fetch(
          `/api/porter/employment-types/${editingEmploymentType.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: employmentTypeData.name,
              status: employmentTypeData.status,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setEmploymentTypes((prev) =>
            prev.map((e) =>
              e.id === editingEmploymentType.id ? result.data : e,
            ),
          );
          addToast({
            title: "แก้ไขประเภทการจ้างสำเร็จ",
            description: "ข้อมูลประเภทการจ้างถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขประเภทการจ้างได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขประเภทการจ้างได้");
        }
      } else {
        // เพิ่มประเภทการจ้างใหม่
        const response = await fetch("/api/porter/employment-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: employmentTypeData.name,
            status: employmentTypeData.status,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setEmploymentTypes((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มประเภทการจ้างสำเร็จ",
            description: "ประเภทการจ้างใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มประเภทการจ้างได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มประเภทการจ้างได้");
        }
      }
      setEditingEmploymentType(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกประเภทการจ้างได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "ชื่อประเภทการจ้าง" },
    { key: "status", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BriefcaseIcon className="w-8 h-8 text-primary" />
            จัดการประเภทการจ้าง
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลประเภทการจ้างสำหรับระบบ Porter
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAddEmploymentType}
        >
          เพิ่มประเภทการจ้าง
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการประเภทการจ้าง
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
                aria-label="รายการประเภทการจ้าง"
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
                  emptyContent="ยังไม่มีข้อมูลประเภทการจ้าง"
                  items={paginatedEmploymentTypes}
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
                            onPress={() => handleEditEmploymentType(item)}
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
                            onPress={() => handleDeleteEmploymentType(item.id)}
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
              {employmentTypes.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, employmentTypes.length)} จาก {""}
                    {employmentTypes.length} รายการ
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
      <EmploymentTypeModal
        employmentType={editingEmploymentType}
        isLoading={isSaving}
        isOpen={isEmploymentTypeModalOpen}
        onClose={() => {
          onEmploymentTypeModalClose();
          setEditingEmploymentType(null);
        }}
        onSave={handleSaveEmploymentType}
      />
    </div>
  );
}
