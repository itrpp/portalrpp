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

import { EmploymentType } from "@/types/porter";

/**
 * Props สำหรับ EmploymentTypeModal
 */
interface EmploymentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    employmentType: Omit<EmploymentType, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => void;
  employmentType?: EmploymentType | null;
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขประเภทการจ้าง
 */
export default function EmploymentTypeModal({
  isOpen,
  onClose,
  onSave,
  employmentType,
  isLoading = false,
}: EmploymentTypeModalProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (employmentType) {
      setName(employmentType.name);
      setStatus(employmentType.status ?? true);
    } else {
      setName("");
      setStatus(true);
    }
  }, [employmentType, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อประเภทการจ้าง",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: employmentType?.id,
        name: name.trim(),
        status,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveEmploymentType แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {employmentType ? "แก้ไขประเภทการจ้าง" : "เพิ่มประเภทการจ้างใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อประเภทการจ้าง"
              placeholder="เช่น ลูกจ้างประจำ"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้ประเภทการจ้างนี้สามารถเลือกใช้ได้
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
