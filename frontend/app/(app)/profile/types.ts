import type { ProfileDTO } from "@/types/profile";

/**
 * ฟิลด์ที่แก้ไขได้ในฟอร์มโปรไฟล์
 */
export interface ProfileEditableFields {
  displayName: string;
  phone: string;
  mobile: string;
  role: string;
  personTypeId: string | null;
  positionId: string | null;
  departmentId: string | null;
  departmentSubId: string | null;
  departmentSubSubId: string | null;
}

/**
 * ตัวเลือกจาก HRD API (key-value สำหรับ Autocomplete)
 */
export interface HrdOption {
  key: string;
  label: string;
}

/**
 * Props สำหรับ ProfileClient component
 */
export interface ProfileClientProps {
  initialProfile: ProfileDTO;
}
