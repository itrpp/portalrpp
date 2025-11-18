"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  addToast,
} from "@heroui/react";

import { EmploymentType, Position, PorterEmployee } from "@/types/porter";

/**
 * Props สำหรับ EmployeeModal
 */
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<PorterEmployee, "id"> & { id?: string }) => void;
  employee?: PorterEmployee | null;
  isLoading?: boolean;
  employmentTypes: EmploymentType[];
  positions: Position[];
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขเจ้าหน้าที่เปล
 */
export default function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee,
  isLoading = false,
  employmentTypes,
  positions,
}: EmployeeModalProps) {
  const [citizenId, setCitizenId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState<string>("");
  const [positionId, setPositionId] = useState<string>("");
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (employee) {
      setCitizenId(employee.citizenId);
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmploymentTypeId(employee.employmentTypeId);
      setPositionId(employee.positionId);
      setStatus(employee.status);
    } else {
      setCitizenId("");
      setFirstName("");
      setLastName("");
      // ตั้งค่า default จากรายการที่มี status = true
      const defaultEmploymentType = employmentTypes.find((et) => et.status);
      const defaultPosition = positions.find((p) => p.status);

      setEmploymentTypeId(defaultEmploymentType?.id || "");
      setPositionId(defaultPosition?.id || "");
      setStatus(true);
    }
  }, [employee, isOpen, employmentTypes, positions]);

  const handleSave = async () => {
    // Validate citizenId (ต้องเป็น 13 หลัก)
    if (!citizenId.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกเลขบัตรประชาชน",
        color: "danger",
      });

      return;
    }

    if (!/^\d{13}$/.test(citizenId.trim())) {
      addToast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
        color: "danger",
      });

      return;
    }

    if (!firstName.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อ",
        color: "danger",
      });

      return;
    }

    if (!lastName.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกนามสกุล",
        color: "danger",
      });

      return;
    }

    if (!employmentTypeId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกประเภทการจ้าง",
        color: "danger",
      });

      return;
    }

    if (!positionId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกตำแหน่ง",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: employee?.id,
        citizenId: citizenId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        employmentType: "", // จะถูก populate จาก backend
        employmentTypeId,
        position: "", // จะถูก populate จาก backend
        positionId,
        status,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveEmployee แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {employee ? "แก้ไขเจ้าหน้าที่เปล" : "เพิ่มเจ้าหน้าที่เปลใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              description={
                employee
                  ? "ไม่สามารถแก้ไขเลขบัตรประชาชนได้"
                  : "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
              }
              isDisabled={isLoading || !!employee}
              label="เลขบัตรประชาชน"
              maxLength={13}
              placeholder="เช่น 1234567890123"
              value={citizenId}
              variant="bordered"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");

                setCitizenId(value);
              }}
            />
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อ"
              placeholder="เช่น สมชาย"
              value={firstName}
              variant="bordered"
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              isRequired
              isDisabled={isLoading}
              label="นามสกุล"
              placeholder="เช่น ใจดี"
              value={lastName}
              variant="bordered"
              onChange={(e) => setLastName(e.target.value)}
            />
            <Select
              isRequired
              isDisabled={isLoading}
              label="ประเภทการจ้าง"
              placeholder="เลือกประเภทการจ้าง"
              selectedKeys={employmentTypeId ? [employmentTypeId] : []}
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                if (selected) {
                  setEmploymentTypeId(selected);
                }
              }}
            >
              {employmentTypes
                .filter((et) => et.status)
                .map((et) => (
                  <SelectItem key={et.id}>{et.name}</SelectItem>
                ))}
            </Select>
            <Select
              isRequired
              isDisabled={isLoading}
              label="ตำแหน่ง"
              placeholder="เลือกตำแหน่ง"
              selectedKeys={positionId ? [positionId] : []}
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                if (selected) {
                  setPositionId(selected);
                }
              }}
            >
              {positions
                .filter((p) => p.status)
                .map((p) => (
                  <SelectItem key={p.id}>{p.name}</SelectItem>
                ))}
            </Select>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้เจ้าหน้าที่คนนี้สามารถรับงานได้
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
