import { PorterRequestFormData } from '@/types/porter';
import { getDateTimeLocal } from '@/lib/utils';

export const REQUEST_REQUIRED_FIELDS: Array<keyof PorterRequestFormData> = [
  'requesterName',
  'requesterPhone',
  'patientName',
  'patientHN',
  'requestedDateTime',
  'transportReason',
  'urgencyLevel',
  'vehicleType',
  'hasVehicle',
  'returnTrip',
];

export const REQUEST_FIELD_LABELS: Partial<Record<keyof PorterRequestFormData, string>> = {
  requesterDepartment: 'หน่วยงานผู้แจ้ง',
  requesterName: 'ชื่อผู้แจ้ง',
  requesterPhone: 'โทรศัพท์ภายใน',
  patientHN: 'หมายเลข HN',
  patientName: 'ชื่อผู้ป่วย',
  requestedDateTime: 'วันที่และเวลา',
  transportReason: 'รายการเหตุผล',
  urgencyLevel: 'ความเร่งด่วน',
  vehicleType: 'ประเภทรถ',
  hasVehicle: 'มีรถแล้วหรือยัง',
  vehicleTypeGolf: 'ต้องการเป็นรถกอล์ฟ หรือไม่',
  returnTrip: 'ส่งกลับหรือไม่',
};

export const createDefaultFormData = (
  requesterName: string | undefined,
  requesterPhone?: string | undefined,
  requesterDepartment?: number | null | undefined,
): PorterRequestFormData => ({
  requesterDepartment: requesterDepartment ?? null,
  requesterName: requesterName || '',
  requesterPhone: requesterPhone || '',

  patientName: '',
  patientHN: '',

  pickupLocationDetail: null,
  deliveryLocationDetail: null,

  requestedDateTime: getDateTimeLocal(),
  urgencyLevel: 'ปกติ',
  vehicleType: '',
  equipment: [],
  hasVehicle: '',
  vehicleTypeGolf: 'ไม่ต้องการ',
  returnTrip: 'ไปส่งอย่างเดียว',

  transportReason: '',
  equipmentOther: '',
  specialNotes: '',
  patientCondition: [],
});
