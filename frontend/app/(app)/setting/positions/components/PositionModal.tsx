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

import { Position } from "@/types/hrd";

/**
 * Props สำหรับ PositionModal
 */
interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    position: Omit<Position, "id" | "createdAt" | "updatedAt"> & {
      id?: number;
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
  const [id, setId] = useState<string>("");
  const [name, setName] = useState("");
  const [positionSpId, setPositionSpId] = useState("");

  useEffect(() => {
    if (position) {
      setId(position.id.toString());
      setName(position.name);
      setPositionSpId(position.positionSpId || "");
    } else {
      setId("");
      setName("");
      setPositionSpId("");
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

    if (!position && !id.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุ ID ตำแหน่ง",
        color: "danger",
      });

      return;
    }

    const positionId = position ? position.id : Number.parseInt(id, 10);

    if (!position && (isNaN(positionId) || positionId <= 0)) {
      addToast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "ID ตำแหน่งต้องเป็นตัวเลขที่มากกว่า 0",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: position ? position.id : positionId,
        name: name.trim(),
        positionSpId: positionSpId.trim() || undefined,
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
            {!position && (
              <Input
                isRequired
                classNames={{
                  input:
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                }}
                isDisabled={isLoading}
                label="ID ตำแหน่ง"
                placeholder="เช่น 1"
                type="number"
                value={id}
                variant="bordered"
                onChange={(e) => setId(e.target.value)}
              />
            )}
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อตำแหน่ง"
              placeholder="เช่น พยาบาลวิชาชีพ"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              isDisabled={isLoading}
              label="Position SP ID"
              placeholder="เช่น SP001 (ไม่บังคับ)"
              value={positionSpId}
              variant="bordered"
              onChange={(e) => setPositionSpId(e.target.value)}
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
