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
  | "ถังออกซิเจน (ออกซิเจนCannula / mask with bag)"
  | "เสาน้ำเกลือ"
  | "กล่องวางขวด ICD"
  | "ผ้าผูกตรึงร่างกาย"
  | "อื่นๆ ระบุ";

/**
 * ข้อมูลฟอร์มขอเปล
 */
export interface PorterRequestFormData {
  // ข้อมูลหน่วยงานและผู้แจ้ง
  requesterDepartment: number | null; // เก็บ departmentSubSubId แทนชื่อหน่วยงาน
  requesterName: string;
  requesterPhone: string;

  // ข้อมูลผู้ป่วย
  patientName: string;
  patientHN: string;

  // ข้อมูลการเคลื่อนย้าย
  pickupLocationDetail: DetailedLocation | null; // ข้อมูลสถานที่รับแบบละเอียด
  deliveryLocationDetail: DetailedLocation | null; // ข้อมูลสถานที่ส่งแบบละเอียด
  requestedDateTime: string;
  urgencyLevel: UrgencyLevel | "";
  vehicleType: VehicleType | "";
  equipment: EquipmentType[];
  hasVehicle: "มี" | "ไม่มี" | "";
  returnTrip: "ไปส่งอย่างเดียว" | "รับกลับด้วย" | "";

  // รายละเอียดเพิ่มเติม
  transportReason: string;
  equipmentOther?: string; // ระบุอุปกรณ์อื่นๆ เมื่อเลือก "อื่นๆ ระบุ"
  specialNotes: string;
  patientCondition: string[]; // อาการ/สภาพผู้ป่วย (array ของ checkbox)
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
  assignedTo?: string; // ID ของผู้ดำเนินการ
  assignedToName?: string; // ชื่อของผู้ดำเนินการ
  createdAt?: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format
  acceptedAt?: string; // ISO 8601 format - เวลาที่รับงาน
  completedAt?: string; // ISO 8601 format - เวลาที่เสร็จสิ้น
  cancelledAt?: string; // ISO 8601 format - เวลาที่ยกเลิก
  cancelledReason?: string; // เหตุผลการยกเลิก
  cancelledById?: string; // ID ของผู้ยกเลิก
  cancelledByName?: string; // ชื่อของผู้ยกเลิก (Populate จาก User ID)
  pickupAt?: string; // ISO 8601 format - เวลาที่ถึงจุดรับ
  deliveryAt?: string; // ISO 8601 format - เวลาที่ถึงจุดส่ง
  returnAt?: string; // ISO 8601 format - เวลาที่ถึงจุดส่งกลับ
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
 * Interface สำหรับประเภทการจ้าง
 */
export interface EmploymentType {
  id: string;
  name: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface สำหรับตำแหน่ง
 */
export interface Position {
  id: string;
  name: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface สำหรับข้อมูลเจ้าหน้าที่เปล
 */
export interface PorterEmployee {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  employmentType: string; // ชื่อ (สำหรับ backward compatibility)
  employmentTypeId: string;
  position: string; // ชื่อ (สำหรับ backward compatibility)
  positionId: string;
  status: boolean;
}

/**
 * ข้อมูลห้อง/เตียง
 */
export interface RoomBed {
  id: string;
  name: string;
}

/**
 * ประเภทหน่วยงาน (ID mapping)
 */
export const DEPARTMENT_TYPES = {
  1: "คลินิก",
  2: "หอผู้ป่วย",
} as const;

export type DepartmentTypeId = keyof typeof DEPARTMENT_TYPES;
export type DepartmentType = (typeof DEPARTMENT_TYPES)[DepartmentTypeId];

/**
 * ประเภทห้องพัก (ID mapping)
 */
export const ROOM_TYPES = {
  1: "ห้องรวม",
  2: "ห้องพิเศษ",
  3: "ห้องรวมและห้องพิเศษ",
} as const;

export type RoomTypeId = keyof typeof ROOM_TYPES;
export type RoomType = (typeof ROOM_TYPES)[RoomTypeId];

/**
 * Helper functions สำหรับ mapping
 */
export function getDepartmentTypeName(id: number): DepartmentType | undefined {
  return DEPARTMENT_TYPES[id as DepartmentTypeId];
}

export function getDepartmentTypeId(
  name: DepartmentType,
): DepartmentTypeId | undefined {
  return Object.entries(DEPARTMENT_TYPES).find(
    ([, value]) => value === name,
  )?.[0] as DepartmentTypeId | undefined;
}

export function getRoomTypeName(id: number): RoomType | undefined {
  return ROOM_TYPES[id as RoomTypeId];
}

export function getRoomTypeId(name: RoomType): RoomTypeId | undefined {
  return Object.entries(ROOM_TYPES).find(([, value]) => value === name)?.[0] as
    | RoomTypeId
    | undefined;
}

/**
 * ข้อมูลชั้น/หน่วยงาน
 */
export interface FloorDepartment {
  id: string;
  name: string;
  floorNumber?: number; // หมายเลขชั้น
  departmentType: number; // ประเภทหน่วยงาน (ID: 1 = "คลินิก", 2 = "หอผู้ป่วย")
  roomType?: number; // ประเภทห้องพัก (ID: 1 = "ห้องพิเศษ", 2 = "ห้องรวม", 3 = "ห้องพิเศษและห้องรวม")
  roomCount?: number; // จำนวนห้อง (ถ้ามี)
  bedCount?: number; // จำนวนเตียง (ถ้ามี)
  status: boolean; // true = ใช้งาน, false = ไม่ใช้งาน
  rooms?: RoomBed[]; // ถ้ามีห้อง/เตียง (สำหรับ backward compatibility)
}

/**
 * ข้อมูลอาคาร
 */
export interface Building {
  id: string;
  name: string;
  floorCount?: number; // จำนวนชั้น
  status: boolean; // true = ใช้งาน, false = ไม่ใช้งาน
  floors: FloorDepartment[];
}

/**
 * ข้อมูลสถานที่แบบละเอียด
 */
export interface DetailedLocation {
  buildingId: string;
  buildingName: string;
  floorDepartmentId?: string;
  floorDepartmentName?: string;
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
    // location.roomBedName,
  ].filter(Boolean);

  return parts.join(" - ");
}
