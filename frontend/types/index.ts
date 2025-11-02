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

/**
 * ประเภทรถเปล
 */
export type VehicleType = "รถนั่ง" | "รถนอน" | "รถกอล์ฟ";

/**
 * ระดับความเร่งด่วน
 */
export type UrgencyLevel = "ปกติ" | "ด่วน" | "ฉุกเฉิน";

/**
 * อุปกรณ์ที่ต้องการ
 */
export type EquipmentType =
  | "Oxygen"
  | "Tube"
  | "IV Pump"
  | "Ventilator"
  | "Monitor"
  | "Suction";

/**
 * เพศผู้ป่วย
 */
export type PatientGender = "ชาย" | "หญิง" | "ไม่ระบุ";

/**
 * ข้อมูลฟอร์มขอเปล
 */
export interface PorterRequestFormData {
  // ข้อมูลหน่วยงานและผู้แจ้ง
  requesterDepartment: string;
  requesterName: string;
  requesterPhone: string;

  // ข้อมูลผู้ป่วย
  patientName: string;
  patientHN: string;
  patientAge: number | "";
  patientGender: PatientGender;
  patientWeight: number | "";

  // ข้อมูลการเคลื่อนย้าย
  pickupLocation: string;
  deliveryLocation: string;
  requestedDateTime: string;
  urgencyLevel: UrgencyLevel;
  vehicleType: VehicleType;
  equipment: EquipmentType[];
  assistanceCount: number | "";
  hasVehicle: "มี" | "ไม่มี" | "";
  returnTrip: "ไปส่งอย่างเดียว" | "รับกลับด้วย" | "";

  // รายละเอียดเพิ่มเติม
  transportReason: string;
  medicalAllergies: string;
  specialNotes: string;
  patientCondition: string;
}
