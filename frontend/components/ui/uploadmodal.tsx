import React from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import { PlusIcon } from "./icons";

import { UploadModalProps } from "@/types";

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFileSelect,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Modal
      classNames={{
        base: "max-h-[90vh]",
        body: "max-h-[calc(90vh-120px)] overflow-y-auto",
      }}
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader>
          <h3 className="text-lg font-medium text-foreground">
            อัปโหลดไฟล์ใหม่
          </h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div
              aria-label="พื้นที่อัปโหลดไฟล์ DBF"
              className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
            >
              <h4 className="text-lg font-medium text-foreground mb-2">
                ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
              </h4>
              <p className="text-sm text-default-600 mb-3">รองรับไฟล์ DBF</p>
              <Button
                aria-label="เลือกไฟล์"
                color="primary"
                startContent={<PlusIcon className="h-4 w-4" />}
                variant="solid"
                onPress={() => fileInputRef.current?.click()}
              >
                เลือกไฟล์
              </Button>
              <input
                ref={fileInputRef}
                multiple
                accept=".dbf,.DBF"
                aria-label="เลือกไฟล์"
                className="hidden"
                type="file"
                onChange={(e) => onFileSelect(e.target.files)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter />
      </ModalContent>
    </Modal>
  );
};
