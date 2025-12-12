import { Prisma, type PorterRequest, type FloorDepartment, type PorterEmployee } from '@prisma/client';
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
  CreateFloorDepartmentInput,
  CreatePorterRequestInput,
  ListBuildingsFilters,
  ListEmployeesFilters,
  ListFloorDepartmentsFilters,
  ListPorterRequestsFilters,
  PaginationResult,
  PorterEmployeeMessage,
  PorterRequestMessage,
  UpdateBuildingInput,
  UpdateEmployeeInput,
  UpdateFloorDepartmentInput,
  UpdatePorterRequestInput,
  UpdatePorterRequestStatusInput,
  UpdatePorterRequestTimestampsInput,
  BuildingMessage,
  FloorDepartmentMessage,
  Equipment,
  HealthCheckResult
} from '../types/porter';

type BuildingWithFloors = Prisma.BuildingGetPayload<{ include: { floors: true } }>;
type FloorDepartmentEntity = FloorDepartment;
type PorterEmployeeWithRelations = PorterEmployee;

type PorterRequestWithLocationNames = PorterRequest & {
  pickupBuildingName?: string;
  pickupFloorDepartmentName?: string;
  deliveryBuildingName?: string;
  deliveryFloorDepartmentName?: string;
  assignedToName?: string;
};

/** Porter Service: รวม business logic และ database operations สำหรับ Porter */

export const createPorterRequest = async (requestData: CreatePorterRequestInput): Promise<PorterRequestMessage> => {
  const {
    requester_department,
    requester_name,
    requester_phone,
    requester_user_id,
    patient_name,
    patient_hn,
    patient_condition,
    pickup_building_id,
    pickup_floor_department_id,
    pickup_room_bed_name,
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

  // แปลง requester_department เป็น number (รองรับทั้ง number และ string สำหรับ backward compatibility)
  const requesterDepartmentValue =
    requester_department !== null && requester_department !== undefined
      ? typeof requester_department === "number"
        ? requester_department
        : Number.parseInt(String(requester_department), 10) || null
      : null;

  const createData: Prisma.PorterRequestUncheckedCreateInput = {
    requesterDepartment: requesterDepartmentValue,
    requesterName: requester_name,
    requesterPhone: requester_phone,
    requesterUserID: requester_user_id,
    patientName: patient_name,
    patientHN: patient_hn,
    patientCondition: patientConditionValue,
    pickupBuildingId: pickup_building_id,
    pickupFloorDepartmentId: pickup_floor_department_id,
    pickupRoomBedName: pickup_room_bed_name ?? null,
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
  if (!porterRequest) return null;

  // Fetch building and floor department names
  const [pickupBuilding, pickupFloorDepartment, deliveryBuilding, deliveryFloorDepartment, assignedEmployee] = await Promise.all([
    prisma.building.findUnique({ where: { id: porterRequest.pickupBuildingId }, select: { name: true } }),
    prisma.floorDepartment.findUnique({ where: { id: porterRequest.pickupFloorDepartmentId }, select: { name: true } }),
    prisma.building.findUnique({ where: { id: porterRequest.deliveryBuildingId }, select: { name: true } }),
    prisma.floorDepartment.findUnique({ where: { id: porterRequest.deliveryFloorDepartmentId }, select: { name: true } }),
    porterRequest.assignedToId
      ? prisma.porterEmployee.findUnique({
          where: { id: porterRequest.assignedToId },
          select: { firstName: true, lastName: true }
        })
      : Promise.resolve(null)
  ]);

  const requestWithNames: PorterRequestWithLocationNames = {
    ...porterRequest,
    pickupBuildingName: pickupBuilding?.name,
    pickupFloorDepartmentName: pickupFloorDepartment?.name,
    deliveryBuildingName: deliveryBuilding?.name,
    deliveryFloorDepartmentName: deliveryFloorDepartment?.name,
    assignedToName: assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : undefined
  };

  return convertToProtoResponse(requestWithNames);
};

export const listPorterRequests = async (
  filters: ListPorterRequestsFilters
): Promise<PaginationResult<PorterRequestMessage>> => {
  const { status, urgency_level, requester_user_id, assigned_to_id, page = 1, page_size = 20 } = filters;

  const where: Prisma.PorterRequestWhereInput = {};

  if (status !== undefined && status !== null) {
    where.status = mapStatusToPrisma(status);
  }
  if (urgency_level !== undefined && urgency_level !== null) {
    where.urgencyLevel = mapUrgencyLevelToPrisma(urgency_level);
  }
  if (requester_user_id) {
    where.requesterUserID = requester_user_id;
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

  // Fetch all unique building and floor department IDs
  const buildingIds = new Set<string>();
  const floorDepartmentIds = new Set<string>();
  const employeeIds = new Set<string>();

  porterRequests.forEach(req => {
    buildingIds.add(req.pickupBuildingId);
    buildingIds.add(req.deliveryBuildingId);
    floorDepartmentIds.add(req.pickupFloorDepartmentId);
    floorDepartmentIds.add(req.deliveryFloorDepartmentId);
    if (req.assignedToId) {
      employeeIds.add(req.assignedToId);
    }
  });

  // Fetch all buildings and floor departments in parallel
  const [buildings, floorDepartments, employees] = await Promise.all([
    prisma.building.findMany({
      where: { id: { in: Array.from(buildingIds) } },
      select: { id: true, name: true }
    }),
    prisma.floorDepartment.findMany({
      where: { id: { in: Array.from(floorDepartmentIds) } },
      select: { id: true, name: true }
    }),
    prisma.porterEmployee.findMany({
      where: { id: { in: Array.from(employeeIds) } },
      select: { id: true, firstName: true, lastName: true }
    })
  ]);

  // Create lookup maps
  const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
  const floorDepartmentMap = new Map(floorDepartments.map(f => [f.id, f.name]));
  const employeeMap = new Map(
    employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])
  );

  // Enrich porter requests with location names
  const requestsWithNames: PorterRequestWithLocationNames[] = porterRequests.map(req => ({
    ...req,
    pickupBuildingName: buildingMap.get(req.pickupBuildingId),
    pickupFloorDepartmentName: floorDepartmentMap.get(req.pickupFloorDepartmentId),
    deliveryBuildingName: buildingMap.get(req.deliveryBuildingId),
    deliveryFloorDepartmentName: floorDepartmentMap.get(req.deliveryFloorDepartmentId),
    assignedToName: req.assignedToId ? employeeMap.get(req.assignedToId) : undefined
  }));

  return {
    data: requestsWithNames.map(convertToProtoResponse),
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

  if (updateData.requester_department !== undefined) {
    // แปลง requester_department เป็น number (รองรับทั้ง number และ string สำหรับ backward compatibility)
    const requesterDepartmentValue =
      updateData.requester_department !== null &&
      updateData.requester_department !== undefined
        ? typeof updateData.requester_department === "number"
          ? updateData.requester_department
          : Number.parseInt(String(updateData.requester_department), 10) || null
        : null;
    data.requesterDepartment = requesterDepartmentValue;
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
  if (updateData.pickup_building_id) {
    data.pickupBuildingId = updateData.pickup_building_id;
  }
  if (updateData.pickup_floor_department_id !== undefined) {
    data.pickupFloorDepartmentId = updateData.pickup_floor_department_id;
  }
  if (updateData.pickup_room_bed_name !== undefined) {
    data.pickupRoomBedName = updateData.pickup_room_bed_name ?? null;
  }
  if (updateData.delivery_building_id) {
    data.deliveryBuildingId = updateData.delivery_building_id;
  }
  if (updateData.delivery_floor_department_id !== undefined) {
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

  let assignedToName: string | undefined;
  if (porterRequest.assignedToId) {
    const employee = await prisma.porterEmployee.findUnique({
      where: { id: porterRequest.assignedToId },
      select: { firstName: true, lastName: true }
    });
    if (employee) {
      assignedToName = `${employee.firstName} ${employee.lastName}`;
    }
  }

  const protoResponse = convertToProtoResponse({ ...porterRequest, assignedToName });
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const updatePorterRequestStatus = async (
  id: string,
  statusData: Omit<UpdatePorterRequestStatusInput, 'id'>
): Promise<PorterRequestMessage> => {
  const { status, assigned_to_id, cancelled_reason, cancelled_by_id } = statusData;
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
    if (cancelled_by_id) {
      data.cancelledById = cancelled_by_id;
    }
  }

  if (assigned_to_id) {
    data.assignedToId = assigned_to_id;
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  let assignedToName: string | undefined;
  if (porterRequest.assignedToId) {
    const employee = await prisma.porterEmployee.findUnique({
      where: { id: porterRequest.assignedToId },
      select: { firstName: true, lastName: true }
    });
    if (employee) {
      assignedToName = `${employee.firstName} ${employee.lastName}`;
    }
  }

  const protoResponse = convertToProtoResponse({ ...porterRequest, assignedToName });

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

// ----- Location Settings Service -----

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

// ----- Employee Management Service -----

export const createEmployee = async (requestData: CreateEmployeeInput): Promise<PorterEmployeeMessage> => {
  const { citizen_id, first_name, last_name, nickname, profile_image, employment_type_id, position_id, status } = requestData;

  // แปลง employment_type_id และ position_id จาก string เป็น Int
  const employmentTypeIdInt = Number.parseInt(employment_type_id, 10);
  const positionIdInt = Number.parseInt(position_id, 10);

  if (Number.isNaN(employmentTypeIdInt) || Number.isNaN(positionIdInt)) {
    throw new Error("employment_type_id และ position_id ต้องเป็นตัวเลข");
  }

  const createData: Prisma.PorterEmployeeUncheckedCreateInput = {
    citizenId: citizen_id.trim(),
    firstName: first_name.trim(),
    lastName: last_name.trim(),
    nickname: nickname?.trim() || null,
    // ถ้าเป็น empty string (จาก gRPC) ให้ตั้งค่าเป็น null
    profileImage: profile_image && profile_image.trim() !== "" ? profile_image.trim() : null,
    employmentTypeId: employmentTypeIdInt,
    positionId: positionIdInt,
    status: status ?? true
  };

  const employee = await prisma.porterEmployee.create({
    data: createData
  });

  return convertEmployeeToProto(employee);
};

export const getEmployeeById = async (id: string): Promise<PorterEmployeeMessage | null> => {
  const employee = await prisma.porterEmployee.findUnique({
    where: { id }
  });

  return employee ? convertEmployeeToProto(employee) : null;
};

export const listEmployees = async (
  filters: ListEmployeesFilters
): Promise<PaginationResult<PorterEmployeeMessage>> => {
  const { employment_type_id, position_id, status, page = 1, page_size } = filters;

  const where: Prisma.PorterEmployeeWhereInput = {};

  if (employment_type_id !== undefined && employment_type_id !== null) {
    // แปลงจาก string เป็น Int
    const employmentTypeIdInt = parseInt(employment_type_id, 10);
    if (!isNaN(employmentTypeIdInt)) {
      where.employmentTypeId = employmentTypeIdInt;
    }
  }
  if (position_id !== undefined && position_id !== null) {
    // แปลงจาก string เป็น Int
    const positionIdInt = parseInt(position_id, 10);
    if (!isNaN(positionIdInt)) {
      where.positionId = positionIdInt;
    }
  }
  if (status !== undefined && status !== null) {
    where.status = status;
  }

  // ถ้า page_size เป็น undefined หรือ null ให้ดึงข้อมูลทั้งหมด
  const shouldPaginate = page_size !== undefined && page_size !== null;
  const skip = shouldPaginate ? (page - 1) * page_size : undefined;
  const take = shouldPaginate ? page_size : undefined;

  const queryOptions: any = {
    where,
    orderBy: { createdAt: 'desc' }
  };

  if (shouldPaginate) {
    queryOptions.skip = skip;
    queryOptions.take = take;
  }

  const [employees, total] = await Promise.all([
    prisma.porterEmployee.findMany(queryOptions),
    prisma.porterEmployee.count({ where })
  ]);

  return {
    data: employees.map(convertEmployeeToProto),
    total,
    page,
    page_size: page_size || total
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
  if (updateData.nickname !== undefined) {
    data.nickname = updateData.nickname?.trim() || null;
  }
  if (updateData.profile_image !== undefined) {
    // ถ้าเป็น empty string (จาก gRPC) หรือ null ให้ตั้งค่าเป็น null เพื่อลบรูปภาพ
    // gRPC protobuf ส่ง empty string แทน null สำหรับ optional string
    const trimmedValue = updateData.profile_image?.trim() || "";
    data.profileImage = trimmedValue !== "" ? trimmedValue : null;
  }
  if (updateData.employment_type_id !== undefined && updateData.employment_type_id !== null) {
    // แปลงจาก string เป็น Int
    const employmentTypeIdInt = Number.parseInt(updateData.employment_type_id, 10);
    if (Number.isNaN(employmentTypeIdInt)) {
      throw new Error("employment_type_id ต้องเป็นตัวเลข");
    }
    data.employmentTypeId = employmentTypeIdInt;
  }
  if (updateData.position_id !== undefined && updateData.position_id !== null) {
    // แปลงจาก string เป็น Int
    const positionIdInt = Number.parseInt(updateData.position_id, 10);
    if (Number.isNaN(positionIdInt)) {
      throw new Error("position_id ต้องเป็นตัวเลข");
    }
    data.positionId = positionIdInt;
  }
  if (updateData.status !== undefined && updateData.status !== null) {
    data.status = updateData.status;
  }

  const employee = await prisma.porterEmployee.update({
    where: { id },
    data
  });

  return convertEmployeeToProto(employee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await prisma.porterEmployee.delete({ where: { id } });
};

// ----- Helper functions -----

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

const convertToProtoResponse = (porterRequest: PorterRequestWithLocationNames): PorterRequestMessage => {
  const result = {
    id: porterRequest.id,
    created_at: porterRequest.createdAt.toISOString(),
    updated_at: porterRequest.updatedAt.toISOString(),
    requester_department: porterRequest.requesterDepartment ?? undefined,
    requester_name: porterRequest.requesterName,
    requester_phone: porterRequest.requesterPhone,
    requester_user_id: porterRequest.requesterUserID,
    patient_name: porterRequest.patientName,
    patient_hn: porterRequest.patientHN,
    patient_condition: formatPatientCondition(porterRequest.patientCondition),
    pickup_building_id: porterRequest.pickupBuildingId,
    pickup_building_name: porterRequest.pickupBuildingName || undefined,
    pickup_floor_department_id: porterRequest.pickupFloorDepartmentId,
    pickup_floor_department_name: porterRequest.pickupFloorDepartmentName || undefined,
    pickup_room_bed_name: porterRequest.pickupRoomBedName || undefined,
    delivery_building_id: porterRequest.deliveryBuildingId,
    delivery_building_name: porterRequest.deliveryBuildingName || undefined,
    delivery_floor_department_id: porterRequest.deliveryFloorDepartmentId,
    delivery_floor_department_name: porterRequest.deliveryFloorDepartmentName || undefined,
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
    assigned_to_name: porterRequest.assignedToName || undefined,
    accepted_at: porterRequest.acceptedAt?.toISOString() || undefined,
    completed_at: porterRequest.completedAt?.toISOString() || undefined,
    cancelled_at: porterRequest.cancelledAt?.toISOString() || undefined,
    cancelled_reason: porterRequest.cancelledReason || undefined,
    cancelled_by_id: porterRequest.cancelledById || undefined,
    pickup_at: porterRequest.pickupAt?.toISOString() || undefined,
    delivery_at: porterRequest.deliveryAt?.toISOString() || undefined,
    return_at: porterRequest.returnAt?.toISOString() || undefined
  };

  return result;
};

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
  nickname: employee.nickname || undefined,
  profile_image: employee.profileImage || undefined,
  // employment_type และ position จะถูก populate ที่ handler layer จาก hrd tables
  employment_type: undefined,
  employment_type_id: String(employee.employmentTypeId), // แปลง Int เป็น string สำหรับ proto
  position: undefined,
  position_id: String(employee.positionId), // แปลง Int เป็น string สำหรับ proto
  status: employee.status,
  created_at: employee.createdAt.toISOString(),
  updated_at: employee.updatedAt.toISOString()
});


