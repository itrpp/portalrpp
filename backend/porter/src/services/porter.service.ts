import { Prisma, type PorterRequest, type FloorDepartment, type PorterEmployee, type EmploymentType, type Position } from '@prisma/client';
import prisma from '../config/database';
import porterEventEmitter from '../utils/eventEmitter';
import {
  mapEquipmentToPrisma,
  mapEquipmentToProto,
  mapHasVehicleToPrisma,
  mapHasVehicleToProto,
  mapReturnTripToPrisma,
  mapReturnTripToProto,
  mapStatusToPrisma,
  mapStatusToProto,
  mapUrgencyLevelToPrisma,
  mapUrgencyLevelToProto,
  mapVehicleTypeToPrisma,
  mapVehicleTypeToProto
} from '../utils/enumMapper';
import {
  CreateBuildingInput,
  CreateEmployeeInput,
  CreateEmploymentTypeInput,
  CreateFloorDepartmentInput,
  CreatePorterRequestInput,
  CreatePositionInput,
  ListBuildingsFilters,
  ListEmployeesFilters,
  ListFloorDepartmentsFilters,
  ListPorterRequestsFilters,
  PaginationResult,
  PorterEmployeeMessage,
  PorterRequestMessage,
  PositionMessage,
  UpdateBuildingInput,
  UpdateEmployeeInput,
  UpdateEmploymentTypeInput,
  UpdateFloorDepartmentInput,
  UpdatePorterRequestInput,
  UpdatePorterRequestStatusInput,
  UpdatePorterRequestTimestampsInput,
  UpdatePositionInput,
  EmploymentTypeMessage,
  BuildingMessage,
  FloorDepartmentMessage,
  Equipment,
  HealthCheckResult
} from '../types/porter';

type PorterRequestEntity = PorterRequest;
type BuildingWithFloors = Prisma.BuildingGetPayload<{ include: { floors: true } }>;
type FloorDepartmentEntity = FloorDepartment;
type PorterEmployeeWithRelations = PorterEmployee & {
  employmentType?: EmploymentType | null;
  position?: Position | null;
};

/**
 * Porter Service
 * จัดการ business logic และ database operations สำหรับ Porter Request
 */

export const createPorterRequest = async (requestData: CreatePorterRequestInput): Promise<PorterRequestMessage> => {
  const {
    requester_department,
    requester_name,
    requester_phone,
    patient_name,
    patient_hn,
    patient_condition,
    pickup_location,
    pickup_building_id,
    pickup_floor_department_id,
    pickup_room_bed_name,
    delivery_location,
    delivery_building_id,
    delivery_floor_department_id,
    delivery_room_bed_name,
    requested_date_time,
    urgency_level,
    vehicle_type,
    has_vehicle,
    return_trip,
    transport_reason,
    equipment,
    equipment_other,
    special_notes
  } = requestData;

  const patientConditionValue = normalizePatientCondition(patient_condition);

  const createData: Prisma.PorterRequestUncheckedCreateInput = {
    requesterDepartment: requester_department,
    requesterName: requester_name,
    requesterPhone: requester_phone,
    patientName: patient_name,
    patientHN: patient_hn,
    patientCondition: patientConditionValue,
    pickupLocation: pickup_location,
    pickupBuildingId: pickup_building_id,
    pickupFloorDepartmentId: pickup_floor_department_id,
    pickupRoomBedName: pickup_room_bed_name ?? null,
    deliveryLocation: delivery_location,
    deliveryBuildingId: delivery_building_id,
    deliveryFloorDepartmentId: delivery_floor_department_id,
    deliveryRoomBedName: delivery_room_bed_name ?? null,
    requestedDateTime: requested_date_time ? new Date(requested_date_time) : new Date(),
    urgencyLevel: mapUrgencyLevelToPrisma(urgency_level),
    vehicleType: mapVehicleTypeToPrisma(vehicle_type),
    hasVehicle: mapHasVehicleToPrisma(has_vehicle),
    returnTrip: mapReturnTripToPrisma(return_trip),
    transportReason: transport_reason,
    equipment: equipment && Array.isArray(equipment) && equipment.length > 0 ? JSON.stringify(mapEquipmentToPrisma(equipment)) : JSON.stringify([]),
    equipmentOther: equipment_other ?? null,
    specialNotes: special_notes ?? null
  };

  const porterRequest = await prisma.porterRequest.create({ data: createData });
  const protoResponse = convertToProtoResponse(porterRequest);

  porterEventEmitter.emit('porterRequestCreated', protoResponse);

  return protoResponse;
};

export const getPorterRequestById = async (id: string): Promise<PorterRequestMessage | null> => {
  const porterRequest = await prisma.porterRequest.findUnique({ where: { id } });
  return porterRequest ? convertToProtoResponse(porterRequest) : null;
};

export const listPorterRequests = async (
  filters: ListPorterRequestsFilters
): Promise<PaginationResult<PorterRequestMessage>> => {
  const { status, urgency_level, assigned_to_id, page = 1, page_size = 20 } = filters;

  const where: Prisma.PorterRequestWhereInput = {};

  if (status !== undefined && status !== null) {
    where.status = mapStatusToPrisma(status);
  }
  if (urgency_level !== undefined && urgency_level !== null) {
    where.urgencyLevel = mapUrgencyLevelToPrisma(urgency_level);
  }
  if (assigned_to_id) {
    where.assignedToId = assigned_to_id;
  }

  const skip = (page - 1) * page_size;

  const [porterRequests, total] = await Promise.all([
    prisma.porterRequest.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.porterRequest.count({ where })
  ]);

  return {
    data: porterRequests.map(convertToProtoResponse),
    total,
    page,
    page_size
  };
};

export const updatePorterRequest = async (
  id: string,
  updateData: Omit<UpdatePorterRequestInput, 'id'>
): Promise<PorterRequestMessage> => {
  const data: Prisma.PorterRequestUpdateInput = {};

  if (updateData.requester_department) {
    data.requesterDepartment = updateData.requester_department;
  }
  if (updateData.requester_name) {
    data.requesterName = updateData.requester_name;
  }
  if (updateData.requester_phone) {
    data.requesterPhone = updateData.requester_phone;
  }
  if (updateData.patient_name) {
    data.patientName = updateData.patient_name;
  }
  if (updateData.patient_hn) {
    data.patientHN = updateData.patient_hn;
  }
  if (updateData.patient_condition !== undefined) {
    data.patientCondition = normalizePatientCondition(updateData.patient_condition);
  }
  if (updateData.pickup_location) {
    data.pickupLocation = updateData.pickup_location;
  }
  if (updateData.pickup_building_id) {
    data.pickupBuildingId = updateData.pickup_building_id;
  }
  if (updateData.pickup_floor_department_id) {
    data.pickupFloorDepartmentId = updateData.pickup_floor_department_id;
  }
  if (updateData.pickup_room_bed_name !== undefined) {
    data.pickupRoomBedName = updateData.pickup_room_bed_name ?? null;
  }
  if (updateData.delivery_location) {
    data.deliveryLocation = updateData.delivery_location;
  }
  if (updateData.delivery_building_id) {
    data.deliveryBuildingId = updateData.delivery_building_id;
  }
  if (updateData.delivery_floor_department_id) {
    data.deliveryFloorDepartmentId = updateData.delivery_floor_department_id;
  }
  if (updateData.delivery_room_bed_name !== undefined) {
    data.deliveryRoomBedName = updateData.delivery_room_bed_name ?? null;
  }
  if (updateData.requested_date_time) {
    data.requestedDateTime = new Date(updateData.requested_date_time);
  }
  if (updateData.special_notes !== undefined) {
    data.specialNotes = updateData.special_notes;
  }

  if (updateData.urgency_level !== undefined && updateData.urgency_level !== null) {
    data.urgencyLevel = mapUrgencyLevelToPrisma(updateData.urgency_level);
  }
  if (updateData.vehicle_type !== undefined && updateData.vehicle_type !== null) {
    data.vehicleType = mapVehicleTypeToPrisma(updateData.vehicle_type);
  }
  if (updateData.has_vehicle !== undefined && updateData.has_vehicle !== null) {
    data.hasVehicle = mapHasVehicleToPrisma(updateData.has_vehicle);
  }
  if (updateData.return_trip !== undefined && updateData.return_trip !== null) {
    data.returnTrip = mapReturnTripToPrisma(updateData.return_trip);
  }
  if (updateData.transport_reason) {
    data.transportReason = updateData.transport_reason;
  }
  if (updateData.equipment && updateData.equipment.length > 0) {
    data.equipment = JSON.stringify(mapEquipmentToPrisma(updateData.equipment));
  }
  if (updateData.equipment_other !== undefined) {
    data.equipmentOther = updateData.equipment_other ?? null;
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  const protoResponse = convertToProtoResponse(porterRequest);
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const updatePorterRequestStatus = async (
  id: string,
  statusData: Omit<UpdatePorterRequestStatusInput, 'id'>
): Promise<PorterRequestMessage> => {
  const { status, assigned_to_id, cancelled_reason } = statusData;
  const newStatus = mapStatusToPrisma(status);

  const oldRequest = await prisma.porterRequest.findUnique({ where: { id } });
  const oldStatus = oldRequest?.status;

  const data: Prisma.PorterRequestUpdateInput = {
    status: newStatus
  };

  if (newStatus === 'IN_PROGRESS') {
    data.acceptedAt = new Date();
  } else if (newStatus === 'COMPLETED') {
    data.completedAt = new Date();
  } else if (newStatus === 'CANCELLED') {
    data.cancelledAt = new Date();
    if (cancelled_reason) {
      data.cancelledReason = cancelled_reason;
    }
  }

  if (assigned_to_id) {
    data.assignedToId = assigned_to_id;
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  if (oldStatus !== newStatus) {
    porterEventEmitter.emit('porterRequestStatusChanged', protoResponse);
  } else {
    porterEventEmitter.emit('porterRequestUpdated', protoResponse);
  }

  return protoResponse;
};

export const updatePorterRequestTimestamps = async (
  id: string,
  timestampData: Omit<UpdatePorterRequestTimestampsInput, 'id'>
): Promise<PorterRequestMessage> => {
  const { pickup_at, delivery_at, return_at } = timestampData;
  const data: Prisma.PorterRequestUpdateInput = {};

  if (pickup_at !== undefined && pickup_at !== null) {
    data.pickupAt = new Date(pickup_at);
  }
  if (delivery_at !== undefined && delivery_at !== null) {
    data.deliveryAt = new Date(delivery_at);
  }
  if (return_at !== undefined && return_at !== null) {
    data.returnAt = new Date(return_at);
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  const protoResponse = convertToProtoResponse(porterRequest);
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const deletePorterRequest = async (id: string): Promise<void> => {
  const porterRequest = await prisma.porterRequest.findUnique({ where: { id } });

  if (!porterRequest) {
    return;
  }

  const protoResponse = convertToProtoResponse(porterRequest);
  await prisma.porterRequest.delete({ where: { id } });
  porterEventEmitter.emit('porterRequestDeleted', protoResponse);
};

export const healthCheck = async (): Promise<HealthCheckResult> => {
  await prisma.$queryRaw`SELECT 1`;
  return {
    success: true,
    message: 'Porter service is healthy',
    timestamp: new Date().toISOString()
  };
};

// ========================================
// LOCATION SETTINGS SERVICE
// ========================================

export const createBuilding = async (requestData: CreateBuildingInput): Promise<BuildingMessage> => {
  const { id, name, floor_count, status } = requestData;

  const createData: Prisma.BuildingUncheckedCreateInput = {
    name: name.trim(),
    floorCount: floor_count ?? null,
    status: status !== undefined ? status : true
  };

  if (id) {
    createData.id = id;
  }

  const building = await prisma.building.create({
    data: createData,
    include: {
      floors: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return convertBuildingToProto(building);
};

export const getBuildingById = async (id: string): Promise<BuildingMessage | null> => {
  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      floors: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return building ? convertBuildingToProto(building) : null;
};

export const listBuildings = async (
  filters: ListBuildingsFilters
): Promise<PaginationResult<BuildingMessage>> => {
  const { page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const [buildings, total] = await Promise.all([
    prisma.building.findMany({
      skip,
      take: page_size,
      include: {
        floors: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.building.count()
  ]);

  return {
    data: buildings.map(convertBuildingToProto),
    total,
    page,
    page_size
  };
};

export const updateBuilding = async (
  id: string,
  updateData: UpdateBuildingInput
): Promise<BuildingMessage> => {
  const data: Prisma.BuildingUpdateInput = {};

  if (updateData.name) {
    data.name = updateData.name.trim();
  }
  if (updateData.floor_count !== undefined) {
    data.floorCount = updateData.floor_count ?? null;
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const building = await prisma.building.update({
    where: { id },
    data,
    include: {
      floors: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return convertBuildingToProto(building);
};

export const deleteBuilding = async (id: string): Promise<void> => {
  await prisma.building.delete({ where: { id } });
};

export const createFloorDepartment = async (
  requestData: CreateFloorDepartmentInput
): Promise<FloorDepartmentMessage> => {
  const {
    id,
    name,
    building_id,
    floor_number,
    department_type,
    room_type,
    room_count,
    bed_count,
    status
  } = requestData;

  const createData: Prisma.FloorDepartmentUncheckedCreateInput = {
    name: name.trim(),
    buildingId: building_id,
    floorNumber: floor_number ?? null,
    departmentType: department_type,
    roomType: room_type ?? null,
    roomCount: room_count ?? null,
    bedCount: bed_count ?? null,
    status: status !== undefined ? status : true
  };

  if (id) {
    createData.id = id;
  }

  const floorDepartment = await prisma.floorDepartment.create({
    data: createData,
    include: {
      building: true
    }
  });

  return convertFloorDepartmentToProto(floorDepartment);
};

export const getFloorDepartmentById = async (id: string): Promise<FloorDepartmentMessage | null> => {
  const floorDepartment = await prisma.floorDepartment.findUnique({
    where: { id },
    include: { building: true }
  });

  return floorDepartment ? convertFloorDepartmentToProto(floorDepartment) : null;
};

export const listFloorDepartments = async (
  filters: ListFloorDepartmentsFilters
): Promise<PaginationResult<FloorDepartmentMessage>> => {
  const { building_id, department_type, page = 1, page_size = 100 } = filters;

  const where: Prisma.FloorDepartmentWhereInput = {};

  if (building_id) {
    where.buildingId = building_id;
  }
  if (department_type) {
    where.departmentType = department_type;
  }

  const skip = (page - 1) * page_size;

  const [floorDepartments, total] = await Promise.all([
    prisma.floorDepartment.findMany({
      where,
      skip,
      take: page_size,
      include: { building: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.floorDepartment.count({ where })
  ]);

  return {
    data: floorDepartments.map(convertFloorDepartmentToProto),
    total,
    page,
    page_size
  };
};

export const updateFloorDepartment = async (
  id: string,
  updateData: UpdateFloorDepartmentInput
): Promise<FloorDepartmentMessage> => {
  const data: Prisma.FloorDepartmentUpdateInput = {};

  if (updateData.name) {
    data.name = updateData.name.trim();
  }
  if (updateData.floor_number !== undefined) {
    data.floorNumber = updateData.floor_number ?? null;
  }
  if (updateData.department_type !== undefined) {
    data.departmentType = updateData.department_type;
  }
  if (updateData.room_type !== undefined) {
    data.roomType = updateData.room_type ?? null;
  }
  if (updateData.room_count !== undefined) {
    data.roomCount = updateData.room_count === 0 ? null : updateData.room_count ?? null;
  }
  if (updateData.bed_count !== undefined) {
    data.bedCount = updateData.bed_count === 0 ? null : updateData.bed_count ?? null;
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const floorDepartment = await prisma.floorDepartment.update({
    where: { id },
    data,
    include: { building: true }
  });

  return convertFloorDepartmentToProto(floorDepartment);
};

export const deleteFloorDepartment = async (id: string): Promise<void> => {
  await prisma.floorDepartment.delete({ where: { id } });
};

// ========================================
// EMPLOYEE MANAGEMENT SERVICE
// ========================================

export const createEmployee = async (requestData: CreateEmployeeInput): Promise<PorterEmployeeMessage> => {
  const { citizen_id, first_name, last_name, employment_type_id, position_id, status } = requestData;

  const createData: Prisma.PorterEmployeeUncheckedCreateInput = {
    citizenId: citizen_id.trim(),
    firstName: first_name.trim(),
    lastName: last_name.trim(),
    employmentTypeId: employment_type_id,
    positionId: position_id,
    status: status ?? true
  };

  const employee = await prisma.porterEmployee.create({
    data: createData,
    include: {
      employmentType: true,
      position: true
    }
  });

  return convertEmployeeToProto(employee);
};

export const getEmployeeById = async (id: string): Promise<PorterEmployeeMessage | null> => {
  const employee = await prisma.porterEmployee.findUnique({
    where: { id },
    include: {
      employmentType: true,
      position: true
    }
  });

  return employee ? convertEmployeeToProto(employee) : null;
};

export const listEmployees = async (
  filters: ListEmployeesFilters
): Promise<PaginationResult<PorterEmployeeMessage>> => {
  const { employment_type_id, position_id, status, page = 1, page_size = 20 } = filters;

  const where: Prisma.PorterEmployeeWhereInput = {};

  if (employment_type_id !== undefined && employment_type_id !== null) {
    where.employmentTypeId = employment_type_id;
  }
  if (position_id !== undefined && position_id !== null) {
    where.positionId = position_id;
  }
  if (status !== undefined && status !== null) {
    where.status = status;
  }

  const skip = (page - 1) * page_size;

  const [employees, total] = await Promise.all([
    prisma.porterEmployee.findMany({
      where,
      skip,
      take: page_size,
      include: {
        employmentType: true,
        position: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.porterEmployee.count({ where })
  ]);

  return {
    data: employees.map(convertEmployeeToProto),
    total,
    page,
    page_size
  };
};

export const updateEmployee = async (
  id: string,
  updateData: UpdateEmployeeInput
): Promise<PorterEmployeeMessage> => {
  const data: Prisma.PorterEmployeeUncheckedUpdateInput = {};

  if (updateData.first_name) {
    data.firstName = updateData.first_name.trim();
  }
  if (updateData.last_name) {
    data.lastName = updateData.last_name.trim();
  }
  if (updateData.employment_type_id !== undefined && updateData.employment_type_id !== null) {
    data.employmentTypeId = updateData.employment_type_id;
  }
  if (updateData.position_id !== undefined && updateData.position_id !== null) {
    data.positionId = updateData.position_id;
  }
  if (updateData.status !== undefined && updateData.status !== null) {
    data.status = updateData.status;
  }

  const employee = await prisma.porterEmployee.update({
    where: { id },
    data,
    include: {
      employmentType: true,
      position: true
    }
  });

  return convertEmployeeToProto(employee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await prisma.porterEmployee.delete({ where: { id } });
};

// ========================================
// EMPLOYMENT TYPE MANAGEMENT SERVICE
// ========================================

export const createEmploymentType = async (
  requestData: CreateEmploymentTypeInput
): Promise<EmploymentTypeMessage> => {
  const { name, status = true } = requestData;

  const employmentType = await prisma.employmentType.create({
    data: {
      name: name.trim(),
      status: status !== undefined ? status : true
    }
  });

  return convertEmploymentTypeToProto(employmentType);
};

export const getEmploymentTypeById = async (id: string): Promise<EmploymentTypeMessage | null> => {
  const employmentType = await prisma.employmentType.findUnique({ where: { id } });
  return employmentType ? convertEmploymentTypeToProto(employmentType) : null;
};

export const listEmploymentTypes = async (): Promise<{ data: EmploymentTypeMessage[] }> => {
  const employmentTypes = await prisma.employmentType.findMany({
    orderBy: { name: 'asc' }
  });

  return {
    data: employmentTypes.map(convertEmploymentTypeToProto)
  };
};

export const updateEmploymentType = async (
  id: string,
  updateData: UpdateEmploymentTypeInput
): Promise<EmploymentTypeMessage> => {
  const data: Prisma.EmploymentTypeUpdateInput = {};

  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const employmentType = await prisma.employmentType.update({
    where: { id },
    data
  });

  return convertEmploymentTypeToProto(employmentType);
};

export const deleteEmploymentType = async (id: string): Promise<void> => {
  await prisma.employmentType.delete({ where: { id } });
};

// ========================================
// POSITION MANAGEMENT SERVICE
// ========================================

export const createPosition = async (requestData: CreatePositionInput): Promise<PositionMessage> => {
  const { name, status = true } = requestData;

  const position = await prisma.position.create({
    data: {
      name: name.trim(),
      status: status !== undefined ? status : true
    }
  });

  return convertPositionToProto(position);
};

export const getPositionById = async (id: string): Promise<PositionMessage | null> => {
  const position = await prisma.position.findUnique({ where: { id } });
  return position ? convertPositionToProto(position) : null;
};

export const listPositions = async (): Promise<{ data: PositionMessage[] }> => {
  const positions = await prisma.position.findMany({
    orderBy: { name: 'asc' }
  });

  return {
    data: positions.map(convertPositionToProto)
  };
};

export const updatePosition = async (
  id: string,
  updateData: UpdatePositionInput
): Promise<PositionMessage> => {
  const data: Prisma.PositionUpdateInput = {};

  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const position = await prisma.position.update({
    where: { id },
    data
  });

  return convertPositionToProto(position);
};

export const deletePosition = async (id: string): Promise<void> => {
  await prisma.position.delete({ where: { id } });
};

// ========================================
// Helper functions
// ========================================

const normalizePatientCondition = (
  value: string | string[] | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === undefined || value === null) {
    return Prisma.DbNull;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(', ').filter(Boolean);
  }

  return Prisma.DbNull;
};

const convertToProtoResponse = (porterRequest: PorterRequestEntity): PorterRequestMessage => ({
  id: porterRequest.id,
  created_at: porterRequest.createdAt.toISOString(),
  updated_at: porterRequest.updatedAt.toISOString(),
  requester_department: porterRequest.requesterDepartment,
  requester_name: porterRequest.requesterName,
  requester_phone: porterRequest.requesterPhone,
  patient_name: porterRequest.patientName,
  patient_hn: porterRequest.patientHN,
  patient_condition: formatPatientCondition(porterRequest.patientCondition),
  pickup_location: porterRequest.pickupLocation,
  pickup_building_id: porterRequest.pickupBuildingId,
  pickup_floor_department_id: porterRequest.pickupFloorDepartmentId,
  pickup_room_bed_name: porterRequest.pickupRoomBedName || undefined,
  delivery_location: porterRequest.deliveryLocation,
  delivery_building_id: porterRequest.deliveryBuildingId,
  delivery_floor_department_id: porterRequest.deliveryFloorDepartmentId,
  delivery_room_bed_name: porterRequest.deliveryRoomBedName || undefined,
  requested_date_time: porterRequest.requestedDateTime.toISOString(),
  urgency_level: mapUrgencyLevelToProto(porterRequest.urgencyLevel),
  vehicle_type: mapVehicleTypeToProto(porterRequest.vehicleType),
  has_vehicle: mapHasVehicleToProto(porterRequest.hasVehicle),
  return_trip: mapReturnTripToProto(porterRequest.returnTrip),
  transport_reason: porterRequest.transportReason,
  equipment: mapEquipmentToProto(porterRequest.equipment as string | Equipment[] | null),
  equipment_other: porterRequest.equipmentOther || undefined,
  special_notes: porterRequest.specialNotes || undefined,
  status: mapStatusToProto(porterRequest.status),
  assigned_to_id: porterRequest.assignedToId || undefined,
  accepted_at: porterRequest.acceptedAt?.toISOString() || undefined,
  completed_at: porterRequest.completedAt?.toISOString() || undefined,
  cancelled_at: porterRequest.cancelledAt?.toISOString() || undefined,
  cancelled_reason: porterRequest.cancelledReason || undefined,
  pickup_at: porterRequest.pickupAt?.toISOString() || undefined,
  delivery_at: porterRequest.deliveryAt?.toISOString() || undefined,
  return_at: porterRequest.returnAt?.toISOString() || undefined
});

const formatPatientCondition = (value: Prisma.JsonValue | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : undefined;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.join(', ') : undefined;
      }
    } catch {
      return value;
    }
    return value;
  }

  return undefined;
};

const convertBuildingToProto = (building: BuildingWithFloors): BuildingMessage => ({
  id: building.id,
  name: building.name,
  floor_count: building.floorCount ?? undefined,
  status: building.status,
  created_at: building.createdAt.toISOString(),
  updated_at: building.updatedAt.toISOString(),
  floors: building.floors?.map(convertFloorDepartmentToProto) ?? []
});

const convertFloorDepartmentToProto = (floorDepartment: FloorDepartmentEntity): FloorDepartmentMessage => ({
  id: floorDepartment.id,
  name: floorDepartment.name,
  building_id: floorDepartment.buildingId,
  floor_number: floorDepartment.floorNumber ?? undefined,
  department_type: floorDepartment.departmentType ?? undefined,
  room_type: floorDepartment.roomType || undefined,
  room_count: floorDepartment.roomCount ?? undefined,
  bed_count: floorDepartment.bedCount ?? undefined,
  status: floorDepartment.status,
  created_at: floorDepartment.createdAt.toISOString(),
  updated_at: floorDepartment.updatedAt.toISOString(),
  rooms: []
});

const convertEmployeeToProto = (employee: PorterEmployeeWithRelations): PorterEmployeeMessage => ({
  id: employee.id,
  citizen_id: employee.citizenId,
  first_name: employee.firstName,
  last_name: employee.lastName,
  employment_type: employee.employmentType?.name || undefined,
  employment_type_id: employee.employmentTypeId,
  position: employee.position?.name || undefined,
  position_id: employee.positionId,
  status: employee.status,
  created_at: employee.createdAt.toISOString(),
  updated_at: employee.updatedAt.toISOString()
});

const convertEmploymentTypeToProto = (employmentType: EmploymentType): EmploymentTypeMessage => ({
  id: employmentType.id,
  name: employmentType.name,
  status: employmentType.status,
  created_at: employmentType.createdAt.toISOString(),
  updated_at: employmentType.updatedAt.toISOString()
});

const convertPositionToProto = (position: Position): PositionMessage => ({
  id: position.id,
  name: position.name,
  status: position.status,
  created_at: position.createdAt.toISOString(),
  updated_at: position.updatedAt.toISOString()
});


