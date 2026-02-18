'use client';

import type { Building, FloorDepartment } from '@/types/porter';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  Checkbox,
} from '@heroui/react';

import { DEPARTMENT_TYPES, ROOM_TYPES } from '@/lib/porter';

export interface FloorDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (floor: FloorDepartment) => void;
  floor?: FloorDepartment | null;
  buildingId: string;
  building?: Building | null;
  isLoading?: boolean;
}

export function FloorDepartmentModal({
  isOpen,
  onClose,
  onSave,
  floor,
  buildingId: _buildingId,
  building,
  isLoading = false,
}: FloorDepartmentModalProps) {
  const [name, setName] = useState('');
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [departmentTypeId, setDepartmentTypeId] = useState<number>(1);
  const [roomTypeId, setRoomTypeId] = useState<number>(1);
  const [roomCount, setRoomCount] = useState<string>('');
  const [bedCount, setBedCount] = useState<string>('');
  const [status, setStatus] = useState<boolean>(true);

  const floorOptions = building?.floorCount
    ? Array.from({ length: building.floorCount }, (_, i) => ({
        key: (i + 1).toString(),
        value: `ชั้น ${i + 1}`,
      }))
    : [];

  useEffect(() => {
    if (floor) {
      setName(floor.name);
      setFloorNumber(floor.floorNumber?.toString() || '');
      setDepartmentTypeId(floor.departmentType || 1);
      setRoomTypeId(floor.roomType || 1);
      setRoomCount(floor.roomCount?.toString() || '');
      setBedCount(floor.bedCount?.toString() || '');
      setStatus(floor.status !== undefined ? floor.status : true);
    } else {
      setName('');
      setFloorNumber('');
      setDepartmentTypeId(1);
      setRoomTypeId(1);
      setRoomCount('');
      setBedCount('');
      setStatus(true);
    }
  }, [floor, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อคลีนิก/หอผู้ป่วย',
        color: 'danger',
      });

      return;
    }

    if (departmentTypeId === 2) {
      if (!roomTypeId) {
        addToast({
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'กรุณาเลือกประเภทห้องพัก',
          color: 'danger',
        });

        return;
      }

      if (roomTypeId === 1 || roomTypeId === 3) {
        const bedCountNum = parseInt(bedCount, 10);

        if (!bedCount || isNaN(bedCountNum) || bedCountNum <= 0) {
          addToast({
            title: 'ข้อมูลไม่ครบถ้วน',
            description: 'กรุณาระบุจำนวนเตียงห้องรวม',
            color: 'danger',
          });

          return;
        }
      }

      if (roomTypeId === 2 || roomTypeId === 3) {
        const roomCountNum = parseInt(roomCount, 10);

        if (!roomCount || isNaN(roomCountNum) || roomCountNum <= 0) {
          addToast({
            title: 'ข้อมูลไม่ครบถ้วน',
            description: 'กรุณาระบุจำนวนห้องพิเศษ',
            color: 'danger',
          });

          return;
        }
      }
    }

    const floorData: FloorDepartment = {
      id: floor?.id || '',
      name: name.trim(),
      floorNumber: floorNumber ? parseInt(floorNumber, 10) : undefined,
      departmentType: departmentTypeId,
      roomType: departmentTypeId === 2 ? roomTypeId : undefined,
      roomCount:
        departmentTypeId === 2 && (roomTypeId === 2 || roomTypeId === 3)
          ? parseInt(roomCount, 10)
          : undefined,
      bedCount:
        departmentTypeId === 2 && (roomTypeId === 1 || roomTypeId === 3)
          ? parseInt(bedCount, 10)
          : undefined,
      status: status,
      rooms: floor?.rooms || undefined,
    };

    try {
      await onSave(floorData);
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveFloor แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {floor ? 'แก้ไขคลีนิก/หอผู้ป่วย' : 'เพิ่มคลีนิก/หอผู้ป่วยใหม่'}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {building?.floorCount && building.floorCount > 1 && (
              <Select
                isRequired
                color="default"
                isDisabled={isLoading}
                label="ชั้น"
                placeholder="เลือกชั้น"
                selectedKeys={
                  floorNumber ? new Set([floorNumber]) : new Set()
                }
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  setFloorNumber(selected || '');
                }}
              >
                {floorOptions.map((opt) => (
                  <SelectItem key={opt.key}>{opt.value}</SelectItem>
                ))}
              </Select>
            )}
            <Input
              isRequired
              color="default"
              isDisabled={isLoading}
              label="ชื่อคลีนิก/หอผู้ป่วย"
              placeholder="เช่น ชั้น 4 หอผู้ป่วยพิเศษพรีเมียม"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <div className="text-sm font-medium text-foreground mb-2">
                ประเภทหน่วยงาน
                <span className="text-danger ml-1">*</span>
              </div>
              <RadioGroup
                isRequired
                isDisabled={isLoading}
                orientation="horizontal"
                value={departmentTypeId.toString()}
                onValueChange={(val) => {
                  const id = parseInt(val, 10);

                  setDepartmentTypeId(id);
                  if (id === 1) {
                    setRoomTypeId(1);
                    setRoomCount('');
                    setBedCount('');
                  }
                }}
              >
                {Object.entries(DEPARTMENT_TYPES).map(([id, name]) => (
                  <Radio key={id} value={id}>
                    {name}
                  </Radio>
                ))}
              </RadioGroup>
            </div>

            {departmentTypeId === 2 && (
              <>
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">
                    ประเภทห้องพัก
                    <span className="text-danger ml-1">*</span>
                  </div>
                  <RadioGroup
                    isRequired
                    isDisabled={isLoading}
                    orientation="horizontal"
                    value={roomTypeId.toString()}
                    onValueChange={(val) => {
                      const id = parseInt(val, 10);

                      setRoomTypeId(id);
                      if (id === 1) {
                        setRoomCount('');
                      } else if (id === 2) {
                        setBedCount('');
                      }
                    }}
                  >
                    {Object.entries(ROOM_TYPES).map(([id, name]) => (
                      <Radio key={id} value={id}>
                        {name}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>

                {(roomTypeId === 1 || roomTypeId === 3) && (
                  <Input
                    isRequired
                    classNames={{
                      input:
                        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    }}
                    isDisabled={isLoading}
                    label="จำนวนเตียงห้องรวม"
                    min={1}
                    placeholder="เช่น 35 เตียง"
                    type="number"
                    value={bedCount}
                    variant="bordered"
                    onChange={(e) => setBedCount(e.target.value)}
                  />
                )}

                {(roomTypeId === 2 || roomTypeId === 3) && (
                  <Input
                    isRequired
                    classNames={{
                      input:
                        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    }}
                    isDisabled={isLoading}
                    label="จำนวนห้องพิเศษ"
                    min={1}
                    placeholder="เช่น 15"
                    type="number"
                    value={roomCount}
                    variant="bordered"
                    onChange={(e) => setRoomCount(e.target.value)}
                  />
                )}
              </>
            )}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้คลีนิก/หอผู้ป่วยนี้สามารถเลือกใช้ได้
              </div>
              <Checkbox
                isDisabled={isLoading}
                isSelected={status}
                onValueChange={setStatus}
              >
                ใช้งาน
              </Checkbox>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isLoading} variant="flat" onPress={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="primary"
            isDisabled={isLoading}
            isLoading={isLoading}
            onPress={handleSave}
          >
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
