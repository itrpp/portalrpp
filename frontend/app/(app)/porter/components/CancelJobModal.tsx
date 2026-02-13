"use client";

import React from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";

import { XMarkIcon, InfoCircleIcon } from "@/components/ui/icons";

interface CancelJobModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  cancelReason: string;
  errorMessage?: string;
  onClose: () => void;
  onConfirm: () => void;
  onCancelReasonChange: (reason: string) => void;
}

/**
 * Modal สำหรับยืนยันการยกเลิกงาน
 */
export default function CancelJobModal({
  isOpen,
  isSubmitting = false,
  cancelReason,
  errorMessage,
  onClose,
  onConfirm,
  onCancelReasonChange,
}: CancelJobModalProps) {
  return (
    <Modal isOpen={isOpen} size="md" onClose={onClose}>
      <ModalContent className="overscroll-contain">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <XMarkIcon aria-hidden className="w-5 h-5 text-danger" />
            <h3 className="text-lg font-semibold text-foreground">
              ยืนยันการยกเลิกงาน
            </h3>
          </div>
        </ModalHeader>
        <ModalBody className="overscroll-contain">
          <div className="space-y-4">
            <p className="text-default-600">
              คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้?
            </p>
            <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <InfoCircleIcon
                  aria-hidden
                  className="w-5 h-5 text-warning-600 mt-0.5 shrink-0"
                />
                <div className="text-sm text-warning-800 dark:text-warning-200">
                  <p className="font-medium mb-1">คำเตือน:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>การยกเลิกงานจะไม่สามารถกู้คืนได้</li>
                    <li>สถานะงานจะเปลี่ยนเป็น &quot;ยกเลิก&quot;</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <Textarea
                isRequired
                errorMessage={errorMessage}
                label="เหตุผลการยกเลิก"
                placeholder="ระบุเหตุผลการยกเลิกงาน…"
                value={cancelReason}
                variant="bordered"
                onChange={(e) => onCancelReasonChange(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isSubmitting} variant="light" onPress={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="danger"
            isDisabled={isSubmitting || !cancelReason.trim()}
            isLoading={isSubmitting}
            startContent={<XMarkIcon aria-hidden className="w-4 h-4" />}
            onPress={onConfirm}
          >
            ยืนยันยกเลิกงาน
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
