import { getDateTimeLocal } from "./utils";

import {
  UrgencyLevel,
  VehicleType,
  EquipmentType,
  PorterJobItem,
  PorterRequestFormData,
  JobListTab,
  StaffMember,
} from "@/types/porter";

/**
 * ตัวเลือกความเร่งด่วนพร้อมสีที่ใช้แสดงผล
 */
export const URGENCY_OPTIONS: {
  value: UrgencyLevel;
  label: string;
  color: "default" | "warning" | "danger" | "success";
}[] = [
  { value: "ปกติ", label: "ปกติ", color: "success" },
  { value: "ด่วน", label: "ด่วน", color: "warning" },
  { value: "ฉุกเฉิน", label: "ฉุกเฉิน", color: "danger" },
];

/**
 * ประเภทรถเปล
 */
export const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  "รถนั่ง",
  "รถนอน",
  "รถกอล์ฟ",
];

/**
 * อุปกรณ์ที่ต้องการ
 */
export const EQUIPMENT_OPTIONS: EquipmentType[] = [
  "Oxygen",
  "Tube",
  "IV Pump",
  "Ventilator",
  "Monitor",
  "Suction",
];

/**
 * ฉลากแสดงผลสำหรับอุปกรณ์ (ภาษาไทย)
 */
export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  Oxygen: "Oxygen (ออกซิเจน)",
  Tube: "Tube (สายให้อาหาร)",
  "IV Pump": "IV Pump (เครื่องปั๊มสารน้ำ)",
  Ventilator: "Ventilator (เครื่องช่วยหายใจ)",
  Monitor: "Monitor (เครื่องวัดสัญญาณชีพ)",
  Suction: "Suction (เครื่องดูดเสมหะ)",
};

/**
 * ตัวเลือกเหตุผลการเคลื่อนย้าย
 */
export const TRANSPORT_REASON_OPTIONS = [
  "ผ่าตัด",
  "ตรวจพิเศษ (CT/MRI/X-Ray)",
  "รับการรักษา",
  "ย้ายห้อง/ตึก",
  "จำหน่ายผู้ป่วย",
  "ฉุกเฉิน",
  "อื่นๆ",
] as const;

/**
 * ตัวอย่างสถานที่ (ในระบบจริงควรดึงมาจาก API หรือ database)
 */
export const LOCATION_OPTIONS = [
  "ห้อง 101",
  "ห้อง 205",
  "ห้อง 302",
  "วอร์ด 4A",
  "ICU",
  "ER",
  "[188] [อาคารเฉลิมพระเกียรติ] X-ray",
  "[191] [อาคารเมตตาธรรม] X-ray",
  "OR-3",
  "OPD",
  "แผนกเภสัช",
  "คลังเวชภัณฑ์",
] as const;

/**
 * ตัวอย่างหน่วยงาน (ในระบบจริงควรดึงมาจาก API หรือ database)
 */
export const DEPARTMENT_OPTIONS = [
  "แผนกอายุรกรรม",
  "แผนกศัลยกรรม",
  "แผนกสูติ-นรีเวช",
  "แผนกกุมารเวช",
  "แผนกฉุกเฉิน",
  "แผนกไอซียู",
  "แผนกคลัง",
  "แผนกเภสัชกรรม",
] as const;

/**
 * ตัวอย่างชื่อผู้แจ้ง (สำหรับ mock data)
 */
export const SAMPLE_REQUESTER_NAMES = [
  "พยาบาล สมใจ",
  "พยาบาล สุดา",
  "พยาบาล วิชัย",
  "แพทย์ วิไล",
  "แพทย์ กนก",
  "เภสัชกร มาลี",
] as const;

/**
 * ข้อมูลเจ้าหน้าที่พนักงานเปล (ตัวอย่างข้อมูล - ในระบบจริงควรดึงมาจาก API)
 */
export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: "staff-1",
    name: "นายอริญชย์ ศรีชูเปี่ยม",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-2",
    name: "นายสมชาย ใจดี",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-3",
    name: "นางสาวสุดา รักงาน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-4",
    name: "นายวิชัย ขยัน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-5",
    name: "นางมาลี เก่งงาน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
];

/**
 * ========================================
 * VALIDATION FUNCTIONS
 * ========================================
 */

/**
 * Validation function for a single field
 */
export function validateField(
  field: keyof PorterRequestFormData,
  value: any,
): string | undefined {
  const stringValue = value != null ? String(value).trim() : "";

  switch (field) {
    case "requesterDepartment":
      return !stringValue ? "กรุณากรอกหน่วยงานผู้แจ้ง" : undefined;

    case "requesterName":
      return !stringValue ? "กรุณากรอกชื่อผู้แจ้ง" : undefined;

    case "requesterPhone":
      if (!stringValue) {
        return "กรุณากรอกเบอร์โทรติดต่อ";
      }

      if (!/^[0-9]{9,10}$/.test(stringValue.replace(/[- ]/g, ""))) {
        return "รูปแบบเบอร์โทรไม่ถูกต้อง";
      }

      return undefined;

    case "patientName":
      return !stringValue ? "กรุณากรอกชื่อผู้ป่วย" : undefined;

    case "patientHN":
      return !stringValue ? "กรุณากรอกหมายเลข HN" : undefined;

    case "pickupLocation":
      // Validate ผ่าน pickupLocationDetail แทน
      return !stringValue ? "กรุณาระบุสถานที่รับ" : undefined;

    case "deliveryLocation":
      // Validate ผ่าน deliveryLocationDetail แทน
      return !stringValue ? "กรุณาระบุสถานที่ส่ง" : undefined;

    case "requestedDateTime":
      return !stringValue
        ? "กรุณาระบุวันที่และเวลาที่ต้องการเคลื่อนย้าย"
        : undefined;

    case "transportReason":
      return !stringValue ? "กรุณากรอกรายการเหตุการเคลื่อนย้าย" : undefined;

    case "urgencyLevel":
      return !stringValue ? "กรุณาเลือกความเร่งด่วน" : undefined;

    case "vehicleType":
      return !stringValue ? "กรุณาเลือกประเภทรถ" : undefined;

    case "hasVehicle":
      return !stringValue ? "กรุณาระบุว่ามีรถแล้วหรือยัง" : undefined;

    case "returnTrip":
      return !stringValue ? "กรุณาระบุว่าต้องการส่งกลับหรือไม่" : undefined;

    default:
      return undefined;
  }
}

/**
 * Validate entire form (returns errors as Record<string, string> for HeroUI)
 */
export function validateForm(data: PorterRequestFormData): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const newErrors: Record<string, string> = {};

  const requiredFields: Array<keyof PorterRequestFormData> = [
    "requesterDepartment",
    "requesterName",
    "requesterPhone",
    "patientName",
    "patientHN",
    "pickupLocation",
    "deliveryLocation",
    "requestedDateTime",
    "transportReason",
    "urgencyLevel",
    "vehicleType",
    "hasVehicle",
    "returnTrip",
  ];

  requiredFields.forEach((field) => {
    // ตรวจสอบสถานที่ผ่าน Detail แทน string
    if (field === "pickupLocation") {
      const error = !data.pickupLocationDetail
        ? "กรุณาระบุสถานที่รับ"
        : undefined;
      if (error) {
        newErrors[field] = error;
      }
    } else if (field === "deliveryLocation") {
      const error = !data.deliveryLocationDetail
        ? "กรุณาระบุสถานที่ส่ง"
        : undefined;
      if (error) {
        newErrors[field] = error;
      }
    } else {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
      }
    }
  });

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}

/**
 * ========================================
 * SORTING FUNCTIONS
 * ========================================
 */

/**
 * Get urgency rank for sorting (lower = higher priority)
 */
export function getUrgencyRank(urgencyLevel: UrgencyLevel): number {
  return urgencyLevel === "ฉุกเฉิน" ? 0 : urgencyLevel === "ด่วน" ? 1 : 2;
}

/**
 * Sort jobs based on tab type
 * - waiting and in-progress tabs: sort by urgency then by time
 * - completed and cancelled tabs: sort by time only
 */
export function sortJobs(
  jobs: PorterJobItem[],
  tab: JobListTab,
): PorterJobItem[] {
  const toTime = (s: string) => new Date(s).getTime();

  // Tabs 1-2: waiting and in-progress - sort by urgency then by time
  if (tab === "waiting" || tab === "in-progress") {
    return [...jobs].sort((a, b) => {
      const rankA = getUrgencyRank(a.form.urgencyLevel as UrgencyLevel);
      const rankB = getUrgencyRank(b.form.urgencyLevel as UrgencyLevel);

      if (rankA !== rankB) return rankA - rankB;

      return (
        toTime(a.form.requestedDateTime) - toTime(b.form.requestedDateTime)
      );
    });
  }

  // Tabs 3-4: completed and cancelled - sort by time only (newest first)
  return [...jobs].sort(
    (a, b) =>
      toTime(b.form.requestedDateTime) - toTime(a.form.requestedDateTime),
  );
}

/**
 * ========================================
 * MOCK DATA GENERATION
 * ========================================
 */

/**
 * Generate a single emergency job (ฉุกเฉิน)
 */
export function generateSingleEmergencyJob(): PorterJobItem {
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

  // Always use "ฉุกเฉิน" for emergency jobs
  const urgencyLevel: UrgencyLevel = "ฉุกเฉิน";

  const pickup = choice(LOCATION_OPTIONS);
  let delivery = choice(LOCATION_OPTIONS);

  // Ensure pickup and delivery are different
  if (delivery === pickup) {
    const available = LOCATION_OPTIONS.filter((loc) => loc !== pickup);

    delivery = available.length > 0 ? choice(available) : pickup;
  }

  const now = new Date();

  now.setHours(randInt(6, 21), randInt(0, 59), 0, 0);

  // Emergency jobs typically need more equipment
  const equipmentCount = randInt(1, 4);
  const equipment: EquipmentType[] = Array.from(
    { length: equipmentCount },
    () => choice(EQUIPMENT_OPTIONS),
  ).filter((v, idx, arr) => arr.indexOf(v) === idx);

  // Generate unique ID based on timestamp
  const id = `emergency-${Date.now()}-${randInt(1000, 9999)}`;

  const form: PorterRequestFormData = {
    requesterDepartment: choice(DEPARTMENT_OPTIONS),
    requesterName: choice(SAMPLE_REQUESTER_NAMES),
    requesterPhone: `08${randInt(10000000, 99999999)}`,

    patientName: `ผู้ป่วยฉุกเฉิน ${randInt(1, 999)}`,
    patientHN: `${String(randInt(100000, 999999))}/${String(randInt(10, 99))}`,

    pickupLocation: pickup,
    deliveryLocation: delivery,
    requestedDateTime: getDateTimeLocal(now),
    urgencyLevel,
    vehicleType: choice(VEHICLE_TYPE_OPTIONS),
    equipment,
    hasVehicle: choice(["มี", "ไม่มี", ""] as const),
    returnTrip: choice(["ไปส่งอย่างเดียว", "รับกลับด้วย", ""] as const),

    transportReason: "ฉุกเฉิน",
    specialNotes: "กรณีฉุกเฉิน ต้องระวังอย่างใกล้ชิด",
    patientCondition: "สภาวะฉุกเฉิน ต้องเคลื่อนย้ายด่วน",
  };

  return {
    id,
    status: "waiting",
    form,
  };
}

/**
 * Generate a single random dummy job (ปกติ or ด่วน only)
 */
export function generateSingleDummyJob(): PorterJobItem {
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

  // Randomly choose between "ปกติ" and "ด่วน" (exclude "ฉุกเฉิน")
  const urgencyLevel: UrgencyLevel = Math.random() < 0.5 ? "ปกติ" : "ด่วน";

  const pickup = choice(LOCATION_OPTIONS);
  let delivery = choice(LOCATION_OPTIONS);

  // Ensure pickup and delivery are different
  if (delivery === pickup) {
    const available = LOCATION_OPTIONS.filter((loc) => loc !== pickup);

    delivery = available.length > 0 ? choice(available) : pickup;
  }

  const now = new Date();

  now.setHours(randInt(6, 21), randInt(0, 59), 0, 0);

  const equipmentCount = randInt(0, 3);
  const equipment: EquipmentType[] = Array.from(
    { length: equipmentCount },
    () => choice(EQUIPMENT_OPTIONS),
  ).filter((v, idx, arr) => arr.indexOf(v) === idx);

  // Generate unique ID based on timestamp
  const id = `job-${Date.now()}-${randInt(1000, 9999)}`;

  const form: PorterRequestFormData = {
    requesterDepartment: choice(DEPARTMENT_OPTIONS),
    requesterName: choice(SAMPLE_REQUESTER_NAMES),
    requesterPhone: `08${randInt(10000000, 99999999)}`,

    patientName: `ผู้ป่วย ${randInt(1, 999)}`,
    patientHN: `${String(randInt(100000, 999999))}/${String(randInt(10, 99))}`,

    pickupLocation: pickup,
    deliveryLocation: delivery,
    requestedDateTime: getDateTimeLocal(now),
    urgencyLevel,
    vehicleType: choice(VEHICLE_TYPE_OPTIONS),
    equipment,
    hasVehicle: choice(["มี", "ไม่มี", ""] as const),
    returnTrip: choice(["ไปส่งอย่างเดียว", "รับกลับด้วย", ""] as const),

    transportReason: choice(TRANSPORT_REASON_OPTIONS),
    specialNotes: Math.random() < 0.2 ? "เฝ้าระวัง O2 sat" : "",
    patientCondition:
      Math.random() < 0.5 ? "เดินไม่ได้ ต้องใช้รถนอน" : "รู้สึกตัวดี",
  };

  return {
    id,
    status: "waiting",
    form,
  };
}

/**
 * Generate mock porter job items for testing
 */
export function generateMockPorterJobs(count: number = 100): PorterJobItem[] {
  const statuses: JobListTab[] = [
    "waiting",
    "in-progress",
    "completed",
    "cancelled",
  ];

  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

  let urgentCount = 0; // "ฉุกเฉิน" ไม่เกิน 5
  let rushCount = 0; // "ด่วน" ไม่เกิน 10

  const items: PorterJobItem[] = Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const pickup = choice(LOCATION_OPTIONS);
    let delivery = choice(LOCATION_OPTIONS);

    // ตรวจสอบว่า pickup และ delivery ไม่เหมือนกัน
    if (delivery === pickup) {
      const available = LOCATION_OPTIONS.filter((loc) => loc !== pickup);

      delivery = available.length > 0 ? choice(available) : pickup;
    }

    const now = new Date();

    now.setHours(randInt(6, 21), randInt(0, 59), 0, 0);

    // เลือก urgencyLevel โดยจำกัดจำนวน
    let urgencyLevel: UrgencyLevel;
    const availableOptions: UrgencyLevel[] = [];

    if (urgentCount < 5) {
      availableOptions.push("ฉุกเฉิน");
    }
    if (rushCount < 10) {
      availableOptions.push("ด่วน");
    }
    availableOptions.push("ปกติ"); // "ปกติ" ไม่มีจำกัด

    urgencyLevel = choice(availableOptions);

    // อัพเดทตัวนับ
    if (urgencyLevel === "ฉุกเฉิน") {
      urgentCount++;
    } else if (urgencyLevel === "ด่วน") {
      rushCount++;
    }

    const equipmentCount = randInt(0, 3);
    const equipment: EquipmentType[] = Array.from(
      { length: equipmentCount },
      () => choice(EQUIPMENT_OPTIONS),
    ).filter((v, idx2, arr) => arr.indexOf(v) === idx2);

    const form: PorterRequestFormData = {
      requesterDepartment: choice(DEPARTMENT_OPTIONS),
      requesterName: choice(SAMPLE_REQUESTER_NAMES),
      requesterPhone: `08${randInt(10000000, 99999999)}`,

      patientName: `ผู้ป่วย ${idx}`,
      patientHN: `${String(randInt(100000, 999999))}/${String(
        randInt(10, 99),
      )}`,

      pickupLocation: pickup,
      deliveryLocation: delivery,
      requestedDateTime: getDateTimeLocal(now),
      urgencyLevel,
      vehicleType: choice(VEHICLE_TYPE_OPTIONS),
      equipment,
      hasVehicle: choice(["มี", "ไม่มี", ""] as const),
      returnTrip: choice(["ไปส่งอย่างเดียว", "รับกลับด้วย", ""] as const),

      transportReason: choice(TRANSPORT_REASON_OPTIONS),
      specialNotes: Math.random() < 0.2 ? "เฝ้าระวัง O2 sat" : "",
      patientCondition:
        Math.random() < 0.5 ? "เดินไม่ได้ ต้องใช้รถนอน" : "รู้สึกตัวดี",
    };

    return {
      id: String(idx),
      status: choice(statuses),
      form,
    };
  });

  return items;
}

/**
 * ========================================
 * PROTO CONVERSION FUNCTIONS
 * ========================================
 */

/**
 * แปลง Status จาก Frontend (waiting, in-progress, completed, cancelled) เป็น Proto enum
 */
export function mapStatusToProto(status: string): number {
  const map: Record<string, number> = {
    waiting: 0,
    "in-progress": 1,
    completed: 2,
    cancelled: 3,
  };
  return map[status] ?? 0;
}

/**
 * แปลง Urgency Level จาก Frontend (ภาษาไทย) เป็น Proto enum
 */
export function mapUrgencyLevelToProto(level: string): number {
  const map: Record<string, number> = {
    "ปกติ": 0,
    "ด่วน": 1,
    "ฉุกเฉิน": 2,
  };
  return map[level] ?? 0;
}

/**
 * แปลง Status จาก Proto enum เป็น Frontend format
 */
function mapStatusFromProto(status: number): string {
  const map: Record<number, string> = {
    0: "waiting",
    1: "in-progress",
    2: "completed",
    3: "cancelled",
  };
  return map[status] ?? "waiting";
}

/**
 * แปลง Urgency Level จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapUrgencyLevelFromProto(level: number): string {
  const map: Record<number, string> = {
    0: "ปกติ",
    1: "ด่วน",
    2: "ฉุกเฉิน",
  };
  return map[level] ?? "ปกติ";
}

/**
 * แปลง Vehicle Type จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapVehicleTypeFromProto(type: number): string {
  const map: Record<number, string> = {
    0: "รถนั่ง",
    1: "รถนอน",
    2: "รถกอล์ฟ",
  };
  return map[type] ?? "รถนั่ง";
}

/**
 * แปลง Has Vehicle จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapHasVehicleFromProto(hasVehicle: number): string {
  const map: Record<number, string> = {
    0: "มี",
    1: "ไม่มี",
  };
  return map[hasVehicle] ?? "ไม่มี";
}

/**
 * แปลง Return Trip จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapReturnTripFromProto(returnTrip: number): string {
  const map: Record<number, string> = {
    0: "ไปส่งอย่างเดียว",
    1: "รับกลับด้วย",
  };
  return map[returnTrip] ?? "ไปส่งอย่างเดียว";
}

/**
 * แปลง Equipment array จาก Proto enum array เป็น Frontend format
 */
function mapEquipmentFromProto(equipment: number[]): string[] {
  const map: Record<number, string> = {
    0: "Oxygen",
    1: "Tube",
    2: "IV Pump",
    3: "Ventilator",
    4: "Monitor",
    5: "Suction",
  };
  return equipment.map((eq) => map[eq] ?? "Oxygen").filter(Boolean);
}

/**
 * แปลงข้อมูลจาก Proto format เป็น Frontend format
 */
export function convertProtoToFrontend(protoData: any): PorterJobItem {
  return {
    id: protoData.id,
    status: mapStatusFromProto(protoData.status),
    form: {
      requesterDepartment: protoData.requester_department,
      requesterName: protoData.requester_name,
      requesterPhone: protoData.requester_phone,
      patientName: protoData.patient_name,
      patientHN: protoData.patient_hn,
      pickupLocation: protoData.pickup_location,
      pickupLocationDetail: protoData.pickup_building_id
        ? {
            buildingId: protoData.pickup_building_id,
            buildingName: protoData.pickup_building_name,
            floorDepartmentId: protoData.pickup_floor_department_id,
            floorDepartmentName: protoData.pickup_floor_department_name,
            roomBedId: protoData.pickup_room_bed_id || undefined,
            roomBedName: protoData.pickup_room_bed_name || undefined,
          }
        : null,
      deliveryLocation: protoData.delivery_location,
      deliveryLocationDetail: protoData.delivery_building_id
        ? {
            buildingId: protoData.delivery_building_id,
            buildingName: protoData.delivery_building_name,
            floorDepartmentId: protoData.delivery_floor_department_id,
            floorDepartmentName: protoData.delivery_floor_department_name,
            roomBedId: protoData.delivery_room_bed_id || undefined,
            roomBedName: protoData.delivery_room_bed_name || undefined,
          }
        : null,
      requestedDateTime: protoData.requested_date_time,
      urgencyLevel: mapUrgencyLevelFromProto(protoData.urgency_level),
      vehicleType: mapVehicleTypeFromProto(protoData.vehicle_type),
      hasVehicle: mapHasVehicleFromProto(protoData.has_vehicle),
      returnTrip: mapReturnTripFromProto(protoData.return_trip),
      transportReason: protoData.transport_reason,
      equipment: mapEquipmentFromProto(protoData.equipment || []),
      specialNotes: protoData.special_notes || "",
      patientCondition: protoData.patient_condition || "",
      assignedToName: protoData.assigned_to_name || undefined,
    },
    assignedTo: protoData.assigned_to_id || undefined,
    assignedToName: protoData.assigned_to_name || undefined,
  };
}

/**
 * ========================================
 * SOUND UTILITIES
 * ========================================
 */

/**
 * Play notification sound (bell sound)
 */
export function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // สร้างเสียงกลิ่งด้วย multiple oscillators (harmonic tones)
    const createBellTone = (
      baseFreq: number,
      time: number,
      duration: number,
    ) => {
      const frequencies = [baseFreq, baseFreq * 2.76, baseFreq * 5.4]; // Harmonic overtones
      const amplitudes = [0.5, 0.25, 0.15];

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, time);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(amplitudes[index], time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(time);
        oscillator.stop(time + duration);
      });
    };

    const now = audioContext.currentTime;
    const intervalBetweenRounds = 0.2; // เวลาระหว่างรอบ (วินาที)

    // เล่นเสียง 2 รอบ
    for (let round = 0; round < 2; round++) {
      const roundStartTime = now + round * (0.1 + intervalBetweenRounds);

      // เสียงกลิ่งครั้งแรก
      createBellTone(800, roundStartTime, 0.1);
      // เสียงกลิ่งครั้งที่สอง (ตามหลัง)
      createBellTone(1000, roundStartTime + 0.15, 0.25);
    }
  } catch {
    // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
    // จะไม่แสดง error
  }
}

/**
 * Play siren sound (for emergency cases)
 */
export function playSirenSound(): void {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const now = audioContext.currentTime;
    const duration = 1.5; // ความยาวแต่ละรอบ (วินาที)
    const cycles = 3; // จำนวนรอบไซเรน

    for (let cycle = 0; cycle < cycles; cycle++) {
      const cycleStartTime = now + cycle * (duration + 0.2);

      // สร้างเสียงไซเรนด้วยการปรับความถี่ขึ้น-ลง (sweep)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sawtooth"; // ใช้ sawtooth เพื่อให้เสียงคมชัดเหมือนไซเรน
      oscillator.frequency.setValueAtTime(600, cycleStartTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        1400,
        cycleStartTime + duration / 2,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        600,
        cycleStartTime + duration,
      );

      gainNode.gain.setValueAtTime(0, cycleStartTime);
      gainNode.gain.linearRampToValueAtTime(0.6, cycleStartTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(
        0.6,
        cycleStartTime + duration - 0.05,
      );
      gainNode.gain.linearRampToValueAtTime(0, cycleStartTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(cycleStartTime);
      oscillator.stop(cycleStartTime + duration);
    }
  } catch {
    // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
    // จะไม่แสดง error
  }
}
