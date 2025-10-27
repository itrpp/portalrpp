import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";

import { UploadBatch } from "@/types/revenue";
import { TrashIcon } from "@/components/ui/icons";
// Removed unused toast import

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBatch: UploadBatch | null;
  formatDate: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  onDeleteBatch: (batch: UploadBatch) => void;
  onUpdateBatches: () => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  isOpen,
  onClose,
  selectedBatch,
  formatDate,
  formatFileSize,
  onDeleteBatch,
}) => {
  return (
    <Modal
      aria-label="รายละเอียด batch"
      isOpen={isOpen}
      size="4xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center space-x-2">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                รายละเอียดไฟล์ใน {selectedBatch?.batchName}
              </h3>
              <p className="text-sm text-default-600">
                อัปโหลดเมื่อ{" "}
                {selectedBatch ? formatDate(selectedBatch.uploadDate) : ""}
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          {selectedBatch && (
            <div className="space-y-4">
              {/* Batch Summary */}
              <div
                aria-label="สรุปข้อมูล batch"
                className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-default-50 dark:bg-default-900/20 rounded-lg"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {selectedBatch.totalFiles}
                  </div>
                  <div className="text-xs text-default-600">ไฟล์ทั้งหมด</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-success-600">
                    {selectedBatch.successFiles}
                  </div>
                  <div className="text-xs text-default-600">สำเร็จ</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-danger-600">
                    {selectedBatch.errorFiles}
                  </div>
                  <div className="text-xs text-default-600">ผิดพลาด</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {selectedBatch.totalRecords.toLocaleString()}
                  </div>
                  <div className="text-xs text-default-600">รายการทั้งหมด</div>
                </div>
              </div>

              {/* Files Table with Scroll */}
              <div className="max-h-96 overflow-y-auto border border-default-200 rounded-lg p-3">
                <Table
                  isHeaderSticky
                  isStriped
                  removeWrapper
                  aria-label={`รายละเอียดไฟล์ ${selectedBatch.batchName}`}
                >
                  <TableHeader>
                    <TableColumn>ชื่อไฟล์</TableColumn>
                    <TableColumn>ขนาดไฟล์</TableColumn>
                    <TableColumn>สถานะ</TableColumn>
                    <TableColumn>จำนวนรายการ</TableColumn>
                    <TableColumn>ข้อผิดพลาด</TableColumn>
                  </TableHeader>
                  <TableBody items={selectedBatch?.files ?? []}>
                    {(file) => (
                      <TableRow key={file.id}>
                        <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-48">
                          <div
                            aria-label={`ชื่อไฟล์: ${file.fileName}`}
                            className="flex items-center space-x-2"
                          >
                            <span className="font-medium text-foreground">
                              {file.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-default-600">
                            {formatFileSize(file.fileSize)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Chip
                            aria-label={`สถานะไฟล์ ${file.fileName}: ${
                              (file.status as string) === "success" ||
                              (file.status as string) === "completed" ||
                              (file.status as string) === "imported"
                                ? "สำเร็จ"
                                : (file.status as string) === "error" ||
                                    (file.status as string) === "failed"
                                  ? "ผิดพลาด"
                                  : (file.status as string) === "processing"
                                    ? "กำลังประมวลผล"
                                    : (file.status as string) === "validating"
                                      ? "กำลังตรวจสอบไฟล์"
                                      : (file.status as string) === "pending"
                                        ? "รอตรวจสอบไฟล์"
                                        : (file.status as string) ===
                                            "uploading"
                                          ? "กำลังอัปโหลด"
                                          : "ไม่ทราบสถานะ"
                            }`}
                            className={
                              (file.status as string) === "success" ||
                              (file.status as string) === "completed" ||
                              (file.status as string) === "imported"
                                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300"
                                : (file.status as string) === "error" ||
                                    (file.status as string) === "failed"
                                  ? "bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300"
                                  : (file.status as string) === "processing" ||
                                      (file.status as string) === "validating"
                                    ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300"
                                    : "bg-default-100 text-default-700 dark:bg-default-900/30 dark:text-default-300"
                            }
                          >
                            {(file.status as string) === "success" ||
                            (file.status as string) === "completed" ||
                            (file.status as string) === "imported"
                              ? "สำเร็จ"
                              : (file.status as string) === "error" ||
                                  (file.status as string) === "failed"
                                ? "ผิดพลาด"
                                : (file.status as string) === "processing"
                                  ? "กำลังประมวลผล"
                                  : (file.status as string) === "validating"
                                    ? "กำลังตรวจสอบไฟล์"
                                    : (file.status as string) === "pending"
                                      ? "รอตรวจสอบไฟล์"
                                      : (file.status as string) === "uploading"
                                        ? "กำลังอัปโหลด"
                                        : "ไม่ทราบสถานะ"}
                          </Chip>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {file.recordsCount ? (
                            <span className="text-default-600">
                              {file.recordsCount.toLocaleString()} รายการ
                            </span>
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-48">
                          {file.errorMessage ? (
                            <span className="text-danger-600 text-sm">
                              {file.errorMessage}
                            </span>
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            aria-label="ลบ batch ทั้งหมด"
            color="danger"
            startContent={<TrashIcon className="h-4 w-4" />}
            variant="light"
            onPress={() => {
              if (selectedBatch) {
                onDeleteBatch(selectedBatch);
                onClose();
              }
            }}
          >
            ลบ Batch
          </Button>
          <Button
            aria-label="ปิดรายละเอียด batch"
            color="primary"
            variant="flat"
            onPress={onClose}
          >
            ปิด
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
