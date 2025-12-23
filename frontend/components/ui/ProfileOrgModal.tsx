"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface ProfileOrgModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ProfileOrgModal({
  isOpen,
  onOpenChange,
  onConfirm,
}: ProfileOrgModalProps) {
  return (
    <Modal
      isKeyboardDismissDisabled
      hideCloseButton={true}
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              กรุณาปรับปรุงข้อมูลโปรไฟล์
            </ModalHeader>
            <ModalBody>
              <p>
                ระบบตรวจพบว่าข้อมูลโครงสร้างองค์กรของคุณยังไม่ครบถ้วน
                กรุณาไปที่หน้าจอโปรไฟล์เพื่อกรอกข้อมูล เช่น กลุ่มบุคลากร,
                ตำแหน่ง, กลุ่มภารกิจ, กลุ่มงาน และหน่วยงาน
              </p>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={onConfirm}>
                ไปที่หน้าปรับปรุงข้อมูลโปรไฟล์
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
