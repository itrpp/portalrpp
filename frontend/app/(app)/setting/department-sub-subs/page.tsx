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

import DepartmentSubSubModal from "./components/DepartmentSubSubModal";

import { usePagination } from "@/app/(app)/porter/hooks/usePagination";
import {
  BuildingOfficeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { DepartmentSubSub, DepartmentSub } from "@/types/hrd";

export default function DepartmentSubSubManagementPage() {
  const [departmentSubSubs, setDepartmentSubSubs] = useState<
    DepartmentSubSub[]
  >([]);
  const [departmentSubs, setDepartmentSubs] = useState<DepartmentSub[]>([]);
  const [selectedDepartmentSubId, setSelectedDepartmentSubId] =
    useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Modal state
  const {
    isOpen: isDepartmentSubSubModalOpen,
    onOpen: onDepartmentSubSubModalOpen,
    onClose: onDepartmentSubSubModalClose,
  } = useDisclosure();
  const [editingDepartmentSubSub, setEditingDepartmentSubSub] =
    useState<DepartmentSubSub | null>(null);
  const filteredDepartmentSubSubs = departmentSubSubs.filter((subSub) =>
    selectedDepartmentSubId
      ? subSub.departmentSubId === Number(selectedDepartmentSubId)
      : true,
  );

  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentDepartmentSubSubs,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(filteredDepartmentSubSubs, { initialRowsPerPage: 10 });

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // โหลดหน่วยงาน
        const subSubsResponse = await fetch("/api/hrd/department-sub-subs");
        const subSubsResult = await subSubsResponse.json();

        if (subSubsResult.success && subSubsResult.data) {
          setDepartmentSubSubs(subSubsResult.data);
        }

        // โหลดกลุ่มงาน
        const subsResponse = await fetch("/api/hrd/department-subs");
        const subsResult = await subsResponse.json();

        if (subsResult.success && subsResult.data) {
          setDepartmentSubs(subsResult.data);
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
  const handleAddDepartmentSubSub = () => {
    setEditingDepartmentSubSub(null);
    onDepartmentSubSubModalOpen();
  };

  const handleEditDepartmentSubSub = (departmentSubSub: DepartmentSubSub) => {
    setEditingDepartmentSubSub(departmentSubSub);
    onDepartmentSubSubModalOpen();
  };

  const handleDeleteDepartmentSubSub = async (departmentSubSubId: number) => {
    const departmentSubSub = departmentSubSubs.find(
      (d) => d.id === departmentSubSubId,
    );

    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบหน่วยงาน "${departmentSubSub?.name}"?`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(departmentSubSubId);
      const response = await fetch(
        `/api/hrd/department-sub-subs/${departmentSubSubId}`,
        {
          method: "DELETE",
        },
      );
      const result = await response.json();

      if (result.success) {
        setDepartmentSubSubs((prev) =>
          prev.filter((d) => d.id !== departmentSubSubId),
        );
        addToast({
          title: "ลบหน่วยงานสำเร็จ",
          description: "หน่วยงานถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบหน่วยงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบหน่วยงานได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveDepartmentSubSub = async (
    departmentSubSubData: Omit<
      DepartmentSubSub,
      "id" | "createdAt" | "updatedAt"
    > & { id?: number },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!editingDepartmentSubSub) {
        const existing = departmentSubSubs.find(
          (d) =>
            d.name.toLowerCase() === departmentSubSubData.name.toLowerCase() &&
            d.departmentSubId === departmentSubSubData.departmentSubId,
        );

        if (existing) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อหน่วยงานนี้มีอยู่ในกลุ่มงานนี้แล้ว",
            color: "danger",
          });
          throw new Error("ชื่อหน่วยงานซ้ำ");
        }
      }

      if (editingDepartmentSubSub) {
        // แก้ไขหน่วยงาน
        const response = await fetch(
          `/api/hrd/department-sub-subs/${editingDepartmentSubSub.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: departmentSubSubData.name,
              departmentSubId: departmentSubSubData.departmentSubId,
              active: departmentSubSubData.active,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setDepartmentSubSubs((prev) =>
            prev.map((d) =>
              d.id === editingDepartmentSubSub.id ? result.data : d,
            ),
          );
          addToast({
            title: "แก้ไขหน่วยงานสำเร็จ",
            description: "ข้อมูลหน่วยงานถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขหน่วยงานได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขหน่วยงานได้");
        }
      } else {
        // เพิ่มหน่วยงานใหม่
        const response = await fetch("/api/hrd/department-sub-subs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: departmentSubSubData.name,
            departmentSubId: departmentSubSubData.departmentSubId,
            active: departmentSubSubData.active,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setDepartmentSubSubs((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มหน่วยงานสำเร็จ",
            description: "หน่วยงานใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มหน่วยงานได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มหน่วยงานได้");
        }
      }
      setEditingDepartmentSubSub(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกหน่วยงานได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "ชื่อหน่วยงาน" },
    { key: "departmentSubName", label: "กลุ่มงาน" },
    { key: "active", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-primary" />
            จัดการหน่วยงาน
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลหน่วยงานสำหรับระบบ
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 justify-end">
          <Autocomplete
            className="w-full md:max-w-md"
            defaultItems={departmentSubs}
            label="กรองตามกลุ่มงาน"
            placeholder="ทั้งหมด"
            selectedKey={selectedDepartmentSubId}
            size="sm"
            variant="bordered"
            onSelectionChange={(key) =>
              setSelectedDepartmentSubId(key as string)
            }
          >
            {(sub) => (
              <AutocompleteItem key={sub.id}>{sub.name}</AutocompleteItem>
            )}
          </Autocomplete>
          <Button
            color="primary"
            isDisabled={isLoading || isSaving}
            startContent={<PlusIcon className="w-5 h-5" />}
            onPress={handleAddDepartmentSubSub}
          >
            เพิ่มหน่วยงาน
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายการหน่วยงาน
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
                aria-label="รายการหน่วยงาน"
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
                  emptyContent="ยังไม่มีข้อมูลหน่วยงาน"
                  items={currentDepartmentSubSubs}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">
                          {item.departmentSubName || "-"}
                        </span>
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
                            onPress={() => handleEditDepartmentSubSub(item)}
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
                            onPress={() =>
                              handleDeleteDepartmentSubSub(item.id)
                            }
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
              {departmentSubSubs.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(
                      endIndex,
                      filteredDepartmentSubSubs.length,
                    )} จาก {""}
                    {filteredDepartmentSubSubs.length} รายการ
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
      <DepartmentSubSubModal
        departmentSubSub={editingDepartmentSubSub}
        departmentSubs={departmentSubs}
        isLoading={isSaving}
        isOpen={isDepartmentSubSubModalOpen}
        onClose={() => {
          onDepartmentSubSubModalClose();
          setEditingDepartmentSubSub(null);
        }}
        onSave={handleSaveDepartmentSubSub}
      />
    </div>
  );
}
