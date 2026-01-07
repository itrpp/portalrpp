import {
  BookingPurpose,
  EMRCStatus,
  RequiredEquipment,
  InfectionStatus,
  ConditionType,
  EMRCRequestFormData,
  EMRCRequestItem,
} from "@/types/emrc";

/**
 * ตัวเลือกวัตถุประสงค์การจองรถ
 */
export const BOOKING_PURPOSE_OPTIONS: BookingPurpose[] = [
  "ส่งกลับบ้าน",
  "ย้ายหอผู้ป่วย",
  "ส่งตรวจ",
  "REFER IN",
  "REFER OUT",
  "CT",
  "ล้างไต",
  "อื่นๆ",
];

/**
 * อุปกรณ์ที่จำเป็น
 */
export const REQUIRED_EQUIPMENT_OPTIONS: RequiredEquipment[] = [
  "Room air",
  "IV",
  "Oxygen",
  "HFNC",
  "Ventilator",
  "Monitor",
  "Defibrillator",
];

/**
 * สถานะการติดเชื้อ
 */
export const INFECTION_STATUS_OPTIONS: InfectionStatus[] = [
  "เชื้อดื้อยา",
  "TB",
  "COVID-19",
  "Flu A,B",
  "RSV",
  "ไม่มี",
  "อื่นๆ",
];

/**
 * ประเภทเงื่อนไข
 */
export const CONDITION_TYPE_OPTIONS: ConditionType[] = [
  "ผู้สูงอายุ",
  "ผู้พิการ",
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
  field: keyof EMRCRequestFormData,
  value: any,
  bookingPurpose?: BookingPurpose,
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

    case "requestDate":
      return !stringValue ? "กรุณาระบุวันที่" : undefined;

    case "requestTime":
      return !stringValue ? "กรุณาระบุเวลา" : undefined;

    case "bookingPurpose":
      return !stringValue ? "กรุณาเลือกวัตถุประสงค์การจองรถ" : undefined;

    case "acknowledged":
      if (bookingPurpose === "ส่งกลับบ้าน" && !value) {
        return "กรุณายืนยันการรับทราบข้อกำหนดพื้นที่ให้บริการ";
      }
      return undefined;

    // Validation สำหรับฟิลด์ที่แสดงเมื่อเลือก "ส่งกลับบ้าน"
    case "patientName":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอกชื่อ - นามสกุล ผู้ป่วย";
      }
      return undefined;

    case "patientBirthDate":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณาระบุวัน-เดือน-ปีเกิด ผู้ป่วย";
      }
      return undefined;

    case "destinationAddress":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณาระบุที่อยู่ปัจจุบัน // สถานที่ปลายทางที่ต้องการไป";
      }
      return undefined;

    case "patientRights":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอกสิทธิ์รักษาผู้ป่วย";
      }
      return undefined;

    case "patientHN":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอก HN";
      }
      return undefined;

    case "patientCitizenId":
      if (bookingPurpose === "ส่งกลับบ้าน") {
        if (!stringValue) {
          return "กรุณากรอกเลขบัตรประชาชน 13 หลัก";
        }
        if (stringValue.length !== 13 || !/^\d+$/.test(stringValue)) {
          return "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
        }
      }
      return undefined;

    case "patientPhone":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอกเบอร์โทรญาติผู้ป่วยหรือผู้ป่วย";
      }
      return undefined;

    case "requiredEquipment":
      if (bookingPurpose === "ส่งกลับบ้าน" && (!Array.isArray(value) || value.length === 0)) {
        return "กรุณาเลือกอุปกรณ์ที่จำเป็น";
      }
      return undefined;

    case "infectionStatus":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณาเลือกการติดเชื้อ";
      }
      return undefined;

    case "departmentPhone":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอกเบอร์โทรหน่วยงาน IP phone เท่านั้น";
      }
      return undefined;

    case "requesterNameDetail":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณากรอกชื่อผู้ขอใช้รถ";
      }
      return undefined;

    case "conditionType":
      if (bookingPurpose === "ส่งกลับบ้าน" && !stringValue) {
        return "กรุณาเลือกเงื่อนไขการขอใช้รถพยาบาล";
      }
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Validate entire form (returns errors as Record<string, string> for HeroUI)
 */
export function validateForm(
  data: EMRCRequestFormData,
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const newErrors: Record<string, string> = {};

  const requiredFields: Array<keyof EMRCRequestFormData> = [
    "requesterName",
    "requesterPhone",
    "requestDate",
    "requestTime",
    "bookingPurpose",
  ];

  requiredFields.forEach((field) => {
    const error = validateField(field, data[field], data.bookingPurpose as BookingPurpose);
    if (error) {
      newErrors[field] = error;
    }
  });

  // Validate fields สำหรับ "ส่งกลับบ้าน"
  if (data.bookingPurpose === "ส่งกลับบ้าน") {
    const sendHomeFields: Array<keyof EMRCRequestFormData> = [
      "patientName",
      "patientBirthDate",
      "destinationAddress",
      "patientRights",
      "patientHN",
      "patientCitizenId",
      "patientPhone",
      "requiredEquipment",
      "infectionStatus",
      "departmentPhone",
      "requesterNameDetail",
      "conditionType",
      "acknowledged",
    ];

    sendHomeFields.forEach((field) => {
      const error = validateField(field, data[field], data.bookingPurpose as BookingPurpose);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Validate infectionStatusOther if infectionStatus is "อื่นๆ"
    if (data.infectionStatus === "อื่นๆ" && !data.infectionStatusOther?.trim()) {
      newErrors["infectionStatusOther"] = "กรุณาระบุการติดเชื้ออื่นๆ";
    }

    // Validate bookingPurposeOther if bookingPurpose is "อื่นๆ"
    if (data.bookingPurpose === "อื่นๆ" && !data.bookingPurposeOther?.trim()) {
      newErrors["bookingPurposeOther"] = "กรุณาระบุวัตถุประสงค์อื่นๆ";
    }
  }

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}

/**
 * ========================================
 * PROTO CONVERSION FUNCTIONS
 * ========================================
 */

/**
 * แปลง Booking Purpose จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapBookingPurposeToProto(purpose: string): string {
  const map: Record<string, string> = {
    "ส่งกลับบ้าน": "SEND_HOME",
    "ย้ายหอผู้ป่วย": "TRANSFER_WARD",
    "ส่งตรวจ": "SEND_EXAM",
    "REFER IN": "REFER_IN",
    "REFER OUT": "REFER_OUT",
    CT: "CT",
    "ล้างไต": "DIALYSIS",
    "อื่นๆ": "OTHER",
  };

  return map[purpose] ?? "SEND_HOME";
}

/**
 * แปลง Booking Purpose จาก Proto string เป็น Frontend (ภาษาไทย)
 */
export function mapBookingPurposeFromProto(purpose: string | number): BookingPurpose {
  if (typeof purpose === "number") {
    const map: Record<number, BookingPurpose> = {
      0: "ส่งกลับบ้าน",
      1: "ย้ายหอผู้ป่วย",
      2: "ส่งตรวจ",
      3: "REFER IN",
      4: "REFER OUT",
      5: "CT",
      6: "ล้างไต",
      7: "อื่นๆ",
    };
    return map[purpose] ?? "ส่งกลับบ้าน";
  }

  const map: Record<string, BookingPurpose> = {
    SEND_HOME: "ส่งกลับบ้าน",
    TRANSFER_WARD: "ย้ายหอผู้ป่วย",
    SEND_EXAM: "ส่งตรวจ",
    REFER_IN: "REFER IN",
    REFER_OUT: "REFER OUT",
    CT: "CT",
    DIALYSIS: "ล้างไต",
    OTHER: "อื่นๆ",
  };

  return map[purpose] ?? "ส่งกลับบ้าน";
}

/**
 * แปลง Status จาก Proto string เป็น Frontend format
 */
export function mapStatusFromProto(status: string | number): EMRCStatus {
  if (typeof status === "number") {
    const map: Record<number, EMRCStatus> = {
      0: "WAITING",
      1: "IN_PROGRESS",
      2: "COMPLETED",
      3: "CANCELLED",
    };
    return map[status] ?? "WAITING";
  }

  const map: Record<string, EMRCStatus> = {
    WAITING: "WAITING",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };

  return map[status] ?? "WAITING";
}

/**
 * แปลง Required Equipment array จาก Frontend เป็น Proto string array
 */
export function mapRequiredEquipmentToProto(equipment: string[]): string[] {
  const map: Record<string, string> = {
    "Room air": "ROOM_AIR",
    IV: "IV",
    Oxygen: "OXYGEN",
    HFNC: "HFNC",
    Ventilator: "VENTILATOR",
    Monitor: "MONITOR",
    Defibrillator: "DEFIBRILLATOR",
  };

  return equipment
    .map((eq) => map[eq])
    .filter((val): val is string => val !== undefined);
}

/**
 * แปลง Required Equipment array จาก Proto string array เป็น Frontend format
 */
export function mapRequiredEquipmentFromProto(
  equipment: string[] | number[],
): RequiredEquipment[] {
  if (equipment.length > 0 && typeof equipment[0] === "number") {
    const map: Record<number, RequiredEquipment> = {
      0: "Room air",
      1: "IV",
      2: "Oxygen",
      3: "HFNC",
      4: "Ventilator",
      5: "Monitor",
      6: "Defibrillator",
    };

    return (equipment as number[])
      .map((eq) => map[eq])
      .filter((eq): eq is RequiredEquipment => Boolean(eq));
  }

  const map: Record<string, RequiredEquipment> = {
    ROOM_AIR: "Room air",
    IV: "IV",
    OXYGEN: "Oxygen",
    HFNC: "HFNC",
    VENTILATOR: "Ventilator",
    MONITOR: "Monitor",
    DEFIBRILLATOR: "Defibrillator",
  };

  return (equipment as string[])
    .map((eq) => {
      if (map[eq]) {
        return map[eq];
      }
      return eq as RequiredEquipment;
    })
    .filter((eq): eq is RequiredEquipment => eq !== undefined);
}

/**
 * แปลง Infection Status จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapInfectionStatusToProto(status: string): string {
  const map: Record<string, string> = {
    "เชื้อดื้อยา": "DRUG_RESISTANT",
    TB: "TB",
    "COVID-19": "COVID_19",
    "Flu A,B": "FLU_AB",
    RSV: "RSV",
    "ไม่มี": "NONE",
    "อื่นๆ": "OTHER",
  };

  return map[status] ?? "NONE";
}

/**
 * แปลง Infection Status จาก Proto string เป็น Frontend (ภาษาไทย)
 */
export function mapInfectionStatusFromProto(status: string | number): InfectionStatus {
  if (typeof status === "number") {
    const map: Record<number, InfectionStatus> = {
      0: "เชื้อดื้อยา",
      1: "TB",
      2: "COVID-19",
      3: "Flu A,B",
      4: "RSV",
      5: "ไม่มี",
      6: "อื่นๆ",
    };
    return map[status] ?? "ไม่มี";
  }

  const map: Record<string, InfectionStatus> = {
    DRUG_RESISTANT: "เชื้อดื้อยา",
    TB: "TB",
    COVID_19: "COVID-19",
    FLU_AB: "Flu A,B",
    RSV: "RSV",
    NONE: "ไม่มี",
    OTHER: "อื่นๆ",
  };

  return map[status] ?? "ไม่มี";
}

/**
 * แปลง Condition Type จาก Frontend (ภาษาไทย) เป็น Proto string
 */
export function mapConditionTypeToProto(type: string): string {
  const map: Record<string, string> = {
    "ผู้สูงอายุ": "ELDERLY",
    "ผู้พิการ": "DISABLED",
  };

  return map[type] ?? "ELDERLY";
}

/**
 * แปลง Condition Type จาก Proto string เป็น Frontend (ภาษาไทย)
 */
export function mapConditionTypeFromProto(type: string | number): ConditionType {
  if (typeof type === "number") {
    const map: Record<number, ConditionType> = {
      0: "ผู้สูงอายุ",
      1: "ผู้พิการ",
    };
    return map[type] ?? "ผู้สูงอายุ";
  }

  const map: Record<string, ConditionType> = {
    ELDERLY: "ผู้สูงอายุ",
    DISABLED: "ผู้พิการ",
  };

  return map[type] ?? "ผู้สูงอายุ";
}

/**
 * แปลงข้อมูลจาก Proto format เป็น Frontend format
 */
export function convertProtoToFrontend(protoData: any): EMRCRequestItem {
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
          : null,
      requesterName: protoData.requester_name || "",
      requesterPhone: protoData.requester_phone || "",
      requestDate: protoData.request_date || "",
      requestTime: protoData.request_time || "",
      bookingPurpose: mapBookingPurposeFromProto(
        protoData.booking_purpose || protoData.bookingPurpose,
      ),
      bookingPurposeOther:
        protoData.booking_purpose_other || protoData.bookingPurposeOther || undefined,
      patientName: protoData.patient_name || protoData.patientName || undefined,
      patientBirthDate:
        protoData.patient_birth_date || protoData.patientBirthDate || undefined,
      destinationAddress:
        protoData.destination_address || protoData.destinationAddress || undefined,
      patientRights: protoData.patient_rights || protoData.patientRights || undefined,
      patientHN: protoData.patient_hn || protoData.patientHN || undefined,
      patientCitizenId:
        protoData.patient_citizen_id || protoData.patientCitizenId || undefined,
      patientPhone: protoData.patient_phone || protoData.patientPhone || undefined,
      requiredEquipment: mapRequiredEquipmentFromProto(
        protoData.required_equipment || protoData.requiredEquipment || [],
      ),
      infectionStatus: mapInfectionStatusFromProto(
        protoData.infection_status || protoData.infectionStatus,
      ),
      infectionStatusOther:
        protoData.infection_status_other || protoData.infectionStatusOther || undefined,
      departmentPhone:
        protoData.department_phone || protoData.departmentPhone || undefined,
      requesterNameDetail:
        protoData.requester_name_detail || protoData.requesterNameDetail || undefined,
      conditionType: mapConditionTypeFromProto(
        protoData.condition_type || protoData.conditionType,
      ),
      acknowledged: protoData.acknowledged ?? false,
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

