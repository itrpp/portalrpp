/**
 * ========================================
 * COMMON TYPES
 * ========================================
 * Types ที่ใช้ร่วมกันทั่วทั้งแอปพลิเคชัน
 */

/**
 * โครงสร้างข้อมูล pagination (หลีกเลี่ยงการใช้ any)
 */
export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Props สำหรับ Upload Modal component
 */
export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: FileList | null) => void;
  onUpload: () => void;
  onUploadComplete: () => void;
}
