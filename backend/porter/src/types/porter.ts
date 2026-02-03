export const URGENCY_LEVELS = ['NORMAL', 'RUSH', 'EMERGENCY'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const VEHICLE_TYPES = ['SITTING', 'LYING', 'GOLF'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const HAS_VEHICLE_VALUES = ['YES', 'NO'] as const;
export type HasVehicle = (typeof HAS_VEHICLE_VALUES)[number];

export const RETURN_TRIP_VALUES = ['ONE_WAY', 'ROUND_TRIP'] as const;
export type ReturnTrip = (typeof RETURN_TRIP_VALUES)[number];

export const PORTER_STATUSES = ['WAITING_CENTER', 'WAITING_ACCEPT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type PorterStatus = (typeof PORTER_STATUSES)[number];

/** Statuses ที่นับเป็น "รอ" ใน stat (รวมกลุ่ม wait) */
export const PORTER_STATUS_WAIT_GROUP: PorterStatus[] = ['WAITING_CENTER', 'WAITING_ACCEPT'];

export const EQUIPMENT_VALUES = [
  'OXYGEN',
  'SALINE_POLE',
  'ICD_BOX',
  'CLOTH_TIED',
  'OTHER',
  'TUBE',
  'IV_PUMP',
  'VENTILATOR',
  'MONITOR',
  'SUCTION'
] as const;
export type Equipment = (typeof EQUIPMENT_VALUES)[number];

export interface PorterRequestMessage {
  id: string;
  created_at: string;
  updated_at: string;
  requester_department?: number | null; // เก็บ departmentSubSubId แทนชื่อหน่วยงาน
  requester_name: string;
  requester_phone: string;
  requester_user_id: string;
  patient_name: string;
  patient_hn: string;
  patient_condition?: string;
  pickup_building_id: string;
  pickup_building_name?: string;
  pickup_floor_department_id: string;
  pickup_floor_department_name?: string;
  pickup_room_bed_name?: string;
  delivery_building_id: string;
  delivery_building_name?: string;
  delivery_floor_department_id: string;
  delivery_floor_department_name?: string;
  delivery_room_bed_name?: string;
  requested_date_time: string;
  urgency_level: UrgencyLevel;
  vehicle_type: VehicleType;
  has_vehicle: HasVehicle;
  return_trip: ReturnTrip;
  transport_reason: string;
  equipment: Equipment[];
  equipment_other?: string;
  special_notes?: string;
  status: PorterStatus;
  assigned_to_id?: string;
  assigned_to_name?: string;
  accepted_at?: string;
  accepted_by_id?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  pickup_at?: string;
  delivery_at?: string;
  return_at?: string;
}

export interface CreatePorterRequestInput {
  requester_department?: number | null; // เก็บ departmentSubSubId แทนชื่อหน่วยงาน
  requester_name: string;
  requester_phone: string;
  requester_user_id: string;
  patient_name: string;
  patient_hn: string;
  patient_condition?: string | string[] | null;
  pickup_location: string;
  pickup_building_id: string;
  pickup_floor_department_id: string;
  pickup_room_bed_name?: string | null;
  delivery_location: string;
  delivery_building_id: string;
  delivery_floor_department_id: string;
  delivery_room_bed_name?: string | null;
  requested_date_time?: string;
  urgency_level: UrgencyLevel | number;
  vehicle_type: VehicleType | number;
  has_vehicle: HasVehicle | number;
  return_trip: ReturnTrip | number;
  transport_reason: string;
  equipment?: Array<Equipment | number>;
  equipment_other?: string | null;
  special_notes?: string | null;
}

export interface ListPorterRequestsFilters {
  status?: PorterStatus | number | null;
  urgency_level?: UrgencyLevel | number | null;
  requester_user_id?: string | null;
  assigned_to_id?: string | null;
  page?: number;
  page_size?: number;
}

export interface UpdatePorterRequestInput {
  id: string;
  requester_department?: number | null; // เก็บ departmentSubSubId แทนชื่อหน่วยงาน
  requester_name?: string;
  requester_phone?: string;
  patient_name?: string;
  patient_hn?: string;
  patient_condition?: string | string[] | null;
  pickup_location?: string;
  pickup_building_id?: string;
  pickup_floor_department_id?: string;
  pickup_room_bed_name?: string | null;
  delivery_location?: string;
  delivery_building_id?: string;
  delivery_floor_department_id?: string;
  delivery_room_bed_name?: string | null;
  requested_date_time?: string;
  urgency_level?: UrgencyLevel | number | null;
  vehicle_type?: VehicleType | number | null;
  has_vehicle?: HasVehicle | number | null;
  return_trip?: ReturnTrip | number | null;
  transport_reason?: string;
  equipment?: Array<Equipment | number>;
  equipment_other?: string | null;
  special_notes?: string | null;
}

export interface UpdatePorterRequestStatusInput {
  id: string;
  status: PorterStatus | number;
  assigned_to_id?: string;
  cancelled_reason?: string;
  cancelled_by_id?: string;
  accepted_by_id?: string;
}

export interface UpdatePorterRequestTimestampsInput {
  id: string;
  pickup_at?: string | null;
  delivery_at?: string | null;
  return_at?: string | null;
}

export interface DeletePorterRequestInput {
  id: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface FloorPlanMessage {
  id: string;
  building_id: string;
  floor_number: number;
  image_data: string; // base64 string
  stations: BleStationMessage[];
  created_at: string;
  updated_at: string;
}

export interface FloorPlanInput {
  id?: string; // ถ้ามี id = update, ถ้าไม่มี = create
  floor_number: number;
  image_data: string; // base64 string
}

export interface BleStationMessage {
  id: string;
  floor_plan_id: string;
  name: string;
  mac_address: string;
  uuid?: string;
  position_x: number;
  position_y: number;
  signal_strength?: number; // dBm
  battery_level?: number; // percentage (0-100)
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuildingMessage {
  id: string;
  name: string;
  floor_count?: number;
  floor_plans?: FloorPlanMessage[]; // repeated FloorPlan
  status: boolean;
  created_at: string;
  updated_at: string;
  floors: FloorDepartmentMessage[];
}

export interface CreateBuildingInput {
  id?: string;
  name: string;
  floor_count?: number | null;
  floor_plans?: FloorPlanInput[]; // repeated FloorPlanInput
  status?: boolean;
}

export interface UpdateBuildingInput {
  name?: string;
  floor_count?: number | null;
  floor_plans?: FloorPlanInput[]; // repeated FloorPlanInput
  status?: boolean;
}

export interface ListBuildingsFilters {
  page?: number;
  page_size?: number;
}

export interface FloorDepartmentMessage {
  id: string;
  name: string;
  building_id: string;
  floor_number?: number;
  department_type?: number;
  room_type?: number;
  room_count?: number;
  bed_count?: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  rooms: unknown[];
}

export interface CreateFloorDepartmentInput {
  id?: string;
  name: string;
  building_id: string;
  floor_number?: number | null;
  department_type: number;
  room_type?: number | null;
  room_count?: number | null;
  bed_count?: number | null;
  status?: boolean;
}

export interface UpdateFloorDepartmentInput {
  name?: string;
  floor_number?: number | null;
  department_type?: number;
  room_type?: number | null;
  room_count?: number | null;
  bed_count?: number | null;
  status?: boolean;
}

export interface ListFloorDepartmentsFilters {
  building_id?: string;
  department_type?: number;
  page?: number;
  page_size?: number;
}

export interface CreateFloorPlanInput {
  id?: string;
  building_id: string;
  floor_number: number;
  image_data: string; // base64 string
}

export interface UpdateFloorPlanInput {
  building_id?: string;
  floor_number?: number;
  image_data?: string; // base64 string
}

export interface ListFloorPlansFilters {
  building_id?: string;
  floor_number?: number;
  page?: number;
  page_size?: number;
}

export interface CreateBleStationInput {
  id?: string;
  floor_plan_id: string;
  name: string;
  mac_address: string;
  uuid?: string;
  position_x: number;
  position_y: number;
  signal_strength?: number; // dBm
  battery_level?: number; // percentage (0-100)
  status?: boolean;
}

export interface UpdateBleStationInput {
  name?: string;
  mac_address?: string;
  uuid?: string;
  position_x?: number;
  position_y?: number;
  signal_strength?: number; // dBm
  battery_level?: number; // percentage (0-100)
  status?: boolean;
}

export interface ListBleStationsFilters {
  floor_plan_id?: string;
  status?: boolean;
  page?: number;
  page_size?: number;
}

export interface PorterEmployeeMessage {
  id: string;
  citizen_id: string;
  first_name: string;
  last_name: string;
  nickname?: string; // ชื่อเล่น
  profile_image?: string; // รูปภาพโปรไฟล์ (base64 string)
  employment_type?: string;
  employment_type_id: string;
  position?: string;
  position_id: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string; // map กับ user login
}

export interface CreateEmployeeInput {
  citizen_id: string;
  first_name: string;
  last_name: string;
  nickname?: string; // ชื่อเล่น
  profile_image?: string; // รูปภาพโปรไฟล์ (base64 string)
  employment_type_id: string; // จะถูกแปลงเป็น Int ที่ service layer
  position_id: string; // จะถูกแปลงเป็น Int ที่ service layer
  status?: boolean;
  user_id?: string; // map กับ user login
}

export interface UpdateEmployeeInput {
  first_name?: string;
  last_name?: string;
  nickname?: string | null; // ชื่อเล่น
  profile_image?: string | null; // รูปภาพโปรไฟล์ (base64 string)
  employment_type_id?: string | null; // จะถูกแปลงเป็น Int ที่ service layer
  position_id?: string | null; // จะถูกแปลงเป็น Int ที่ service layer
  status?: boolean | null;
  user_id?: string | null; // map กับ user login
}

export interface ListEmployeesFilters {
  employment_type_id?: string | null;
  position_id?: string | null;
  status?: boolean | null;
  page?: number;
  page_size?: number;
}

export interface StreamPorterRequestsRequest {
  status?: PorterStatus | number | null;
  urgency_level?: UrgencyLevel | number | null;
}

export type PorterRequestUpdateType = 0 | 1 | 2 | 3;

export interface PorterRequestUpdateMessage {
  type: PorterRequestUpdateType;
  request: PorterRequestMessage;
}

export interface HealthCheckResult {
  success: boolean;
  message: string;
  timestamp: string;
}


