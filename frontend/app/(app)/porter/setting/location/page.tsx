'use client';

import type { Building, FloorDepartment } from '@/types/porter';

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  ScrollShadow,
  useDisclosure,
} from '@heroui/react';

import { BuildingModal, FloorDepartmentModal } from './components';
import { useBuildings } from './hooks/useBuildings';

import { EmptyState } from '@/components/ui/EmptyState';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from '@/components/ui/icons';
import { CARD_STYLES } from '@/lib/cardStyles';
import { LOADING_MESSAGES } from '@/lib/constants';
import { getDepartmentTypeName } from '@/lib/porter';

export default function LocationSettingsPage() {
  const {
    isOpen: isBuildingModalOpen,
    onOpen: onBuildingModalOpen,
    onClose: onBuildingModalClose,
  } = useDisclosure();
  const {
    isOpen: isFloorModalOpen,
    onOpen: onFloorModalOpen,
    onClose: onFloorModalClose,
  } = useDisclosure();

  const {
    buildings,
    isLoading,
    isSavingBuilding,
    isDeletingBuilding,
    isSavingFloor,
    isDeletingFloor,
    selectedBuilding,
    selectedBuildingId,
    editingBuilding,
    setEditingBuilding,
    editingFloor,
    setEditingFloor,
    handleEditBuilding,
    handleDeleteBuilding,
    handleSaveBuilding,
    handleSelectBuilding,
    handleAddFloor,
    handleEditFloor,
    handleDeleteFloor,
    handleSaveFloor,
  } = useBuildings();

  const handleAddBuilding = () => {
    setEditingBuilding(null);
    onBuildingModalOpen();
  };

  const handleEditBuildingClick = async (building: Building) => {
    await handleEditBuilding(building);
    onBuildingModalOpen();
  };

  const handleAddFloorClick = () => {
    if (selectedBuilding) {
      handleAddFloor(selectedBuilding);
      onFloorModalOpen();
    }
  };

  const handleEditFloorClick = (floor: FloorDepartment) => {
    if (selectedBuilding) {
      handleEditFloor(selectedBuilding, floor);
      onFloorModalOpen();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MapPinIcon className="w-8 h-8 text-primary" />
            ตั้งค่าสถานที่รับ - ส่ง
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลอาคาร, คลีนิก/หอผู้ป่วย, และห้อง/เตียงสำหรับระบบ Porter
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSavingBuilding}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAddBuilding}
        >
          เพิ่มอาคาร
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={CARD_STYLES.default}>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  รายการอาคาร
                </h2>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {isLoading ? (
              <div className="text-center py-8 text-default-500">
                <p>{LOADING_MESSAGES.table}</p>
              </div>
            ) : (
              <ScrollShadow className="h-[600px]">
                <div className="space-y-2 pb-2">
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      className={`cursor-pointer transition-all border rounded-lg ${
                        selectedBuildingId === building.id
                          ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                          : 'border-default-200 hover:border-primary-300'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectBuilding(building)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectBuilding(building);
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <BuildingOfficeIcon
                                className={`w-5 h-5 ${
                                  selectedBuildingId === building.id
                                    ? 'text-primary'
                                    : 'text-default-500'
                                }`}
                              />
                              <span
                                className={`font-medium ${
                                  selectedBuildingId === building.id
                                    ? 'text-primary'
                                    : 'text-foreground'
                                }`}
                              >
                                {building.name}
                              </span>
                              <Chip
                                color={building.status ? 'success' : 'default'}
                                size="sm"
                                variant="flat"
                              >
                                {building.status ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                              </Chip>
                            </div>
                          </div>
                          <div className="flex gap-1" role="group">
                            <Button
                              isIconOnly
                              color="primary"
                              isDisabled={
                                isDeletingBuilding === building.id ||
                                isSavingBuilding
                              }
                              size="sm"
                              variant="light"
                              onPress={() =>
                                handleEditBuildingClick(building)
                              }
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              isIconOnly
                              color="danger"
                              isDisabled={isDeletingBuilding === building.id}
                              isLoading={isDeletingBuilding === building.id}
                              size="sm"
                              variant="light"
                              onPress={() =>
                                handleDeleteBuilding(building.id)
                              }
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {buildings.length === 0 && (
                    <EmptyState
                      compact
                      description='คลิกปุ่ม "เพิ่มอาคาร" เพื่อเพิ่มข้อมูล'
                      icon={
                        <BuildingOfficeIcon className="w-12 h-12 opacity-50" />
                      }
                      message="ยังไม่มีข้อมูลอาคาร"
                      variant="no-data"
                    />
                  )}
                </div>
              </ScrollShadow>
            )}
          </CardBody>
        </Card>

        <Card className={CARD_STYLES.default}>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedBuilding
                    ? 'รายการ คลีนิก/หอผู้ป่วย'
                    : 'เลือกอาคาร'}
                </h2>
                {selectedBuilding && (
                  <Chip color="secondary" size="sm" variant="flat">
                    {selectedBuilding.floors.reduce((total, floor) => {
                      if (floor.departmentType === 2) {
                        const roomCount = floor.roomCount || 0;
                        const bedCount = floor.bedCount || 0;

                        return total + roomCount + bedCount;
                      }

                      return total;
                    }, 0)}{' '}
                    เตียง
                  </Chip>
                )}
              </div>
              {selectedBuilding && (
                <Button
                  color="success"
                  isDisabled={
                    isSavingFloor || isDeletingFloor !== null
                  }
                  size="sm"
                  startContent={<PlusIcon className="w-4 h-4" />}
                  variant="flat"
                  onPress={handleAddFloorClick}
                >
                  เพิ่มคลีนิก/หอผู้ป่วย
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {selectedBuilding ? (
              <ScrollShadow className="h-[600px]">
                <div className="space-y-2 pb-2">
                  {[...selectedBuilding.floors]
                    .sort((a, b) => {
                      const aFloor = a.floorNumber ?? -1;
                      const bFloor = b.floorNumber ?? -1;

                      return bFloor - aFloor;
                    })
                    .map((floor) => (
                      <div
                        key={floor.id}
                        className="flex items-center justify-between p-3 border border-default-200 rounded-lg hover:bg-default-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <MapPinIcon className="w-4 h-4 text-default-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {floor.floorNumber && (
                                <span className="text-sm font-medium">
                                  ชั้น {floor.floorNumber}
                                </span>
                              )}
                              <span className="font-medium text-sm text-foreground">
                                {floor.name}
                              </span>
                              <Chip
                                color={
                                  floor.departmentType === 2
                                    ? 'primary'
                                    : 'secondary'
                                }
                                size="sm"
                                variant="flat"
                              >
                                {getDepartmentTypeName(floor.departmentType) ||
                                  'คลินิก'}
                              </Chip>
                              <Chip
                                color={
                                  floor.status ? 'success' : 'default'
                                }
                                size="sm"
                                variant="flat"
                              >
                                {floor.status ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                              </Chip>
                              {floor.departmentType === 2 && (
                                <span className="text-xs text-default-500">
                                  {floor.roomCount && floor.bedCount
                                    ? `ห้องรวม ${floor.bedCount} เตียง, ${floor.roomCount} ห้องพิเศษ`
                                    : floor.bedCount
                                      ? `ห้องรวม ${floor.bedCount} เตียง`
                                      : floor.roomCount
                                        ? `${floor.roomCount} ห้องพิเศษ`
                                        : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            isIconOnly
                            color="primary"
                            isDisabled={
                              isDeletingFloor === floor.id || isSavingFloor
                            }
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleEditFloorClick(floor)
                            }
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            isDisabled={isDeletingFloor === floor.id}
                            isLoading={isDeletingFloor === floor.id}
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleDeleteFloor(
                                selectedBuilding.id,
                                floor.id,
                              )
                            }
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {selectedBuilding.floors.length === 0 && (
                    <EmptyState
                      compact
                      description='คลิกปุ่ม "เพิ่มคลีนิก/หอผู้ป่วย" เพื่อเพิ่มข้อมูล'
                      icon={
                        <MapPinIcon className="w-12 h-12 opacity-50" />
                      }
                      message="ยังไม่มีข้อมูลคลีนิก/หอผู้ป่วย"
                      variant="no-data"
                    />
                  )}
                </div>
              </ScrollShadow>
            ) : (
              <div className="text-center py-12 text-default-500">
                <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">กรุณาเลือกอาคาร</p>
                <p className="text-sm">
                  เลือกอาคารจากคอลัมน์ซ้ายเพื่อดูรายการคลีนิก/หอผู้ป่วย
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <BuildingModal
        building={editingBuilding}
        isLoading={isSavingBuilding}
        isOpen={isBuildingModalOpen}
        onClose={() => {
          onBuildingModalClose();
          setEditingBuilding(null);
        }}
        onSave={handleSaveBuilding}
      />

      <FloorDepartmentModal
        building={selectedBuilding}
        buildingId={selectedBuilding?.id || ''}
        floor={editingFloor}
        isLoading={isSavingFloor}
        isOpen={isFloorModalOpen}
        onClose={() => {
          onFloorModalClose();
          setEditingFloor(null);
        }}
        onSave={handleSaveFloor}
      />
    </div>
  );
}
