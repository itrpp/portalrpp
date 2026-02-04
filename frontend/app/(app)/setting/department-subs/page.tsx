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
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";

import DepartmentSubModal from "./components/DepartmentSubModal";

import { usePagination } from "@/hooks/usePagination";
import {
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { DepartmentSub, Department } from "@/types/hrd";

export default function DepartmentSubManagementPage() {
  const [departmentSubs, setDepartmentSubs] = useState<DepartmentSub[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Modal state
  const {
    isOpen: isDepartmentSubModalOpen,
    onOpen: onDepartmentSubModalOpen,
    onClose: onDepartmentSubModalClose,
  } = useDisclosure();
  const [editingDepartmentSub, setEditingDepartmentSub] =
    useState<DepartmentSub | null>(null);
  const filteredDepartmentSubs = departmentSubs.filter((sub) =>
    selectedDepartmentId
      ? sub.departmentId === Number(selectedDepartmentId)
      : true,
  );

  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentDepartmentSubs,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(filteredDepartmentSubs, { initialRowsPerPage: 10 });

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // โหลดกลุ่มงาน
        const subsResponse = await fetch("/api/hrd/department-subs");
        const subsResult = await subsResponse.json();

        if (subsResult.success && subsResult.data) {
          setDepartmentSubs(subsResult.data);
        }

        // โหลดกลุ่มภารกิจ
        const deptsResponse = await fetch("/api/hrd/departments");
        const deptsResult = await deptsResponse.json();

        if (deptsResult.success && deptsResult.data) {
          setDepartments(deptsResult.data);
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

    loadData();
  }, []);

  // Handlers
  const handleAddDepartmentSub = () => {
    setEditingDepartmentSub(null);
    onDepartmentSubModalOpen();
  };

  const handleEditDepartmentSub = (departmentSub: DepartmentSub) => {
    setEditingDepartmentSub(departmentSub);
    onDepartmentSubModalOpen();
  };

  const handleDeleteDepartmentSub = async (departmentSubId: number) => {
    const departmentSub = departmentSubs.find((d) => d.id === departmentSubId);

    if (
      !confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มงาน "${departmentSub?.name}"?`)
    ) {
      return;
    }

    try {
      setIsDeleting(departmentSubId);
      const response = await fetch(
        `/api/hrd/department-subs/${departmentSubId}`,
        {
          method: "DELETE",
        },
      );
      const result = await response.json();

      if (result.success) {
        setDepartmentSubs((prev) =>
          prev.filter((d) => d.id !== departmentSubId),
        );
        addToast({
          title: "ลบกลุ่มงานสำเร็จ",
          description: "กลุ่มงานถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบกลุ่มงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบกลุ่มงานได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveDepartmentSub = async (
    departmentSubData: Omit<DepartmentSub, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!editingDepartmentSub) {
        const existing = departmentSubs.find(
          (d) =>
            d.name.toLowerCase() === departmentSubData.name.toLowerCase() &&
            d.departmentId === departmentSubData.departmentId,
        );

        if (existing) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อกลุ่มงานนี้มีอยู่ในกลุ่มภารกิจนี้แล้ว",
            color: "danger",
          });
          throw new Error("ชื่อกลุ่มงานซ้ำ");
        }
      }

      if (editingDepartmentSub) {
        // แก้ไขกลุ่มงาน
        const response = await fetch(
          `/api/hrd/department-subs/${editingDepartmentSub.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: departmentSubData.name,
              departmentId: departmentSubData.departmentId,
              active: departmentSubData.active,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setDepartmentSubs((prev) =>
            prev.map((d) =>
              d.id === editingDepartmentSub.id ? result.data : d,
            ),
          );
          addToast({
            title: "แก้ไขกลุ่มงานสำเร็จ",
            description: "ข้อมูลกลุ่มงานถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขกลุ่มงานได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขกลุ่มงานได้");
        }
      } else {
        // เพิ่มกลุ่มงานใหม่
        const response = await fetch("/api/hrd/department-subs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: departmentSubData.name,
            departmentId: departmentSubData.departmentId,
            active: departmentSubData.active,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setDepartmentSubs((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มกลุ่มงานสำเร็จ",
            description: "กลุ่มงานใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มกลุ่มงานได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มกลุ่มงานได้");
        }
      }
      setEditingDepartmentSub(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกกลุ่มงานได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "ชื่อกลุ่มงาน" },
    { key: "active", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BriefcaseIcon className="w-8 h-8 text-primary" />
            จัดการกลุ่มงาน
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลกลุ่มงานสำหรับระบบ
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 justify-end">
          <Autocomplete
            className="w-full md:max-w-md"
            defaultItems={departments}
            label="กรองตามกลุ่มภารกิจ"
            placeholder="ทั้งหมด"
            selectedKey={selectedDepartmentId}
            size="sm"
            variant="bordered"
            onSelectionChange={(key) => setSelectedDepartmentId(key as string)}
          >
            {(dept) => (
              <AutocompleteItem key={dept.id}>{dept.name}</AutocompleteItem>
            )}
          </Autocomplete>
          <Button
            color="primary"
            isDisabled={isLoading || isSaving}
            startContent={<PlusIcon className="w-5 h-5" />}
            onPress={handleAddDepartmentSub}
          >
            เพิ่มกลุ่มงาน
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการกลุ่มงาน
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
                aria-label="รายการกลุ่มงาน"
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
                  emptyContent="ยังไม่มีข้อมูลกลุ่มงาน"
                  items={currentDepartmentSubs}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{item.id}</span>
                      </TableCell>
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
                            onPress={() => handleEditDepartmentSub(item)}
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
                            onPress={() => handleDeleteDepartmentSub(item.id)}
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
              {departmentSubs.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, filteredDepartmentSubs.length)} จาก {""}
                    {filteredDepartmentSubs.length} รายการ
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
                        className="px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent"
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
      <DepartmentSubModal
        departmentSub={editingDepartmentSub}
        departments={departments}
        isLoading={isSaving}
        isOpen={isDepartmentSubModalOpen}
        onClose={() => {
          onDepartmentSubModalClose();
          setEditingDepartmentSub(null);
        }}
        onSave={handleSaveDepartmentSub}
      />
    </div>
  );
}
