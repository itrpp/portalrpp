import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

import { UploadBatch } from "@/types/revenue";
import { AlertCircleIcon } from "@/components/ui/icons";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchToDelete: UploadBatch | null;
  formatDate: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  onConfirmDelete: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  batchToDelete,
  formatDate,
  formatFileSize,
  onConfirmDelete,
}) => {
  return (
    <Modal
      aria-label="ยืนยันการลบ batch"
      isOpen={isOpen}
      size="md"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center space-x-2">
            <AlertCircleIcon className="h-5 w-5 text-danger-600" />
            <h3 className="text-lg font-medium text-foreground">ยืนยันการลบ</h3>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-default-600">
              คุณต้องการลบ batch{" "}
              <span className="font-semibold text-foreground">
                {batchToDelete?.batchName || "Unknown"}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            <div
              aria-label="คำเตือนการลบ"
              className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg"
            >
              <div className="flex items-start space-x-2">
                <AlertCircleIcon className="h-5 w-5 text-warning-600 mt-0.5" />
                <div className="text-sm text-warning-800 dark:text-warning-200">
                  <p className="font-medium mb-1">คำเตือน:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>การลบจะไม่สามารถกู้คืนได้</li>
                    <li>ไฟล์ทั้งหมดใน batch นี้จะถูกลบออก</li>
                    <li>ข้อมูลที่ประมวลผลแล้วจะหายไป</li>
                  </ul>
                </div>
              </div>
            </div>
            {batchToDelete && (
              <div
                aria-label="รายละเอียด batch"
                className="bg-default-50 dark:bg-default-900/20 p-4 rounded-lg"
              >
                <h4 className="font-medium text-foreground mb-2">
                  รายละเอียด Batch:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-default-600">ไฟล์ทั้งหมด:</span>
                    <span className="ml-2 font-medium">
                      {batchToDelete.totalFiles}
                    </span>
                  </div>
                  <div>
                    <span className="text-default-600">รายการทั้งหมด:</span>
                    <span className="ml-2 font-medium">
                      {batchToDelete.totalRecords.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-default-600">ขนาดรวม:</span>
                    <span className="ml-2 font-medium">
                      {formatFileSize(batchToDelete.totalSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-default-600">วันที่อัปโหลด:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(batchToDelete.uploadDate)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            aria-label="ยกเลิกการลบ batch"
            variant="light"
            onPress={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            aria-label="ยืนยันการลบ batch"
            color="danger"
            startContent={<AlertCircleIcon className="h-4 w-4" />}
            variant="solid"
            onPress={onConfirmDelete}
          >
            ลบ Batch
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
