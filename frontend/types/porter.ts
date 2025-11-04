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
  pickupLocation: string; // เก็บเป็น string สำหรับ backward compatibility
  pickupLocationDetail: DetailedLocation | null; // ข้อมูลสถานที่รับแบบละเอียด
  deliveryLocation: string; // เก็บเป็น string สำหรับ backward compatibility
  deliveryLocationDetail: DetailedLocation | null; // ข้อมูลสถานที่ส่งแบบละเอียด
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

/**
 * ข้อมูลห้อง/เตียง
 */
export interface RoomBed {
  id: string;
  name: string;
}

/**
 * ข้อมูลชั้น/หน่วยงาน
 */
export interface FloorDepartment {
  id: string;
  name: string;
  rooms?: RoomBed[]; // ถ้ามีห้อง/เตียง
}

/**
 * ข้อมูลอาคาร
 */
export interface Building {
  id: string;
  name: string;
  floors: FloorDepartment[];
}

/**
 * ข้อมูลสถานที่แบบละเอียด
 */
export interface DetailedLocation {
  buildingId: string;
  buildingName: string;
  floorDepartmentId: string;
  floorDepartmentName: string;
  roomBedId?: string;
  roomBedName?: string;
}

/**
 * ฟังก์ชันสำหรับแปลง DetailedLocation เป็น string สำหรับแสดงผล
 */
export function formatLocationString(
  location: DetailedLocation | null,
): string {
  if (!location) return "";

  const parts = [
    location.buildingName,
    location.floorDepartmentName,
    location.roomBedName,
  ].filter(Boolean);

  return parts.join(" - ");
}
