'use client';

import type { PorterEmployee } from '@/types/porter';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  useDisclosure,
  Chip,
  Avatar,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';

import { EmployeeModal, ImagePreviewModal } from '../../components';

import { useEmployees } from './hooks/useEmployees';

import {
  UserIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@/components/ui/icons';
import { usePagination } from '@/hooks/usePagination';
import { CARD_STYLES } from '@/lib/cardStyles';
import { TABLE_STYLES } from '@/lib/tableStyles';

const COLUMNS = [
  { key: 'profile', label: 'รูปภาพ' },
  { key: 'citizenId', label: 'เลขบัตรประชาชน' },
  { key: 'firstName', label: 'ชื่อ' },
  { key: 'lastName', label: 'นามสกุล' },
  { key: 'nickname', label: 'ชื่อเล่น' },
  { key: 'employmentType', label: 'ประเภทการจ้าง' },
  { key: 'position', label: 'ตำแหน่ง' },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: 'การจัดการ' },
];

export default function EmployeeManagementPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    employmentTypes,
    positions,
    isLoading,
    isSaving,
    isDeleting,
    editingEmployee,
    setEditingEmployee,
    searchQuery,
    setSearchQuery,
    filterEmploymentTypeId,
    setFilterEmploymentTypeId,
    filterPositionId,
    setFilterPositionId,
    filterStatus,
    setFilterStatus,
    filteredEmployees,
    handleDeleteEmployee,
    handleSaveEmployee,
    clearFilters,
  } = useEmployees();

  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: currentEmployees,
    setCurrentPage,
    setRowsPerPage,
  } = usePagination(filteredEmployees, { initialRowsPerPage: 10 });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterEmploymentTypeId,
    filterPositionId,
    filterStatus,
    setCurrentPage,
  ]);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
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

      <Card className={CARD_STYLES.default}>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              <Input
                isClearable
                aria-label="ค้นหาเจ้าหน้าที่"
                className="flex-1 min-w-[200px]"
                label="ค้นหา"
                labelPlacement="outside"
                placeholder="ค้นหาด้วยชื่อ นามสกุล ชื่อเล่น หรือเลขบัตรประชาชน..."
                size="md"
                startContent={
                  <MagnifyingGlassIcon className="w-5 h-5 text-default-400" />
                }
                value={searchQuery}
                variant="bordered"
                onClear={() => setSearchQuery('')}
                onValueChange={setSearchQuery}
              />
              <Select
                aria-label="กรองตามประเภทการจ้าง"
                className="w-full sm:w-48"
                label="ประเภทการจ้าง"
                labelPlacement="outside"
                placeholder="ทั้งหมด"
                selectedKeys={
                  filterEmploymentTypeId ? [filterEmploymentTypeId] : ['all']
                }
                size="md"
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  setFilterEmploymentTypeId(
                    selected && selected !== 'all' ? selected : '',
                  );
                }}
              >
                <>
                  <SelectItem key="all">ทั้งหมด</SelectItem>
                  {employmentTypes.map((item) => (
                    <SelectItem key={item.id}>{item.name}</SelectItem>
                  ))}
                </>
              </Select>
              <Select
                aria-label="กรองตามตำแหน่ง"
                className="w-full sm:w-48"
                label="ตำแหน่ง"
                labelPlacement="outside"
                placeholder="ทั้งหมด"
                selectedKeys={filterPositionId ? [filterPositionId] : ['all']}
                size="md"
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  setFilterPositionId(
                    selected && selected !== 'all' ? selected : '',
                  );
                }}
              >
                <>
                  <SelectItem key="all">ทั้งหมด</SelectItem>
                  {positions.map((item) => (
                    <SelectItem key={item.id}>{item.name}</SelectItem>
                  ))}
                </>
              </Select>
              <Select
                aria-label="กรองตามสถานะ"
                className="w-full sm:w-48"
                label="สถานะ"
                labelPlacement="outside"
                placeholder="ทั้งหมด"
                selectedKeys={filterStatus ? [filterStatus] : ['all']}
                size="md"
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  setFilterStatus(
                    selected && selected !== 'all' ? selected : '',
                  );
                }}
              >
                <SelectItem key="all">ทั้งหมด</SelectItem>
                <SelectItem key="active">ใช้งาน</SelectItem>
                <SelectItem key="inactive">ไม่ใช้งาน</SelectItem>
              </Select>
              <Button
                color="default"
                isDisabled={
                  !searchQuery &&
                  !filterEmploymentTypeId &&
                  !filterPositionId &&
                  !filterStatus
                }
                size="md"
                variant="flat"
                onPress={clearFilters}
              >
                <XMarkIcon className="w-5 h-5" />
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className={CARD_STYLES.default}>
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
              <p>{TABLE_STYLES.loading.content}</p>
            </div>
          ) : (
            <>
              <Table
                removeWrapper
                aria-label="รายชื่อเจ้าหน้าที่เปล"
                classNames={{
                  wrapper: TABLE_STYLES.wrapper,
                  th: TABLE_STYLES.th,
                  td: TABLE_STYLES.td,
                  tr: TABLE_STYLES.tr,
                }}
              >
                <TableHeader columns={COLUMNS}>
                  {(column) => (
                    <TableColumn key={column.key}>{column.label}</TableColumn>
                  )}
                </TableHeader>
                <TableBody
                  emptyContent="ยังไม่มีข้อมูลเจ้าหน้าที่"
                  isLoading={isLoading}
                  items={currentEmployees}
                  loadingContent={TABLE_STYLES.loading.content}
                >
                  {(item) => (
                    <TableRow
                      key={item.id}
                      className={TABLE_STYLES.loading.rowClassName}
                    >
                      <TableCell>
                        {item.profileImage ? (
                          <div
                            className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleImageClick(item.profileImage!)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
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
                            <span
                              className={`${TABLE_STYLES.colors.mutedText} ${TABLE_STYLES.text.small} font-medium`}
                            >
                              {item.firstName.charAt(0)}
                              {item.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono ${TABLE_STYLES.text.base}`}
                        >
                          {item.citizenId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={TABLE_STYLES.colors.cellText}>
                          {item.firstName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={TABLE_STYLES.colors.cellText}>
                          {item.lastName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`${TABLE_STYLES.text.base} ${TABLE_STYLES.colors.secondaryText}`}
                        >
                          {item.nickname || '-'}
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
                          color={item.status ? 'success' : 'default'}
                          size="sm"
                          variant="flat"
                        >
                          {item.status ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}
                        >
                          <Button
                            isIconOnly
                            aria-label="แก้ไขเจ้าหน้าที่"
                            color="primary"
                            isDisabled={isDeleting === item.id || isSaving}
                            size="sm"
                            variant="light"
                            onPress={() => handleEditEmployee(item)}
                          >
                            <PencilIcon aria-hidden className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            aria-label="ลบเจ้าหน้าที่"
                            color="danger"
                            isDisabled={isDeleting === item.id}
                            isLoading={isDeleting === item.id}
                            size="sm"
                            variant="light"
                            onPress={() => handleDeleteEmployee(item.id)}
                          >
                            <TrashIcon aria-hidden className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {filteredEmployees.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div
                    className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                  >
                    แสดง {startIndex + 1} -{' '}
                    {Math.min(endIndex, filteredEmployees.length)} จาก{' '}
                    {filteredEmployees.length} รายการ
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
                  <div
                    className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}
                  >
                    <div
                      className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}
                    >
                      <label
                        className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                        htmlFor="rows-per-page"
                      >
                        แสดงต่อหน้า:
                      </label>
                      <select
                        className={TABLE_STYLES.pagination.selectClass}
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
