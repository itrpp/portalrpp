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

import { Position } from "@/types/porter";

/**
 * Props สำหรับ PositionModal
 */
interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    position: Omit<Position, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => void;
  position?: Position | null;
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขตำแหน่ง
 */
export default function PositionModal({
  isOpen,
  onClose,
  onSave,
  position,
  isLoading = false,
}: PositionModalProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (position) {
      setName(position.name);
      setStatus(position.status ?? true);
    } else {
      setName("");
      setStatus(true);
    }
  }, [position, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อตำแหน่ง",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: position?.id,
        name: name.trim(),
        status,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSavePosition แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {position ? "แก้ไขตำแหน่ง" : "เพิ่มตำแหน่งใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อตำแหน่ง"
              placeholder="เช่น พนักงานเปล"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้ตำแหน่งนี้สามารถเลือกใช้ได้
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
