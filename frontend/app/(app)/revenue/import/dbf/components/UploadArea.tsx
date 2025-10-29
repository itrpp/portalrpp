import React from "react";
import { Alert, Button, Chip } from "@heroui/react";

import {
  AlertCircleIcon,
  UploadIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  DocumentCheckIcon,
  FileTextIcon,
} from "@/components/ui/icons";
import { UploadedFile } from "@/types/revenue";

interface UploadAreaProps {
  isDragOver: boolean;
  errorMessage: string;
  uploadedFiles: UploadedFile[];
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
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  isDragOver,
  errorMessage,
  uploadedFiles,
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
}) => {
  return (
    <div className="space-y-4">
      {/* Error Message */}
      {errorMessage && (
        <Alert
          aria-label="ข้อความแจ้งเตือน"
          color="danger"
          startContent={<AlertCircleIcon className="h-4 w-4" />}
          variant="flat"
        >
          {errorMessage}
        </Alert>
      )}

      {/* Upload Area */}
      <div
        aria-label="พื้นที่อัปโหลดไฟล์ DBF"
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-default-300 dark:border-default-600"
        }`}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <UploadIcon className="h-10 w-10 text-default-400 mx-auto mb-3" />
        <h4 className="text-lg font-medium text-foreground mb-2">
          ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
        </h4>
        <p className="text-sm text-default-600 mb-3">
          รองรับไฟล์ DBF ขนาดสูงสุด {formatFileSize(maxFileSize)} จำนวนสูงสุด{" "}
          {maxFiles} ไฟล์
        </p>
        <Button
          aria-label="เลือกไฟล์ DBF"
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
          aria-label="เลือกไฟล์ DBF"
          className="hidden"
          type="file"
          onChange={(e) => onFileSelect(e.target.files)}
        />
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h4 className="font-medium text-foreground">
                ไฟล์ที่เลือก ({uploadedFiles.length})
              </h4>
            </div>
            <Button
              aria-label="ลบไฟล์ทั้งหมด"
              color="danger"
              size="sm"
              variant="light"
              onPress={onClearAllFiles}
            >
              ลบทั้งหมด
            </Button>
          </div>

          <div
            aria-label="รายการไฟล์ที่เลือก"
            className="space-y-2 max-h-60 overflow-y-auto"
          >
            {uploadedFiles.map((file, index) => (
              <div
                key={file.id}
                aria-label={`ไฟล์ที่ ${index + 1}: ${file.file?.name || "Unknown"}`}
                className="flex items-center justify-between p-3 bg-default-50 dark:bg-default-900/20 rounded-lg"
              >
                <div
                  aria-label={`ข้อมูลไฟล์: ${file.file?.name || "Unknown"}`}
                  className="flex items-center space-x-3 flex-1"
                >
                  <FileTextIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {file.file?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-default-600">
                      {file.fileSize
                        ? formatFileSize(file.fileSize)
                        : "Unknown"}
                    </p>
                    {file.checksum && (
                      <p
                        className="text-xs text-default-500 truncate"
                        title={`Checksum: ${file.checksum}`}
                      >
                        SHA256: {file.checksum.substring(0, 16)}...
                      </p>
                    )}
                  </div>
                </div>
                <div
                  aria-label="การดำเนินการกับไฟล์"
                  className="flex items-center space-x-2"
                >
                  {/* สถานะการอัปโหลด */}
                  {file.status === "uploading" && (
                    <div
                      aria-label={`กำลังอัปโหลด ${file.file?.name || "Unknown"}: ${file.progress || 0}%`}
                      className="flex items-center space-x-2"
                    >
                      <UploadIcon className="h-4 w-4 text-primary-500 animate-pulse" />
                      <div className="w-20 h-2 bg-default-200 rounded overflow-hidden">
                        <div
                          className="h-2 bg-primary-500"
                          style={{ width: `${file.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-default-600">
                        {file.progress || 0}%
                      </span>
                    </div>
                  )}

                  {/* สถานะอัปโหลดสำเร็จ */}
                  {file.status === "success" && (
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-success-600" />
                      <Chip
                        aria-label="อัปโหลดสำเร็จ"
                        className="bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300"
                      >
                        อัปโหลดสำเร็จ
                      </Chip>
                    </div>
                  )}

                  {/* สถานะกำลังตรวจสอบไฟล์ */}
                  {file.status === "validating" && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-warning-500 animate-spin" />
                        <Chip
                          aria-label="กำลังตรวจสอบไฟล์"
                          className="bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300"
                        >
                          กำลังตรวจสอบไฟล์
                        </Chip>
                      </div>
                    </div>
                  )}

                  {/* สถานะกำลังประมวลผล */}
                  {file.status === "processing" && (
                    <div className="flex items-center space-x-2">
                      <CogIcon className="h-4 w-4 text-blue-500 animate-spin" />
                      <Chip
                        aria-label="กำลังประมวลผล"
                        className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        กำลังประมวลผล
                      </Chip>
                    </div>
                  )}

                  {/* สถานะนำเข้าไฟล์เรียบร้อย */}
                  {file.status === "imported" && (
                    <div className="flex items-center space-x-2">
                      <DocumentCheckIcon className="h-4 w-4 text-green-600" />
                      <Chip
                        aria-label="นำเข้าไฟล์เรียบร้อย"
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      >
                        นำเข้าไฟล์เรียบร้อย
                      </Chip>
                      {/* แสดงจำนวน records ถ้ามี */}
                      {file.recordsCount && file.recordsCount > 0 && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          {file.recordsCount.toLocaleString()} รายการ
                        </span>
                      )}
                    </div>
                  )}

                  {/* สถานะผิดพลาด */}
                  {file.status === "error" && (
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <AlertCircleIcon className="h-4 w-4 text-danger-600" />
                        <Chip
                          aria-label="สถานะผิดพลาด"
                          className="bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300"
                        >
                          ผิดพลาด
                        </Chip>
                      </div>
                      {file.error && (
                        <div
                          className="text-xs text-danger-600 max-w-xs truncate"
                          title={file.error}
                        >
                          {file.error}
                        </div>
                      )}
                    </div>
                  )}

                  {/* สถานะรอการประมวลผล */}
                  {file.status === "pending" && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-default-400" />
                      <Chip
                        aria-label="รอการประมวลผล"
                        className="bg-default-100 text-default-700 dark:bg-default-900/30 dark:text-default-300"
                      >
                        รอการประมวลผล
                      </Chip>
                    </div>
                  )}

                  <Button
                    isIconOnly
                    aria-label="ลบไฟล์"
                    color="danger"
                    isDisabled={
                      file.status === "uploading" ||
                      file.status === "validating" ||
                      file.status === "processing"
                    }
                    size="sm"
                    variant="light"
                    onPress={() => onRemoveFile(file.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
