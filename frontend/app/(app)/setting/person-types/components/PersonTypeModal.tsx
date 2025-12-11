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
  addToast,
} from "@heroui/react";

import { PersonType } from "@/types/hrd";

/**
 * Props สำหรับ PersonTypeModal
 */
interface PersonTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    personType: Omit<PersonType, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
    },
  ) => void;
  personType?: PersonType | null;
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขกลุ่มบุคลากร
 */
export default function PersonTypeModal({
  isOpen,
  onClose,
  onSave,
  personType,
  isLoading = false,
}: PersonTypeModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (personType) {
      setName(personType.name);
    } else {
      setName("");
    }
  }, [personType, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อกลุ่มบุคลากร",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: personType?.id,
        name: name.trim(),
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSavePersonType แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {personType ? "แก้ไขกลุ่มบุคลากร" : "เพิ่มกลุ่มบุคลากรใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อกลุ่มบุคลากร"
              placeholder="เช่น กลุ่มบุคลากรทางการแพทย์"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
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
