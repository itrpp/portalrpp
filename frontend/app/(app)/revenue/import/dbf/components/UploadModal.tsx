import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

import { UploadArea } from "./UploadArea";

import { UploadedFile } from "@/types/revenue";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedFiles: UploadedFile[];
  isDragOver: boolean;
  errorMessage: string;
  isUploading: boolean;
  isUploadCompleted: boolean;
  maxFileSize: number;
  maxFiles: number;
  formatFileSize: (bytes: number) => string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAllFiles: () => void;
  onUpload: () => void;
  onUploadComplete: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  uploadedFiles,
  isDragOver,
  errorMessage,
  isUploading,
  isUploadCompleted,
  maxFileSize,
  maxFiles,
  formatFileSize,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveFile,
  onClearAllFiles,
  onUpload,
  onUploadComplete,
}) => {
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
            อัปโหลดไฟล์ DBF ใหม่
          </h3>
        </ModalHeader>
        <ModalBody>
          <UploadArea
            errorMessage={errorMessage}
            fileInputRef={fileInputRef}
            formatFileSize={formatFileSize}
            isDragOver={isDragOver}
            maxFileSize={maxFileSize}
            maxFiles={maxFiles}
            uploadedFiles={uploadedFiles}
            onClearAllFiles={onClearAllFiles}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onFileSelect={onFileSelect}
            onRemoveFile={onRemoveFile}
          />
        </ModalBody>
        <ModalFooter>
          {!isUploadCompleted ? (
            <>
              <Button
                aria-label="ยกเลิกการอัปโหลด"
                variant="light"
                onPress={onClose}
              >
                ยกเลิก
              </Button>
              <Button
                aria-label="อัปโหลดไฟล์ DBF"
                color="primary"
                isDisabled={
                  uploadedFiles.length === 0 ||
                  isUploading ||
                  uploadedFiles.some(
                    (f) =>
                      (f.status as string) === "uploading" ||
                      (f.status as string) === "validating" ||
                      (f.status as string) === "processing",
                  )
                }
                isLoading={isUploading}
                variant="solid"
                onPress={onUpload}
              >
                {isUploading ? "กำลังประมวลผล..." : "อัปโหลดไฟล์"}
              </Button>
            </>
          ) : (
            <Button
              aria-label="เสร็จสิ้นการอัปโหลด"
              className="w-full"
              color="success"
              variant="solid"
              onPress={onUploadComplete}
            >
              เสร็จสิ้น
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
