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
  // uploadedFiles,
  // isDragOver,
  // errorMessage,
  // isUploading,
  // isUploadCompleted,
  // maxFileSize,
  // maxFiles,
  // formatFileSize,
  // fileInputRef,
  // onDragOver,
  // onDragLeave,
  // onDrop,
  onFileSelect,
  // onRemoveFile,
  // onClearAllFiles,
  // onUpload,
  // onUploadComplete,
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
            {/* Error Message */}
            {/* {errorMessage && (
                            <Alert
                                color='danger'
                                variant='flat'
                                startContent={<AlertCircleIcon className='h-4 w-4' />}
                                aria-label="ข้อความแจ้งเตือน"
                            >
                                {errorMessage}
                            </Alert>
                        )} */}

            {/* Upload Area */}

            {/* ${isDragOver
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-default-300 dark:border-default-600'
                                }` */}

            <div
              aria-label="พื้นที่อัปโหลดไฟล์ DBF"
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors                               }`}
              // onDragOver={onDragOver}
              // onDragLeave={onDragLeave}
              // onDrop={onDrop}
            >
              {/* <UploadIcon className='h-10 w-10 text-default-400 mx-auto mb-3' /> */}
              <h4 className="text-lg font-medium text-foreground mb-2">
                ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
              </h4>
              <p className="text-sm text-default-600 mb-3">
                รองรับไฟล์ DBF ขนาดสูงสุด
                {/* {formatFileSize(maxFileSize)} จำนวนสูงสุด {maxFiles}  */}
                ไฟล์
              </p>
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
        <ModalFooter>
          {/* {!isUploadCompleted ? (
                        <>
                            <Button variant='light' aria-label="ยกเลิกการอัปโหลด" onPress={onClose}>
                                ยกเลิก
                            </Button>
                            <Button
                                color='primary'
                                variant='solid'
                                isLoading={isUploading}
                                isDisabled={
                                    uploadedFiles.length === 0 ||
                                    isUploading ||
                                    uploadedFiles.some((f) => (f.status as string) === 'uploading' || (f.status as string) === 'validating' || (f.status as string) === 'processing')
                                }
                                aria-label="อัปโหลดไฟล์ DBF"
                                onPress={onUpload}
                            >
                                {isUploading ? 'กำลังประมวลผล...' : 'อัปโหลดไฟล์'}
                            </Button>
                        </>
                    ) : (
                        <Button
                            color='success'
                            variant='solid'
                            className='w-full'
                            aria-label="เสร็จสิ้นการอัปโหลด"
                            onPress={onUploadComplete}
                        >
                            เสร็จสิ้น
                        </Button>
                    )} */}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
