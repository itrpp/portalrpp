import type { Selection } from "@react-types/shared";

/**
 * ========================================
 * PORTER TYPES
 * ========================================
 * Types สำหรับระบบ Porter (รับ-ส่งผู้ป่วย)
 */

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

  // ข้อมูลการเคลื่อนย้าย
  pickupLocation: string;
  deliveryLocation: string;
  requestedDateTime: string;
  urgencyLevel: UrgencyLevel | "";
  vehicleType: VehicleType | "";
  equipment: EquipmentType[];
  hasVehicle: "มี" | "ไม่มี" | "";
  returnTrip: "ไปส่งอย่างเดียว" | "รับกลับด้วย" | "";

  // รายละเอียดเพิ่มเติม
  transportReason: string;
  specialNotes: string;
  patientCondition: string;
  assignedToName?: string;
}

/**
 * สถานะงานในรายการคำขอ
 */
export type JobListTab = "waiting" | "in-progress" | "completed" | "cancelled";

/**
 * รายการงานพนักงานเปล
 */
export interface PorterJobItem {
  id: string;
  status: JobListTab;
  form: PorterRequestFormData;
  assignedTo?: string; // ID หรือชื่อผู้ดำเนินการ
  assignedToName?: string; // ชื่อผู้ดำเนินการสำหรับแสดงผล
}

/**
 * Props สำหรับตารางแสดงรายการงาน
 */
export interface JobTableProps {
  items: PorterJobItem[];
  sortedJobs: PorterJobItem[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  rowsPerPage: number;
  paginationId: string;
  selectedKeys?: Selection;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  onSelectionChange?: (keys: Selection) => void;
}

/**
 * ข้อมูลเจ้าหน้าที่พนักงานเปล
 */
export interface StaffMember {
  id: string;
  name: string;
  department?: string;
  title?: string;
}
