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
 * สถานะงานในรายการคำขอ (สำหรับแท็บแสดงผล)
 * - ใช้สำหรับ UI tabs เท่านั้น ไม่ใช่ค่าสถานะจริงในฐานข้อมูล
 */
export type JobListTab = "waiting" | "in-progress" | "completed" | "cancelled";

/**
 * สถานะจริงของงาน Porter (ตรงกับฐานข้อมูล / Proto)
 */
export type PorterJobStatus =
  | "WAITING_CENTER"
  | "WAITING_ACCEPT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

/**
 * รายการงานพนักงานเปล
 */
export interface PorterJobItem {
  id: string;
  status: PorterJobStatus;
  form: PorterRequestFormData;
  assignedTo?: string; // ID ของผู้ปฎิบัติงาน
  assignedToName?: string; // ชื่อของผู้ปฎิบัติงาน
  createdAt?: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format
  acceptedAt?: string; // ISO 8601 format - เวลาที่รับงาน
  acceptedById?: string; // ID ของผู้ที่กดรับงาน
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
  nickname?: string; // ชื่อเล่น
  profileImage?: string | null; // รูปภาพโปรไฟล์ (base64 string) - null สำหรับลบรูปภาพ
  employmentType: string; // ชื่อ (สำหรับ backward compatibility)
  employmentTypeId: string | number; // รองรับทั้ง string และ number (hrd_person_type ใช้ number)
  position: string; // ชื่อ (สำหรับ backward compatibility)
  positionId: string | number; // รองรับทั้ง string และ number (hrd_position ใช้ number)
  status: boolean;
  userId?: string; // map กับ user login (id จาก User table)
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
 * หมายเหตุ: Constants และ functions ถูกย้ายไปที่ lib/porter.ts แล้ว
 */
export type DepartmentTypeId = 1 | 2;
export type DepartmentType = "คลินิก" | "หอผู้ป่วย";

/**
 * ประเภทห้องพัก (ID mapping)
 * หมายเหตุ: Constants และ functions ถูกย้ายไปที่ lib/porter.ts แล้ว
 */
export type RoomTypeId = 1 | 2 | 3;
export type RoomType = "ห้องรวม" | "ห้องพิเศษ" | "ห้องรวมและห้องพิเศษ";

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
 * ข้อมูล BLE Station
 */
export interface BleStation {
  id: string;
  floorPlanId: string;
  name: string;
  macAddress: string;
  uuid?: string;
  positionX: number;
  positionY: number;
  signalStrength?: number; // dBm
  batteryLevel?: number; // percentage (0-100)
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ข้อมูล Floor Plan
 */
export interface FloorPlan {
  id: string;
  buildingId: string;
  floorNumber: number;
  imageData: string; // base64 string
  stations: BleStation[];
  createdAt: string;
  updatedAt: string;
}

/**
 * ข้อมูลอาคาร
 */
export interface Building {
  id: string;
  name: string;
  floorCount?: number; // จำนวนชั้น
  floorPlans?: FloorPlan[]; // floor plan ของแต่ละชั้น
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
 * หมายเหตุ: formatLocationString function ถูกย้ายไปที่ lib/porter.ts แล้ว
 */
