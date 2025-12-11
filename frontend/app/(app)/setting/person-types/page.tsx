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
} from "@heroui/react";

import PersonTypeModal from "./components/PersonTypeModal";
import { usePagination } from "@/app/(app)/porter/hooks/usePagination";

import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { PersonType } from "@/types/hrd";

export default function PersonTypeManagementPage() {
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Modal state
  const {
    isOpen: isPersonTypeModalOpen,
    onOpen: onPersonTypeModalOpen,
    onClose: onPersonTypeModalClose,
  } = useDisclosure();
  const [editingPersonType, setEditingPersonType] =
    useState<PersonType | null>(null);
  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentPersonTypes,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(personTypes, { initialRowsPerPage: 10 });

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadPersonTypes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/hrd/person-types");
        const result = await response.json();

        if (result.success && result.data) {
          setPersonTypes(result.data);
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

    loadPersonTypes();
  }, []);

  // Handlers
  const handleAddPersonType = () => {
    setEditingPersonType(null);
    onPersonTypeModalOpen();
  };

  const handleEditPersonType = (personType: PersonType) => {
    setEditingPersonType(personType);
    onPersonTypeModalOpen();
  };

  const handleDeletePersonType = async (personTypeId: number) => {
    const personType = personTypes.find((p) => p.id === personTypeId);

    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มบุคลากร "${personType?.name}"?`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(personTypeId);
      const response = await fetch(`/api/hrd/person-types/${personTypeId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setPersonTypes((prev) => prev.filter((p) => p.id !== personTypeId));
        addToast({
          title: "ลบกลุ่มบุคลากรสำเร็จ",
          description: "กลุ่มบุคลากรถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบกลุ่มบุคลากรได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบกลุ่มบุคลากรได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSavePersonType = async (
    personTypeData: Omit<PersonType, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นกรณีแก้ไข)
      if (!editingPersonType) {
        const existing = personTypes.find(
          (p) => p.name.toLowerCase() === personTypeData.name.toLowerCase(),
        );

        if (existing) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "ชื่อกลุ่มบุคลากรนี้มีอยู่ในระบบแล้ว",
            color: "danger",
          });
          throw new Error("ชื่อกลุ่มบุคลากรซ้ำ");
        }
      }

      if (editingPersonType) {
        // แก้ไขกลุ่มบุคลากร
        const response = await fetch(
          `/api/hrd/person-types/${editingPersonType.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: personTypeData.name,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setPersonTypes((prev) =>
            prev.map((p) =>
              p.id === editingPersonType.id ? result.data : p,
            ),
          );
          addToast({
            title: "แก้ไขกลุ่มบุคลากรสำเร็จ",
            description: "ข้อมูลกลุ่มบุคลากรถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขกลุ่มบุคลากรได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขกลุ่มบุคลากรได้");
        }
      } else {
        // เพิ่มกลุ่มบุคลากรใหม่
        const response = await fetch("/api/hrd/person-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: personTypeData.name,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setPersonTypes((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มกลุ่มบุคลากรสำเร็จ",
            description: "กลุ่มบุคลากรใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มกลุ่มบุคลากรได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มกลุ่มบุคลากรได้");
        }
      }
      setEditingPersonType(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกกลุ่มบุคลากรได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "ชื่อกลุ่มบุคลากร" },
    { key: "actions", label: "การจัดการ" },
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
          onPress={handleAddPersonType}
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
          {isLoading ? (
            <div className="text-center py-8 text-default-500">
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              <Table
                removeWrapper
                aria-label="รายการกลุ่มบุคลากร"
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
                  emptyContent="ยังไม่มีข้อมูลกลุ่มบุคลากร"
                  items={currentPersonTypes}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            isIconOnly
                            color="primary"
                            isDisabled={isDeleting === item.id || isSaving}
                            size="sm"
                            variant="light"
                            onPress={() => handleEditPersonType(item)}
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
                            onPress={() => handleDeletePersonType(item.id)}
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
              {personTypes.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, personTypes.length)} จาก {""}
                    {personTypes.length} รายการ
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
      <PersonTypeModal
        personType={editingPersonType}
        isLoading={isSaving}
        isOpen={isPersonTypeModalOpen}
        onClose={() => {
          onPersonTypeModalClose();
          setEditingPersonType(null);
        }}
        onSave={handleSavePersonType}
      />
    </div>
  );
}

