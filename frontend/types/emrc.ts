/**
 * ========================================
 * EMRC TYPES
 * ========================================
 * Types สำหรับระบบ EMRC (จองรถพยาบาล)
 */

/**
 * วัตถุประสงค์การจองรถ
 */
export type BookingPurpose =
  | "ส่งกลับบ้าน"
  | "ย้ายหอผู้ป่วย"
  | "ส่งตรวจ"
  | "REFER IN"
  | "REFER OUT"
  | "CT"
  | "ล้างไต"
  | "อื่นๆ";

/**
 * สถานะคำขอ
 */
export type EMRCStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/**
 * อุปกรณ์ที่จำเป็น
 */
export type RequiredEquipment =
  | "Room air"
  | "IV"
  | "Oxygen"
  | "HFNC"
  | "Ventilator"
  | "Monitor"
  | "Defibrillator";

/**
 * สถานะการติดเชื้อ
 */
export type InfectionStatus =
  | "เชื้อดื้อยา"
  | "TB"
  | "COVID-19"
  | "Flu A,B"
  | "RSV"
  | "ไม่มี"
  | "อื่นๆ";

/**
 * ประเภทเงื่อนไข
 */
export type ConditionType = "ผู้สูงอายุ" | "ผู้พิการ";

/**
 * ข้อมูลฟอร์มจองรถพยาบาล
 */
export interface EMRCRequestFormData {
  // ข้อมูลพื้นฐาน
  requesterDepartment: number | null;
  requesterName: string;
  requesterPhone: string;
  requestDate: string; // MM/DD/YYYY format
  requestTime: string; // HH:mm format
  bookingPurpose: BookingPurpose | "";
  bookingPurposeOther?: string;

  // ข้อมูลรายละเอียดเพิ่มเติม (สำหรับส่งกลับบ้าน)
  patientName?: string;
  patientBirthDate?: string; // dd/mm/yyyy format
  destinationAddress?: string;
  patientRights?: string;
  patientHN?: string;
  patientCitizenId?: string;
  patientPhone?: string;
  requiredEquipment: RequiredEquipment[];
  infectionStatus: InfectionStatus | "";
  infectionStatusOther?: string;
  departmentPhone?: string;
  requesterNameDetail?: string;
  conditionType: ConditionType | "";
  acknowledged: boolean;
}

/**
 * รายการคำขอรถพยาบาล
 */
export interface EMRCRequestItem {
  id: string;
  status: EMRCStatus;
  form: EMRCRequestFormData;
  assignedTo?: string;
  assignedToName?: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  acceptedById?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  cancelledById?: string;
  pickupAt?: string;
  deliveryAt?: string;
  returnAt?: string;
}

