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

import { DepartmentSubSub, DepartmentSub } from "@/types/hrd";

/**
 * Props สำหรับ DepartmentSubSubModal
 */
interface DepartmentSubSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    departmentSubSub: Omit<
      DepartmentSubSub,
      "id" | "createdAt" | "updatedAt"
    > & { id?: number },
  ) => void;
  departmentSubSub?: DepartmentSubSub | null;
  departmentSubs: DepartmentSub[];
  isLoading?: boolean;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขหน่วยงาน
 */
export default function DepartmentSubSubModal({
  isOpen,
  onClose,
  onSave,
  departmentSubSub,
  departmentSubs,
  isLoading = false,
}: DepartmentSubSubModalProps) {
  const [name, setName] = useState("");
  const [departmentSubId, setDepartmentSubId] = useState<number | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (departmentSubSub) {
      setName(departmentSubSub.name);
      setDepartmentSubId(departmentSubSub.departmentSubId);
      setActive(departmentSubSub.active ?? true);
    } else {
      setName("");
      setDepartmentSubId(null);
      setActive(true);
    }
  }, [departmentSubSub, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อหน่วยงาน",
        color: "danger",
      });

      return;
    }

    if (!departmentSubId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกกลุ่มงาน",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: departmentSubSub?.id,
        name: name.trim(),
        departmentSubId,
        active,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveDepartmentSubSub แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {departmentSubSub ? "แก้ไขหน่วยงาน" : "เพิ่มหน่วยงานใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Select
              isRequired
              isDisabled={isLoading}
              label="กลุ่มงาน"
              placeholder="เลือกกลุ่มงาน"
              selectedKeys={
                departmentSubId
                  ? new Set([departmentSubId.toString()])
                  : new Set()
              }
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                setDepartmentSubId(
                  selected ? Number.parseInt(selected, 10) : null,
                );
              }}
            >
              {departmentSubs.map((sub) => (
                <SelectItem key={sub.id.toString()}>{sub.name}</SelectItem>
              ))}
            </Select>
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่อหน่วยงาน"
              placeholder="เช่น หน่วยงานการพยาบาล"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้หน่วยงานนี้สามารถเลือกใช้ได้
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
