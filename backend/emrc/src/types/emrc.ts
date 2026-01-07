export const BOOKING_PURPOSES = [
  'SEND_HOME',
  'TRANSFER_WARD',
  'SEND_EXAM',
  'REFER_IN',
  'REFER_OUT',
  'CT',
  'DIALYSIS',
  'OTHER'
] as const;
export type BookingPurpose = (typeof BOOKING_PURPOSES)[number];

export const EMRC_STATUSES = ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type EMRCStatus = (typeof EMRC_STATUSES)[number];

export const REQUIRED_EQUIPMENT_VALUES = [
  'ROOM_AIR',
  'IV',
  'OXYGEN',
  'HFNC',
  'VENTILATOR',
  'MONITOR',
  'DEFIBRILLATOR'
] as const;
export type RequiredEquipment = (typeof REQUIRED_EQUIPMENT_VALUES)[number];

export const INFECTION_STATUS_VALUES = [
  'DRUG_RESISTANT',
  'TB',
  'COVID_19',
  'FLU_AB',
  'RSV',
  'NONE',
  'OTHER'
] as const;
export type InfectionStatus = (typeof INFECTION_STATUS_VALUES)[number];

export const CONDITION_TYPES = ['ELDERLY', 'DISABLED'] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

export interface AmbulanceRequestMessage {
  id: string;
  created_at: string;
  updated_at: string;
  requester_department?: number | null;
  requester_name: string;
  requester_phone: string;
  request_date: string; // MM/DD/YYYY format
  request_time: string; // HH:mm format
  booking_purpose: BookingPurpose;
  booking_purpose_other?: string;
  patient_name?: string;
  patient_birth_date?: string; // dd/mm/yyyy format
  destination_address?: string;
  patient_rights?: string;
  patient_hn?: string;
  patient_citizen_id?: string;
  patient_phone?: string;
  required_equipment: RequiredEquipment[];
  infection_status: InfectionStatus;
  infection_status_other?: string;
  department_phone?: string;
  requester_name_detail?: string;
  condition_type: ConditionType;
  acknowledged: boolean;
  status: EMRCStatus;
  assigned_to_id?: string;
  assigned_to_name?: string;
  accepted_at?: string;
  accepted_by_id?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  cancelled_by_id?: string;
  requester_user_id: string;
  pickup_at?: string;
  delivery_at?: string;
  return_at?: string;
}

export interface CreateAmbulanceRequestInput {
  requester_department?: number | null;
  requester_name: string;
  requester_phone: string;
  request_date: string;
  request_time: string;
  booking_purpose: BookingPurpose | string;
  booking_purpose_other?: string | null;
  patient_name?: string | null;
  patient_birth_date?: string | null;
  destination_address?: string | null;
  patient_rights?: string | null;
  patient_hn?: string | null;
  patient_citizen_id?: string | null;
  patient_phone?: string | null;
  required_equipment?: Array<RequiredEquipment | string>;
  infection_status: InfectionStatus | string;
  infection_status_other?: string | null;
  department_phone?: string | null;
  requester_name_detail?: string | null;
  condition_type: ConditionType | string;
  acknowledged: boolean;
  requester_user_id: string;
}

export interface ListAmbulanceRequestsFilters {
  status?: EMRCStatus | string | null;
  booking_purpose?: BookingPurpose | string | null;
  requester_user_id?: string | null;
  assigned_to_id?: string | null;
  page?: number;
  page_size?: number;
}

export interface UpdateAmbulanceRequestInput {
  id: string;
  requester_department?: number | null;
  requester_name?: string;
  requester_phone?: string;
  request_date?: string;
  request_time?: string;
  booking_purpose?: BookingPurpose | string | null;
  booking_purpose_other?: string | null;
  patient_name?: string | null;
  patient_birth_date?: string | null;
  destination_address?: string | null;
  patient_rights?: string | null;
  patient_hn?: string | null;
  patient_citizen_id?: string | null;
  patient_phone?: string | null;
  required_equipment?: Array<RequiredEquipment | string>;
  infection_status?: InfectionStatus | string | null;
  infection_status_other?: string | null;
  department_phone?: string | null;
  requester_name_detail?: string | null;
  condition_type?: ConditionType | string | null;
  acknowledged?: boolean | null;
}

export interface UpdateAmbulanceRequestStatusInput {
  id: string;
  status: EMRCStatus | string;
  assigned_to_id?: string;
  cancelled_reason?: string;
  cancelled_by_id?: string;
  accepted_by_id?: string;
}

export interface UpdateAmbulanceRequestTimestampsInput {
  id: string;
  pickup_at?: string | null;
  delivery_at?: string | null;
  return_at?: string | null;
}

export interface DeleteAmbulanceRequestInput {
  id: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HealthCheckResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface AmbulanceRequestUpdateMessage {
  type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'DELETED';
  request: AmbulanceRequestMessage;
}

export interface StreamAmbulanceRequestsRequest {
  status?: EMRCStatus | string | null;
  booking_purpose?: BookingPurpose | string | null;
}

