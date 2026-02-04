"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  useDisclosure,
  Chip,
  Avatar,
  addToast,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from "@heroui/react";

import { EmployeeModal, ImagePreviewModal } from "../../components";

import { usePagination } from "@/hooks/usePagination";
import {
  UserIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { EmploymentType, Position, PorterEmployee } from "@/types/porter";

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<PorterEmployee[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentEmployees,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(employees, { initialRowsPerPage: 10 });

  const {
    isOpen: isEmployeeModalOpen,
    onOpen: onEmployeeModalOpen,
    onClose: onEmployeeModalClose,
  } = useDisclosure();
  const {
    isOpen: isImagePreviewOpen,
    onOpen: onImagePreviewOpen,
    onClose: onImagePreviewClose,
  } = useDisclosure();
  const [editingEmployee, setEditingEmployee] = useState<PorterEmployee | null>(
    null,
  );

  // โหลดข้อมูล EmploymentType และ Position จาก hrd tables
  useEffect(() => {
    const loadEmploymentTypes = async () => {
      try {
        const response = await fetch("/api/hrd/person-types");
        const result = await response.json();

        if (result.success && result.data) {
          // แปลงข้อมูลจาก hrd format เป็น EmploymentType format
          const formattedData = result.data.map(
            (item: { id: number; name: string }) => ({
              id: String(item.id), // แปลง number เป็น string สำหรับ compatibility
              name: item.name,
              status: true, // hrd tables ไม่มี status field
              createdAt: undefined,
              updatedAt: undefined,
            }),
          );

          setEmploymentTypes(formattedData);
        }
      } catch {
        // Error loading employment types
      }
    };

    const loadPositions = async () => {
      try {
        const response = await fetch("/api/hrd/positions");
        const result = await response.json();

        if (result.success && result.data) {
          // แปลงข้อมูลจาก hrd format เป็น Position format
          const formattedData = result.data.map(
            (item: { id: number; name: string }) => ({
              id: String(item.id), // แปลง number เป็น string สำหรับ compatibility
              name: item.name,
              status: true, // hrd tables ไม่มี status field
              createdAt: undefined,
              updatedAt: undefined,
            }),
          );

          setPositions(formattedData);
        }
      } catch {
        // Error loading positions
      }
    };

    loadEmploymentTypes();
    loadPositions();
  }, []);

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/porter/employees");
        const result = await response.json();

        if (result.success && result.data) {
          setEmployees(result.data);
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้",
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // Handlers
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    onEmployeeModalOpen();
  };

  const handleEditEmployee = (employee: PorterEmployee) => {
    setEditingEmployee(employee);
    onEmployeeModalOpen();
  };

  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      onImagePreviewOpen();
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);

    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบเจ้าหน้าที่ "${employee?.firstName} ${employee?.lastName}"?`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(employeeId);
      const response = await fetch(`/api/porter/employees/${employeeId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
        addToast({
          title: "ลบเจ้าหน้าที่สำเร็จ",
          description: "เจ้าหน้าที่ถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบเจ้าหน้าที่ได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบเจ้าหน้าที่ได้",
        color: "danger",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveEmployee = async (
    employeeData: Omit<PorterEmployee, "id"> & { id?: string },
  ) => {
    try {
      setIsSaving(true);

      // ตรวจสอบ citizenId ซ้ำ (ยกเว้นกรณีแก้ไข) - ตรวจสอบที่ frontend ก่อน
      // แต่ backend จะตรวจสอบอีกครั้งด้วย
      if (!editingEmployee) {
        const existingEmployee = employees.find(
          (e) => e.citizenId === employeeData.citizenId,
        );

        if (existingEmployee) {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว",
            color: "danger",
          });
          throw new Error("เลขบัตรประชาชนซ้ำ");
        }
      }

      if (editingEmployee) {
        // แก้ไขเจ้าหน้าที่
        const response = await fetch(
          `/api/porter/employees/${editingEmployee.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: employeeData.firstName,
              lastName: employeeData.lastName,
              nickname: employeeData.nickname,
              profileImage: employeeData.profileImage,
              employmentTypeId: employeeData.employmentTypeId,
              positionId: employeeData.positionId,
              status: employeeData.status,
              userId: employeeData.userId,
            }),
          },
        );
        const result = await response.json();

        if (result.success && result.data) {
          setEmployees((prev) =>
            prev.map((e) => (e.id === editingEmployee.id ? result.data : e)),
          );
          addToast({
            title: "แก้ไขเจ้าหน้าที่สำเร็จ",
            description: "ข้อมูลเจ้าหน้าที่ถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขเจ้าหน้าที่ได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขเจ้าหน้าที่ได้");
        }
      } else {
        // เพิ่มเจ้าหน้าที่ใหม่
        const response = await fetch("/api/porter/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            citizenId: employeeData.citizenId,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            nickname: employeeData.nickname,
            profileImage: employeeData.profileImage,
            employmentTypeId: employeeData.employmentTypeId,
            positionId: employeeData.positionId,
            status: employeeData.status,
            userId: employeeData.userId,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setEmployees((prev) => [...prev, result.data]);
          addToast({
            title: "เพิ่มเจ้าหน้าที่สำเร็จ",
            description: "เจ้าหน้าที่ใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มเจ้าหน้าที่ได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มเจ้าหน้าที่ได้");
        }
      }
      setEditingEmployee(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกเจ้าหน้าที่ได้",
        color: "danger",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "profile", label: "รูปภาพ" },
    { key: "citizenId", label: "เลขบัตรประชาชน" },
    { key: "firstName", label: "ชื่อ" },
    { key: "lastName", label: "นามสกุล" },
    { key: "nickname", label: "ชื่อเล่น" },
    { key: "employmentType", label: "ประเภทการจ้าง" },
    { key: "position", label: "ตำแหน่ง" },
    { key: "status", label: "สถานะ" },
    { key: "actions", label: "การจัดการ" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-primary" />
            จัดการเจ้าหน้าที่เปล
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลเจ้าหน้าที่เปลสำหรับระบบ Porter
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSaving}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAddEmployee}
        >
          เพิ่มเจ้าหน้าที่
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-lg border border-default-200">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                รายชื่อเจ้าหน้าที่เปล
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
                aria-label="รายชื่อเจ้าหน้าที่เปล"
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
                  emptyContent="ยังไม่มีข้อมูลเจ้าหน้าที่"
                  items={currentEmployees}
                >
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.profileImage ? (
                          <div
                            className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleImageClick(item.profileImage!)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleImageClick(item.profileImage!);
                              }
                            }}
                          >
                            <Avatar
                              alt={`${item.firstName} ${item.lastName}`}
                              className="w-10 h-10"
                              src={item.profileImage}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-default-200 flex items-center justify-center">
                            <span className="text-default-400 text-sm font-medium">
                              {item.firstName.charAt(0)}
                              {item.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {item.citizenId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">
                          {item.firstName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">{item.lastName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-default-500">
                          {item.nickname || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Chip color="default" size="sm" variant="flat">
                          {item.employmentType}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Chip color="primary" size="sm" variant="flat">
                          {item.position}
                        </Chip>
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
                            onPress={() => handleEditEmployee(item)}
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
                            onPress={() => handleDeleteEmployee(item.id)}
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
              {employees.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-default-600">
                    แสดง {startIndex + 1} - {""}
                    {Math.min(endIndex, employees.length)} จาก {""}
                    {employees.length} รายการ
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
      <EmployeeModal
        employee={editingEmployee}
        employmentTypes={employmentTypes}
        isLoading={isSaving}
        isOpen={isEmployeeModalOpen}
        positions={positions}
        onClose={() => {
          onEmployeeModalClose();
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
      />

      {/* Modal สำหรับแสดงรูปภาพ */}
      <ImagePreviewModal
        alt="รูปภาพโปรไฟล์"
        imageUrl={selectedImage}
        isOpen={isImagePreviewOpen}
        onClose={() => {
          onImagePreviewClose();
          setSelectedImage(null);
        }}
      />
    </div>
  );
}
