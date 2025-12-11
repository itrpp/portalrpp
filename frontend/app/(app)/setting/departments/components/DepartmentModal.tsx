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
  Checkbox,
  addToast,
} from "@heroui/react";

import { Department } from "@/types/hrd";

/**
 * Props สำหรับ DepartmentModal
 */
interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    department: Omit<Department, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => void;
  department?: Department | null;
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขกลุ่มภารกิจ
 */
export default function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  department,
  isLoading = false,
}: DepartmentModalProps) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setActive(department.active ?? true);
    } else {
      setName("");
      setActive(true);
    }
  }, [department, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อกลุ่มภารกิจ",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: department?.id,
        name: name.trim(),
        active,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveDepartment แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {department ? "แก้ไขกลุ่มภารกิจ" : "เพิ่มกลุ่มภารกิจใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อกลุ่มภารกิจ"
              placeholder="เช่น กลุ่มภารกิจการพยาบาล"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้กลุ่มภารกิจนี้สามารถเลือกใช้ได้
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

