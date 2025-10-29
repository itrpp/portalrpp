/**
 * โครงสร้างข้อมูล pagination (หลีกเลี่ยงการใช้ any)
 */
export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  // uploadedFiles: UploadedFile[];
  // isDragOver: boolean;
  // errorMessage: string;
  // isUploading: boolean;
  // isUploadCompleted: boolean;
  // maxFileSize: number;
  // maxFiles: number;
  // formatFileSize: (bytes: number) => string;
  // fileInputRef: React.RefObject<HTMLInputElement>;
  // onDragOver: (e: React.DragEvent) => void;
  // onDragLeave: (e: React.DragEvent) => void;
  // onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  // onRemoveFile: (fileId: string) => void;
  // onClearAllFiles: () => void;
  onUpload: () => void;
  onUploadComplete: () => void;
}
