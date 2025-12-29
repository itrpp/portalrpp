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
  Switch,
  Checkbox,
  addToast,
} from "@heroui/react";

export interface SimpleCrudItem {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface SimpleCrudModalProps<T extends SimpleCrudItem> {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    item: Omit<T, "id" | "createdAt" | "updatedAt"> & { id?: number },
  ) => Promise<void>;
  item?: T | null;
  isLoading?: boolean;
  itemName: string; // เช่น "กลุ่มภารกิจ", "กลุ่มบุคลากร"
  itemNameFieldLabel?: string; // เช่น "ชื่อกลุ่มภารกิจ"
  itemNamePlaceholder?: string; // เช่น "เช่น กลุ่มภารกิจการพยาบาล"
  useCheckboxForActive?: boolean; // ใช้ Checkbox แทน Switch
  activeFieldLabel?: string; // เช่น "สถานะการใช้งาน"
  activeFieldDescription?: string; // คำอธิบายเพิ่มเติม
  additionalFields?: (props: {
    item: T | null;
    isLoading: boolean;
    values: Record<string, unknown>;
    setValue: (key: string, value: unknown) => void;
  }) => React.ReactNode;
}

export function SimpleCrudModal<T extends SimpleCrudItem>({
  isOpen,
  onClose,
  onSave,
  item,
  isLoading = false,
  itemName,
  itemNameFieldLabel,
  itemNamePlaceholder,
  useCheckboxForActive = false,
  activeFieldLabel = "สถานะใช้งาน",
  activeFieldDescription,
  additionalFields,
}: SimpleCrudModalProps<T>) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [additionalValues, setAdditionalValues] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    if (item) {
      setName(item.name);
      setActive(item.active ?? true);
      // Set additional values if any
      if (additionalFields) {
        const additional: Record<string, unknown> = {};
        Object.keys(item).forEach((key) => {
          if (key !== "id" && key !== "name" && key !== "active") {
            additional[key] = item[key];
          }
        });
        setAdditionalValues(additional);
      }
    } else {
      setName("");
      setActive(true);
      setAdditionalValues({});
    }
  }, [item, isOpen, additionalFields]);

  const setValue = (key: string, value: unknown) => {
    setAdditionalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: `กรุณากรอกชื่อ${itemName}`,
        color: "danger",
      });

      return;
    }

    try {
      const itemData = {
        id: item?.id,
        name: name.trim(),
        active,
        ...additionalValues,
      } as unknown as Omit<T, "id" | "createdAt" | "updatedAt"> & {
        id?: number;
      };

      await onSave(itemData);
      onClose();
    } catch {
      // Error handling ถูกจัดการใน onSave แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {item ? `แก้ไข${itemName}` : `เพิ่ม${itemName}ใหม่`}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label={itemNameFieldLabel || `ชื่อ${itemName}`}
              placeholder={itemNamePlaceholder || `เช่น ${itemName}`}
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            {additionalFields &&
              additionalFields({
                item: item ?? null,
                isLoading,
                values: additionalValues,
                setValue,
              })}
            {useCheckboxForActive ? (
              <div className="space-y-2">
                {activeFieldDescription && (
                  <div className="text-sm font-medium text-foreground">
                    {activeFieldLabel}
                  </div>
                )}
                {activeFieldDescription && (
                  <div className="text-xs text-default-500">
                    {activeFieldDescription}
                  </div>
                )}
                <Checkbox
                  isDisabled={isLoading}
                  isSelected={active}
                  onValueChange={setActive}
                >
                  ใช้งาน
                </Checkbox>
              </div>
            ) : (
              <Switch
                isDisabled={isLoading}
                isSelected={active}
                onValueChange={setActive}
              >
                {activeFieldLabel}
              </Switch>
            )}
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

