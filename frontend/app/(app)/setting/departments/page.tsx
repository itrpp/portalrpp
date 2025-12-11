"use client";

import React, { useState, useEffect } from "react";
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

import DepartmentModal from "./components/DepartmentModal";

import { usePagination } from "@/app/(app)/porter/hooks/usePagination";
import {
  BuildingOfficeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { Department } from "@/types/hrd";

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // โหลดข้อมูลจาก API
  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/hrd/departments", {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.success && result.data) {
        setDepartments(result.data);
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
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Modal state
  const {
    isOpen: isDepartmentModalOpen,
    onOpen: onDepartmentModalOpen,
    onClose: onDepartmentModalClose,
  } = useDisclosure();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentDepartments,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(departments, { initialRowsPerPage: 10 });

  // Handlers
  const handleAddDepartment = () => {
    setEditingDepartment(null);
    onDepartmentModalOpen();
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    onDepartmentModalOpen();
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    const department = departments.find((d) => d.id === departmentId);

    if (
      !confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มภารกิจ "${department?.name}"?`)
    ) {
      return;
    }

    try {
      setIsDeleting(departmentId);
      const response = await fetch(`/api/hrd/departments/${departmentId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        addToast({
          title: "ลบกลุ่มภารกิจสำเร็จ",
          description: "กลุ่มภารกิจถูกลบออกจากระบบแล้ว",
          color: "success",
        });
        loadDepartments();
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบกลุ่มภารกิจได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบกลุ่มภารกิจได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveDepartment = async (
    departmentData: Omit<Department, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!departmentData.id) {
        const existingDepartment = departments.find(
          (d) => d.name.toLowerCase() === departmentData.name.toLowerCase(),
        );

        if (existingDepartment) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อกลุ่มภารกิจนี้มีอยู่ในระบบแล้ว",
            color: "danger",
          });
          throw new Error("ชื่อกลุ่มภารกิจซ้ำ");
        }
      }

      if (departmentData.id) {
        // แก้ไขกลุ่มภารกิจ
        const response = await fetch(
          `/api/hrd/departments/${departmentData.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: departmentData.name,
              active: departmentData.active,
            }),
          },
        );
        const result = await response.json();

        if (result.success) {
          addToast({
            title: "แก้ไขกลุ่มภารกิจสำเร็จ",
            description: "ข้อมูลกลุ่มภารกิจถูกอัปเดตแล้ว",
            color: "success",
          });
          loadDepartments();
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขกลุ่มภารกิจได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขกลุ่มภารกิจได้");
        }
      } else {
        // เพิ่มกลุ่มภารกิจใหม่
        const response = await fetch("/api/hrd/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: departmentData.name,
            active: departmentData.active,
          }),
        });
        const result = await response.json();

        if (result.success) {
          addToast({
            title: "เพิ่มกลุ่มภารกิจสำเร็จ",
            description: "กลุ่มภารกิจใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
          loadDepartments();
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มกลุ่มภารกิจได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มกลุ่มภารกิจได้");
        }
      }
      setEditingDepartment(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกกลุ่มภารกิจได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "ชื่อกลุ่มภารกิจ" },
    { key: "active", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
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
          onPress={handleAddDepartment}
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
          {isLoading ? (
            <div className="text-center py-8 text-default-500">
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              <Table
                removeWrapper
                aria-label="รายการกลุ่มภารกิจ"
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
                  emptyContent="ยังไม่มีข้อมูลกลุ่มภารกิจ"
                  items={currentDepartments}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={item.active ? "success" : "default"}
                          size="sm"
                          variant="flat"
                        >
                          {item.active ? "ใช้งาน" : "ไม่ใช้งาน"}
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
                            onPress={() => handleEditDepartment(item)}
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
                            onPress={() => handleDeleteDepartment(item.id)}
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
              {departments.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, departments.length)} จาก {""}
                    {departments.length} รายการ
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
      <DepartmentModal
        department={editingDepartment}
        isLoading={isSaving}
        isOpen={isDepartmentModalOpen}
        onClose={() => {
          onDepartmentModalClose();
          setEditingDepartment(null);
        }}
        onSave={handleSaveDepartment}
      />
    </div>
  );
}
