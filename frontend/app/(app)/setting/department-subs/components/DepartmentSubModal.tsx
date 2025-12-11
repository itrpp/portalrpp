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

import { DepartmentSub, Department } from "@/types/hrd";

/**
 * Props สำหรับ DepartmentSubModal
 */
interface DepartmentSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    departmentSub: Omit<DepartmentSub, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => void;
  departmentSub?: DepartmentSub | null;
  departments: Department[];
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขกลุ่มงาน
 */
export default function DepartmentSubModal({
  isOpen,
  onClose,
  onSave,
  departmentSub,
  departments,
  isLoading = false,
}: DepartmentSubModalProps) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (departmentSub) {
      setName(departmentSub.name);
      setDepartmentId(departmentSub.departmentId);
      setActive(departmentSub.active ?? true);
    } else {
      setName("");
      setDepartmentId(null);
      setActive(true);
    }
  }, [departmentSub, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อกลุ่มงาน",
        color: "danger",
      });

      return;
    }

    if (!departmentId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกกลุ่มภารกิจ",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: departmentSub?.id,
        name: name.trim(),
        departmentId,
        active,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveDepartmentSub แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {departmentSub ? "แก้ไขกลุ่มงาน" : "เพิ่มกลุ่มงานใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Select
              isRequired
              isDisabled={isLoading}
              label="กลุ่มภารกิจ"
              placeholder="เลือกกลุ่มภารกิจ"
              selectedKeys={
                departmentId ? new Set([departmentId.toString()]) : new Set()
              }
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                setDepartmentId(
                  selected ? Number.parseInt(selected, 10) : null,
                );
              }}
            >
              {departments.map((dept) => (
                <SelectItem key={dept.id.toString()}>{dept.name}</SelectItem>
              ))}
            </Select>
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อกลุ่มงาน"
              placeholder="เช่น กลุ่มงานการพยาบาล"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้กลุ่มงานนี้สามารถเลือกใช้ได้
              </div>
              <Checkbox
                isDisabled={isLoading}
                isSelected={active}
                onValueChange={setActive}
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
