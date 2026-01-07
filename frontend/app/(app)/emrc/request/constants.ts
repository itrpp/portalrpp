import { EMRCRequestFormData } from "@/types/emrc";

export const REQUEST_REQUIRED_FIELDS: Array<keyof EMRCRequestFormData> = [
  "requesterName",
  "requesterPhone",
  "requestDate",
  "requestTime",
  "bookingPurpose",
];

export const REQUEST_FIELD_LABELS: Partial<
  Record<keyof EMRCRequestFormData, string>
> = {
  requesterDepartment: "หน่วยงานที่ขอใช้รถ",
  requesterName: "ชื่อผู้แจ้ง",
  requesterPhone: "โทรศัพท์ภายใน",
  requestDate: "ใช้รถพยาบาลวันที่",
  requestTime: "เวลาที่ขอใช้รถพยาบาล",
  bookingPurpose: "จองรถสำหรับ",
  patientName: "ชื่อ - นามสกุล ผู้ป่วย",
  patientBirthDate: "วัน-เดือน-ปีเกิด ผู้ป่วย",
  destinationAddress: "ที่อยู่ปัจจุบัน // สถานที่ปลายทางที่ต้องการไป",
  patientRights: "สิทธิ์รักษาผู้ป่วย",
  patientHN: "HN",
  patientCitizenId: "เลขบัตรประชาชน 13 หลัก",
  patientPhone: "เบอร์โทรญาติผู้ป่วยหรือผู้ป่วย",
  requiredEquipment: "อุปกรณ์ที่จำเป็น",
  infectionStatus: "การติดเชื้อ",
  departmentPhone: "เบอร์โทรหน่วยงาน IP phone เท่านั้น",
  requesterNameDetail: "ชื่อผู้ขอใช้รถ",
  conditionType: "เงื่อนไขการขอใช้รถพยาบาล",
  acknowledged: "รับทราบ",
};

export const createDefaultFormData = (
  requesterName: string | undefined,
  requesterPhone?: string | undefined,
  requesterDepartment?: number | null | undefined,
): EMRCRequestFormData => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  const defaultDate = `${month}/${day}/${year}`;

  const hours = String(today.getHours()).padStart(2, "0");
  const minutes = String(today.getMinutes()).padStart(2, "0");
  const defaultTime = `${hours}:${minutes}`;

  return {
    requesterDepartment: requesterDepartment ?? null,
    requesterName: requesterName || "",
    requesterPhone: requesterPhone || "",
    requestDate: defaultDate,
    requestTime: defaultTime,
    bookingPurpose: "",
    bookingPurposeOther: "",
    patientName: "",
    patientBirthDate: "",
    destinationAddress: "",
    patientRights: "",
    patientHN: "",
    patientCitizenId: "",
    patientPhone: "",
    requiredEquipment: [],
    infectionStatus: "",
    infectionStatusOther: "",
    departmentPhone: "",
    requesterNameDetail: "",
    conditionType: "",
    acknowledged: false,
  };
};

