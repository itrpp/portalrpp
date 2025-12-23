import {
  UrgencyLevel,
  VehicleType,
  EquipmentType,
  PorterJobItem,
  PorterRequestFormData,
  JobListTab,
  Building,
  FloorDepartment,
  RoomBed,
  FloorPlan,
  BleStation,
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
  "ถังออกซิเจน (ออกซิเจนCannula / mask with bag)",
  "เสาน้ำเกลือ",
  "กล่องวางขวด ICD",
  "ผ้าผูกตรึงร่างกาย",
  "อื่นๆ ระบุ",
];

/**
 * อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล
 */
export const PATIENT_CONDITION_OPTIONS = [
  "รู้สึกตัวดี ช่วยเหลือตัวเองได้",
  "เดินไม่ได้ อ่อนแรง",
  "หายใจลำบาก / ใช้ O2 / On HFNC / On Tube / Ventilator",
  "ผู้ป่วยหลังผ่าตัด / เสี่ยงเจ็บแผล",
  "มีอาการมึนงง / ซึม / มีโอกาสล้มหรือตกเตียง",
  "ต้องยึด / ตรึงแขนขาหรือเฝ้าระวังท่อ",
  "มีติดตามอุปกรณ์ทางการแพทย์ (สาย IV / Foley / NG / Drain ฯลฯ)",
  "ผู้ป่วยวิกฤตมี Monitor ติดตามสัญญาณชีพ",
] as const;

/**
 * ตัวเลือกเหตุผลการเคลื่อนย้าย
 */
export const TRANSPORT_REASON_OPTIONS = [
  "รับผู้ป่วยเข้าหอผู้ป่วย (Admission)",
  "เคลื่อนย้ายต่างหน่วยงาน (ส่งผู้ป่วยไปหน่วยงานอื่น)",
  "เคลื่อนย้ายภายในหน่วยงาน (เปลี่ยนเตียง/เคลื่อนเข้าห้องแยก)",
  "ส่งผู้ป่วยไปตรวจวินิจฉัย (ปรึกษาทางคลินิก/X-Ray/CT/MRI/US/Echo/Lab)",
  "ส่งผู้ป่วยไปห้องผ่าตัด/ทำหัตถการ ",
  "ส่งผู้ป่วยกลับหอผู้ป่วย/กลับบ้าน (Discharge)",
  "ส่งผู้ป่วย Refer ไปสถานพยาบาลอื่น/ศูนย์เวชศาสตร์เมืองราชพิพัฒน์ฯ",
] as const;

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
    case "requesterName":
      return !stringValue ? "กรุณากรอกชื่อผู้แจ้ง" : undefined;

    case "requesterPhone":
      if (!stringValue) {
        return "กรุณากรอกโทรศัพท์ภายใน";
      }

      const phoneDigits = stringValue.replace(/[- ]/g, "");

      if (phoneDigits.length < 3) {
        return "โทรศัพท์ภายในต้องระบุอย่างน้อย 3 หลัก";
      }

      return undefined;

    case "patientName":
      return !stringValue ? "กรุณากรอกชื่อผู้ป่วย" : undefined;

    case "patientHN":
      return !stringValue ? "กรุณากรอกหมายเลข HN" : undefined;

    case "patientHN":
      return !stringValue ? "กรุณากรอกหมายเลข HN" : undefined;

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
    "requesterName",
    "requesterPhone",
    "patientName",
    "patientHN",
    "patientName",
    "patientHN",
    "requestedDateTime",
    "transportReason",
    "urgencyLevel",
    "vehicleType",
    "hasVehicle",
    "returnTrip",
  ];

  requiredFields.forEach((field) => {
    const error = validateField(field, data[field]);

    if (error) {
      newErrors[field] = error;
    }
  });

  // Validate Pickup Location
  if (!data.pickupLocationDetail) {
    newErrors["pickupLocation"] = "กรุณาระบุสถานที่รับ";
  }

  // Validate Delivery Location
  if (!data.deliveryLocationDetail) {
    newErrors["deliveryLocation"] = "กรุณาระบุสถานที่ส่ง";
  } else {
    const delivery = data.deliveryLocationDetail;

    if (delivery.buildingName === "โรงพยาบาลอื่น") {
      // Strict check on specialNotes for "Other Hospital"
      if (!data.specialNotes || !data.specialNotes.trim()) {
        newErrors["specialNotes"] =
          "กรุณาระบุชื่อโรงพยาบาลปลายทางในช่องรายละเอียดเพิ่มเติม";
      }
    }
  }

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
 * PROTO CONVERSION FUNCTIONS
 * ========================================
 */

/**
 * แปลง Status จาก Frontend (waiting, in-progress, completed, cancelled) เป็น Proto string
 */
export function mapStatusToProto(status: string): string {
  const map: Record<string, string> = {
    waiting: "WAITING",
    "in-progress": "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };

  return map[status] ?? "WAITING";
}

/**
 * แปลง Urgency Level จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapUrgencyLevelToProto(level: string): string {
  const map: Record<string, string> = {
    ปกติ: "NORMAL",
    ด่วน: "RUSH",
    ฉุกเฉิน: "EMERGENCY",
  };

  return map[level] ?? "NORMAL";
}

/**
 * แปลง Vehicle Type จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapVehicleTypeToProto(type: string): string {
  const map: Record<string, string> = {
    รถนั่ง: "SITTING",
    รถนอน: "LYING",
    รถกอล์ฟ: "GOLF",
  };

  return map[type] ?? "SITTING";
}

/**
 * แปลง Has Vehicle จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapHasVehicleToProto(hasVehicle: string): string {
  const map: Record<string, string> = {
    มี: "YES",
    ไม่มี: "NO",
  };

  return map[hasVehicle] ?? "NO";
}

/**
 * แปลง Return Trip จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapReturnTripToProto(returnTrip: string): string {
  const map: Record<string, string> = {
    ไปส่งอย่างเดียว: "ONE_WAY",
    รับกลับด้วย: "ROUND_TRIP",
  };

  return map[returnTrip] ?? "ONE_WAY";
}

/**
 * แปลง Equipment array จาก Frontend เป็น Proto string array
 */
export function mapEquipmentToProto(equipment: string[]): string[] {
  const map: Record<string, string> = {
    "ถังออกซิเจน (ออกซิเจนCannula / mask with bag)": "OXYGEN",
    เสาน้ำเกลือ: "SALINE_POLE",
    "กล่องวางขวด ICD": "ICD_BOX",
    ผ้าผูกตรึงร่างกาย: "CLOTH_TIED",
    "อื่นๆ ระบุ": "OTHER",
  };

  return equipment
    .map((eq) => map[eq])
    .filter((val): val is string => val !== undefined);
}

/**
 * แปลง Status จาก Proto string เป็น Frontend format
 */
function mapStatusFromProto(status: string | number): JobListTab {
  // รองรับทั้ง string และ number (backward compatibility)
  if (typeof status === "number") {
    const map: Record<number, JobListTab> = {
      0: "waiting",
      1: "in-progress",
      2: "completed",
      3: "cancelled",
    };

    return map[status] ?? "waiting";
  }

  const map: Record<string, JobListTab> = {
    WAITING: "waiting",
    IN_PROGRESS: "in-progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  };

  return map[status] ?? "waiting";
}

/**
 * แปลง Urgency Level จาก Proto string เป็น Frontend (ภาษาไทย)
 */
function mapUrgencyLevelFromProto(level: string | number): UrgencyLevel {
  if (typeof level === "number") {
    const map: Record<number, UrgencyLevel> = {
      0: "ปกติ",
      1: "ด่วน",
      2: "ฉุกเฉิน",
    };

    return map[level] ?? "ปกติ";
  }

  const map: Record<string, UrgencyLevel> = {
    NORMAL: "ปกติ",
    RUSH: "ด่วน",
    EMERGENCY: "ฉุกเฉิน",
  };

  return map[level] ?? "ปกติ";
}

/**
 * แปลง Vehicle Type จาก Proto string เป็น Frontend (ภาษาไทย)
 */
function mapVehicleTypeFromProto(type: string | number): VehicleType {
  if (typeof type === "number") {
    const map: Record<number, VehicleType> = {
      0: "รถนั่ง",
      1: "รถนอน",
      2: "รถกอล์ฟ",
    };

    return map[type] ?? "รถนั่ง";
  }

  const map: Record<string, VehicleType> = {
    SITTING: "รถนั่ง",
    LYING: "รถนอน",
    GOLF: "รถกอล์ฟ",
  };

  return map[type] ?? "รถนั่ง";
}

/**
 * แปลง Has Vehicle จาก Proto string เป็น Frontend (ภาษาไทย)
 */
function mapHasVehicleFromProto(
  hasVehicle: string | number,
): "มี" | "ไม่มี" | "" {
  if (typeof hasVehicle === "number") {
    const map: Record<number, "มี" | "ไม่มี"> = {
      0: "มี",
      1: "ไม่มี",
    };

    return map[hasVehicle] ?? "";
  }

  const map: Record<string, "มี" | "ไม่มี"> = {
    YES: "มี",
    NO: "ไม่มี",
  };

  return map[hasVehicle] ?? "";
}

/**
 * แปลง Return Trip จาก Proto string เป็น Frontend (ภาษาไทย)
 */
function mapReturnTripFromProto(
  returnTrip: string | number,
): "ไปส่งอย่างเดียว" | "รับกลับด้วย" | "" {
  if (typeof returnTrip === "number") {
    const map: Record<number, "ไปส่งอย่างเดียว" | "รับกลับด้วย"> = {
      0: "ไปส่งอย่างเดียว",
      1: "รับกลับด้วย",
    };

    return map[returnTrip] ?? "";
  }

  const map: Record<string, "ไปส่งอย่างเดียว" | "รับกลับด้วย"> = {
    ONE_WAY: "ไปส่งอย่างเดียว",
    ROUND_TRIP: "รับกลับด้วย",
  };

  return map[returnTrip] ?? "";
}

/**
 * แปลง Equipment array จาก Proto string array เป็น Frontend format
 */
function mapEquipmentFromProto(
  equipment: string[] | number[],
): EquipmentType[] {
  // ถ้าเป็น number array (backward compatibility)
  if (equipment.length > 0 && typeof equipment[0] === "number") {
    const map: Record<number, EquipmentType> = {
      0: "ถังออกซิเจน (ออกซิเจนCannula / mask with bag)",
      1: "เสาน้ำเกลือ",
      2: "กล่องวางขวด ICD",
      3: "ผ้าผูกตรึงร่างกาย",
      4: "อื่นๆ ระบุ",
    };

    return (equipment as number[])
      .map((eq) => map[eq] ?? "ถังออกซิเจน (ออกซิเจนCannula/mask with bag)")
      .filter((eq): eq is EquipmentType => Boolean(eq));
  }

  // ถ้าเป็น string array (รองรับทั้ง proto enum และ string ภาษาไทย)
  const map: Record<string, EquipmentType> = {
    OXYGEN: "ถังออกซิเจน (ออกซิเจนCannula / mask with bag)",
    SALINE_POLE: "เสาน้ำเกลือ",
    ICD_BOX: "กล่องวางขวด ICD",
    CLOTH_TIED: "ผ้าผูกตรึงร่างกาย",
    OTHER: "อื่นๆ ระบุ",
  };

  return (equipment as string[])
    .map((eq) => {
      // ถ้าเป็นค่าที่มีใน map ให้แปลง
      if (map[eq]) {
        return map[eq];
      }

      // ถ้าเป็นค่าที่ตรงกับ EquipmentType อยู่แล้ว (string ภาษาไทย) ให้ใช้เลย
      return eq as EquipmentType;
    })
    .filter((eq): eq is EquipmentType => eq !== undefined);
}

/**
 * แปลงข้อมูลจาก Proto format เป็น Frontend format
 */
export function convertProtoToFrontend(protoData: any): PorterJobItem {
  if (!protoData) {
    throw new Error("protoData is null or undefined");
  }

  return {
    id: protoData.id,
    status: mapStatusFromProto(protoData.status),
    form: {
      requesterDepartment:
        protoData.requester_department !== null &&
        protoData.requester_department !== undefined
          ? typeof protoData.requester_department === "number"
            ? protoData.requester_department
            : Number.parseInt(String(protoData.requester_department), 10) ||
              null
          : protoData.requesterDepartment !== null &&
              protoData.requesterDepartment !== undefined
            ? typeof protoData.requesterDepartment === "number"
              ? protoData.requesterDepartment
              : Number.parseInt(String(protoData.requesterDepartment), 10) ||
                null
            : null,
      requesterName: protoData.requester_name || protoData.requesterName || "",
      requesterPhone:
        protoData.requester_phone || protoData.requesterPhone || "",
      patientName: protoData.patient_name || protoData.patientName || "",
      patientHN: protoData.patient_hn || protoData.patientHN || "",
      pickupLocationDetail:
        protoData.pickup_building_id || protoData.pickupBuildingId
          ? {
              buildingId:
                protoData.pickup_building_id || protoData.pickupBuildingId,
              buildingName:
                protoData.pickup_building_name ||
                protoData.pickupBuildingName ||
                "",
              floorDepartmentId:
                protoData.pickup_floor_department_id ||
                protoData.pickupFloorDepartmentId,
              floorDepartmentName:
                protoData.pickup_floor_department_name ||
                protoData.pickupFloorDepartmentName ||
                "",
              roomBedId: undefined, // ไม่มีใน proto แล้ว
              roomBedName:
                protoData.pickup_room_bed_name ||
                protoData.pickupRoomBedName ||
                undefined,
            }
          : null,
      deliveryLocationDetail:
        protoData.delivery_building_id || protoData.deliveryBuildingId
          ? {
              buildingId:
                protoData.delivery_building_id || protoData.deliveryBuildingId,
              buildingName:
                protoData.delivery_building_name ||
                protoData.deliveryBuildingName ||
                "",
              floorDepartmentId:
                protoData.delivery_floor_department_id ||
                protoData.deliveryFloorDepartmentId,
              floorDepartmentName:
                protoData.delivery_floor_department_name ||
                protoData.deliveryFloorDepartmentName ||
                "",
              roomBedId: undefined, // ไม่มีใน proto แล้ว
              roomBedName:
                protoData.delivery_room_bed_name ||
                protoData.deliveryRoomBedName ||
                undefined,
            }
          : null,
      requestedDateTime:
        protoData.requested_date_time || protoData.requestedDateTime || "",
      urgencyLevel: mapUrgencyLevelFromProto(
        protoData.urgency_level || protoData.urgencyLevel,
      ),
      vehicleType: mapVehicleTypeFromProto(
        protoData.vehicle_type || protoData.vehicleType,
      ),
      hasVehicle: mapHasVehicleFromProto(
        protoData.has_vehicle || protoData.hasVehicle,
      ),
      returnTrip: mapReturnTripFromProto(
        protoData.return_trip || protoData.returnTrip,
      ),
      transportReason:
        protoData.transport_reason || protoData.transportReason || "",
      equipment: mapEquipmentFromProto(protoData.equipment || []),
      equipmentOther:
        protoData.equipment_other || protoData.equipmentOther || undefined,
      specialNotes: protoData.special_notes || protoData.specialNotes || "",
      patientCondition: Array.isArray(protoData.patient_condition)
        ? protoData.patient_condition
        : protoData.patient_condition
          ? protoData.patient_condition.split(", ").filter(Boolean)
          : Array.isArray(protoData.patientCondition)
            ? protoData.patientCondition
            : protoData.patientCondition
              ? protoData.patientCondition.split(", ").filter(Boolean)
              : [],
    },
    assignedTo: protoData.assigned_to_id || protoData.assignedToId || undefined,
    assignedToName:
      protoData.assigned_to_name || protoData.assignedToName || undefined,
    createdAt: protoData.created_at || protoData.createdAt || undefined,
    updatedAt: protoData.updated_at || protoData.updatedAt || undefined,
    acceptedAt: protoData.accepted_at || protoData.acceptedAt || undefined,
    acceptedById:
      protoData.accepted_by_id || protoData.acceptedById || undefined,
    completedAt: protoData.completed_at || protoData.completedAt || undefined,
    cancelledAt: protoData.cancelled_at || protoData.cancelledAt || undefined,
    cancelledReason:
      protoData.cancelled_reason || protoData.cancelledReason || undefined,
    cancelledById:
      protoData.cancelled_by_id || protoData.cancelledById || undefined,
    pickupAt: protoData.pickup_at || protoData.pickupAt || undefined,
    deliveryAt: protoData.delivery_at || protoData.deliveryAt || undefined,
    returnAt: protoData.return_at || protoData.returnAt || undefined,
  };
}

/**
 * ========================================
 * LOCATION SETTINGS CONVERSION FUNCTIONS
 * ========================================
 */

/**
 * แปลง RoomBed จาก Proto format เป็น Frontend format
 */
export function convertRoomBedFromProto(protoData: any): RoomBed {
  return {
    id: protoData.id,
    name: protoData.name,
  };
}

/**
 * แปลง FloorDepartment จาก Proto format เป็น Frontend format
 */
export function convertFloorDepartmentFromProto(
  protoData: any,
): FloorDepartment {
  return {
    id: protoData.id,
    name: protoData.name,
    floorNumber: protoData.floor_number ?? undefined,
    departmentType: Number(protoData.department_type),
    roomType: protoData.room_type ? Number(protoData.room_type) : undefined,
    roomCount: protoData.room_count ?? undefined,
    bedCount: protoData.bed_count ?? undefined,
    status: protoData.status !== undefined ? Boolean(protoData.status) : true,
    rooms: protoData.rooms?.map((r: any) => convertRoomBedFromProto(r)) || [],
  };
}

/**
 * แปลง Building จาก Proto format เป็น Frontend format
 */
export function convertBleStationFromProto(protoData: any): BleStation {
  return {
    id: protoData.id,
    floorPlanId: protoData.floor_plan_id,
    name: protoData.name,
    macAddress: protoData.mac_address,
    uuid: protoData.uuid,
    positionX: protoData.position_x,
    positionY: protoData.position_y,
    signalStrength: protoData.signal_strength,
    batteryLevel: protoData.battery_level,
    status: protoData.status !== undefined ? Boolean(protoData.status) : true,
    createdAt: protoData.created_at,
    updatedAt: protoData.updated_at,
  };
}

export function convertFloorPlanFromProto(protoData: any): FloorPlan {
  return {
    id: protoData.id,
    buildingId: protoData.building_id,
    floorNumber: protoData.floor_number,
    imageData: protoData.image_data,
    stations:
      protoData.stations?.map((s: any) => convertBleStationFromProto(s)) || [],
    createdAt: protoData.created_at,
    updatedAt: protoData.updated_at,
  };
}

export function convertBuildingFromProto(protoData: any): Building {
  return {
    id: protoData.id,
    name: protoData.name,
    floorCount: protoData.floor_count ?? undefined,
    floorPlans:
      protoData.floor_plans?.map((fp: any) => convertFloorPlanFromProto(fp)) ||
      [],
    status: protoData.status !== undefined ? Boolean(protoData.status) : true,
    floors:
      protoData.floors?.map((f: any) => convertFloorDepartmentFromProto(f)) ||
      [],
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

    // ใช้ Promise เพื่อรอให้ AudioContext resume ก่อนเล่นเสียง
    const playSound = () => {
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
    };

    if (audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(playSound)
        .catch(() => {
          // ถ้าไม่สามารถ resume ได้ จะไม่แสดง error
        });
    } else {
      playSound();
    }
  } catch (error) {
    // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
    // จะไม่แสดง error
    console.warn("[Sound] Failed to play notification sound:", error);
  }
}

/**
 * Play siren sound (for emergency cases)
 */
export function playSirenSound(): void {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // ใช้ Promise เพื่อรอให้ AudioContext resume ก่อนเล่นเสียง
    const playSound = () => {
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
    };

    if (audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(playSound)
        .catch(() => {
          // ถ้าไม่สามารถ resume ได้ จะไม่แสดง error
        });
    } else {
      playSound();
    }
  } catch (error) {
    // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
    // จะไม่แสดง error
    console.warn("[Sound] Failed to play siren sound:", error);
  }
}
