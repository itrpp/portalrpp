import { Prisma, type PorterRequest } from '../generated/prisma/client';
import porterEventEmitter from '../utils/eventEmitter';
import * as buildingRepo from '../repositories/building.repository';
import * as bleStationRepo from '../repositories/bleStation.repository';
import * as floorDepartmentRepo from '../repositories/floorDepartment.repository';
import * as floorPlanRepo from '../repositories/floorPlan.repository';
import * as porterEmployeeRepo from '../repositories/porterEmployee.repository';
import * as porterRequestRepo from '../repositories/porterRequest.repository';
import { ping as dbPing } from '../repositories/database.repository';
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
  PORTER_STATUS_WAIT_GROUP,
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
  HealthCheckResult,
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
  ListFloorPlansFilters,
  FloorPlanMessage,
  CreateBleStationInput,
  UpdateBleStationInput,
  ListBleStationsFilters,
  BleStationMessage
} from '../types/porter';

import type { Building, FloorDepartment } from '../generated/prisma/client';
import type { BuildingWithFloorsAndFloorPlans } from '../repositories/building.repository';
import type { FloorDepartmentWithBuilding } from '../repositories/floorDepartment.repository';
import type { FloorPlanWithStations } from '../repositories/floorPlan.repository';
import type { PorterEmployee } from '../generated/prisma/client';

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
    specialNotes: special_notes ?? null,
    status: 'WAITING_CENTER'
  };

  const porterRequest = await porterRequestRepo.createPorterRequest(createData);

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  porterEventEmitter.emit('porterRequestCreated', protoResponse);

  return protoResponse;
};

export const getPorterRequestById = async (id: string): Promise<PorterRequestMessage | null> => {
  const porterRequest = await porterRequestRepo.findPorterRequestById(id);
  if (!porterRequest) return null;

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  return convertToProtoResponse(enrichedRequest);
};

export const listPorterRequests = async (
  filters: ListPorterRequestsFilters
): Promise<PaginationResult<PorterRequestMessage>> => {
  const { status, urgency_level, requester_user_id, assigned_to_id, page = 1, page_size = 20 } = filters;

  const where: Prisma.PorterRequestWhereInput = {};

  if (status !== undefined && status !== null) {
    const s = String(status).trim();
    if (s === 'WAITING') {
      where.status = { in: PORTER_STATUS_WAIT_GROUP };
    } else {
      where.status = mapStatusToPrisma(status);
    }
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
    porterRequestRepo.findManyPorterRequests({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'desc' }
    }),
    porterRequestRepo.countPorterRequests(where)
  ]);

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

  const [buildingMap, floorDepartmentMap, employeeMap] = await Promise.all([
    buildingRepo.findBuildingNamesByIds(Array.from(buildingIds)),
    floorDepartmentRepo.findFloorDepartmentNamesByIds(Array.from(floorDepartmentIds)),
    porterEmployeeRepo.findPorterEmployeeNamesByIds(Array.from(employeeIds))
  ]);

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

  const porterRequest = await porterRequestRepo.updatePorterRequest(id, data);

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const updatePorterRequestStatus = async (
  id: string,
  statusData: Omit<UpdatePorterRequestStatusInput, 'id'>
): Promise<PorterRequestMessage> => {
  const { status, assigned_to_id, cancelled_reason, cancelled_by_id, accepted_by_id } = statusData;
  let newStatus = mapStatusToPrisma(status);

  const oldRequest = await porterRequestRepo.findPorterRequestById(id);
  const oldStatus = oldRequest?.status;

  // หลังเลือกผู้ปฏิบัติงาน (มอบหมาย): ถ้ามี assigned_to_id และสถานะเดิมเป็น WAITING_CENTER → เปลี่ยนเป็น WAITING_ACCEPT
  if (assigned_to_id && oldRequest?.status === 'WAITING_CENTER' && newStatus === 'WAITING_CENTER') {
    newStatus = 'WAITING_ACCEPT';
  }

  const data: Prisma.PorterRequestUpdateInput = {
    status: newStatus
  };

  if (newStatus === 'IN_PROGRESS') {
    data.acceptedAt = new Date();
    if (accepted_by_id) {
      data.acceptedById = accepted_by_id;
    }
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

  const porterRequest = await porterRequestRepo.updatePorterRequest(id, data);

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

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

  const porterRequest = await porterRequestRepo.updatePorterRequest(id, data);

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const deletePorterRequest = async (id: string): Promise<void> => {
  const porterRequest = await porterRequestRepo.findPorterRequestById(id);

  if (!porterRequest) {
    return;
  }

  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

  await porterRequestRepo.deletePorterRequest(id);
  porterEventEmitter.emit('porterRequestDeleted', protoResponse);
};

export const healthCheck = async (): Promise<HealthCheckResult> => {
  await dbPing();
  return {
    success: true,
    message: 'Porter service is healthy',
    timestamp: new Date().toISOString()
  };
};

// ----- Location Settings Service -----

export const createBuilding = async (requestData: CreateBuildingInput): Promise<BuildingMessage> => {
  const { id, name, floor_count, floor_plans, status } = requestData;

  const createData: Prisma.BuildingUncheckedCreateInput = {
    name: name.trim(),
    floorCount: floor_count ?? null,
    status: status !== undefined ? status : true,
    floorPlans: floor_plans && floor_plans.length > 0 ? {
      create: floor_plans.map(fp => ({
        floorNumber: fp.floor_number,
        imageData: fp.image_data
      }))
    } : undefined
  };

  if (id) {
    createData.id = id;
  }

  const building = await buildingRepo.createBuilding(createData);
  return convertBuildingToProto(building);
};

export const getBuildingById = async (id: string): Promise<BuildingMessage | null> => {
  const building = await buildingRepo.findBuildingById(id);
  return building ? convertBuildingToProto(building) : null;
};

export const listBuildings = async (
  filters: ListBuildingsFilters
): Promise<PaginationResult<BuildingMessage>> => {
  const { page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const [buildings, total] = await Promise.all([
    buildingRepo.findBuildingsList({
      skip,
      take: page_size,
      orderBy: { createdAt: 'asc' }
    }),
    buildingRepo.countBuildings()
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

  if (updateData.floor_plans !== undefined) {
    const existingFloorPlans = await floorPlanRepo.findManyFloorPlanIdsByBuildingId(id);
    const incomingFloorNumbers = new Set(updateData.floor_plans.map(fp => fp.floor_number));
    const toDelete = existingFloorPlans.filter(
      (efp) => !incomingFloorNumbers.has(efp.floorNumber)
    );

    if (toDelete.length > 0) {
      await floorPlanRepo.deleteManyFloorPlansByIds(toDelete.map((d) => d.id));
    }

    if (updateData.floor_plans.length > 0) {
      await Promise.all(
        updateData.floor_plans.map((fp) =>
          floorPlanRepo.upsertFloorPlan({
            where: { buildingId: id, floorNumber: fp.floor_number },
            create: {
              buildingId: id,
              floorNumber: fp.floor_number,
              imageData: fp.image_data
            },
            update: { imageData: fp.image_data }
          })
        )
      );
    } else {
      await floorPlanRepo.deleteManyFloorPlansByBuildingId(id);
    }
  }

  const building = await buildingRepo.updateBuilding(id, data);
  return convertBuildingToProto(building);
};

export const deleteBuilding = async (id: string): Promise<void> => {
  await buildingRepo.deleteBuilding(id);
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

  const floorDepartment = await floorDepartmentRepo.createFloorDepartment(createData);
  return convertFloorDepartmentToProto(floorDepartment);
};

export const getFloorDepartmentById = async (id: string): Promise<FloorDepartmentMessage | null> => {
  const floorDepartment = await floorDepartmentRepo.findFloorDepartmentById(id);
  return floorDepartment ? convertFloorDepartmentToProto(floorDepartment) : null;
};

export const listFloorDepartments = async (
  filters: ListFloorDepartmentsFilters
): Promise<PaginationResult<FloorDepartmentMessage>> => {
  const { building_id, department_type, page = 1, page_size = 100 } = filters;

  const where: Prisma.FloorDepartmentWhereInput = {};
  if (building_id) where.buildingId = building_id;
  if (department_type) where.departmentType = department_type;

  const skip = (page - 1) * page_size;

  const [floorDepartments, total] = await Promise.all([
    floorDepartmentRepo.findManyFloorDepartments({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'asc' }
    }),
    floorDepartmentRepo.countFloorDepartments(where)
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

  const floorDepartment = await floorDepartmentRepo.updateFloorDepartment(id, data);
  return convertFloorDepartmentToProto(floorDepartment);
};

export const deleteFloorDepartment = async (id: string): Promise<void> => {
  await floorDepartmentRepo.deleteFloorDepartment(id);
};

// ----- Employee Management Service -----

export const createEmployee = async (requestData: CreateEmployeeInput): Promise<PorterEmployeeMessage> => {
  const { citizen_id, first_name, last_name, nickname, profile_image, employment_type_id, position_id, status, user_id } = requestData;

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
    status: status ?? true,
    userId: user_id?.trim() || null
  };

  const employee = await porterEmployeeRepo.createPorterEmployee(createData);
  return convertEmployeeToProto(employee);
};

export const getEmployeeById = async (id: string): Promise<PorterEmployeeMessage | null> => {
  const employee = await porterEmployeeRepo.findPorterEmployeeById(id);
  return employee ? convertEmployeeToProto(employee) : null;
};

export const listEmployees = async (
  filters: ListEmployeesFilters
): Promise<PaginationResult<PorterEmployeeMessage>> => {
  const { employment_type_id, position_id, status, user_id, page = 1, page_size } = filters;

  const where: Prisma.PorterEmployeeWhereInput = {};
  if (employment_type_id !== undefined && employment_type_id !== null) {
    const employmentTypeIdInt = parseInt(employment_type_id, 10);
    if (!isNaN(employmentTypeIdInt)) where.employmentTypeId = employmentTypeIdInt;
  }
  if (position_id !== undefined && position_id !== null) {
    const positionIdInt = parseInt(position_id, 10);
    if (!isNaN(positionIdInt)) where.positionId = positionIdInt;
  }
  if (status !== undefined && status !== null) where.status = status;
  if (user_id !== undefined && user_id !== null && user_id.trim() !== '') {
    where.userId = user_id.trim();
  }

  const shouldPaginate = page_size !== undefined && page_size !== null;
  const skip = shouldPaginate ? (page - 1) * page_size : undefined;
  const take = shouldPaginate ? page_size : undefined;

  const [employees, total] = await Promise.all([
    porterEmployeeRepo.findManyPorterEmployees({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    }),
    porterEmployeeRepo.countPorterEmployees(where)
  ]);

  return {
    data: employees.map(convertEmployeeToProto),
    total,
    page,
    page_size: page_size ?? total
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
  if (updateData.user_id !== undefined) {
    const newUserId = updateData.user_id?.trim() || null;
    data.userId = newUserId;

    if (newUserId) {
      const existing = await porterEmployeeRepo.findFirstPorterEmployeeIdByUserId(
        newUserId,
        id
      );
      if (existing) {
        throw new Error('USER_ALREADY_LINKED');
      }
    }
  }

  const employee = await porterEmployeeRepo.updatePorterEmployee(id, data);
  return convertEmployeeToProto(employee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await porterEmployeeRepo.deletePorterEmployee(id);
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

/**
 * ดึง building / floor department / employee names แล้ว merge เข้า porter request (สำหรับ stream และ response)
 */
const enrichPorterRequestWithNames = async (
  porterRequest: PorterRequest
): Promise<PorterRequestWithLocationNames> => {
  const buildingIds = [
    porterRequest.pickupBuildingId,
    porterRequest.deliveryBuildingId
  ];
  const floorDepartmentIds = [
    porterRequest.pickupFloorDepartmentId,
    porterRequest.deliveryFloorDepartmentId
  ];
  const employeeIds = porterRequest.assignedToId
    ? [porterRequest.assignedToId]
    : [];

  const [buildingMap, floorDepartmentMap, employeeMap] = await Promise.all([
    buildingRepo.findBuildingNamesByIds(buildingIds),
    floorDepartmentRepo.findFloorDepartmentNamesByIds(floorDepartmentIds),
    porterEmployeeRepo.findPorterEmployeeNamesByIds(employeeIds)
  ]);

  return {
    ...porterRequest,
    pickupBuildingName: buildingMap.get(porterRequest.pickupBuildingId),
    pickupFloorDepartmentName: floorDepartmentMap.get(
      porterRequest.pickupFloorDepartmentId
    ),
    deliveryBuildingName: buildingMap.get(porterRequest.deliveryBuildingId),
    deliveryFloorDepartmentName: floorDepartmentMap.get(
      porterRequest.deliveryFloorDepartmentId
    ),
    assignedToName: porterRequest.assignedToId
      ? employeeMap.get(porterRequest.assignedToId)
      : undefined
  };
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
    accepted_by_id: porterRequest.acceptedById || undefined,
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

type BuildingListItem = Building & { floors: unknown[]; floorPlans: never[] };

const convertBuildingToProto = (
  building: BuildingWithFloorsAndFloorPlans | BuildingListItem
): BuildingMessage => {
  const floorPlans = Array.isArray(building.floorPlans)
    ? (building.floorPlans as FloorPlanWithStations[]).map(convertFloorPlanToProto)
    : [];
  const floors = Array.isArray(building.floors)
    ? (building.floors as FloorDepartment[]).map(convertFloorDepartmentToProto)
    : [];
  return {
    id: building.id,
    name: building.name,
    floor_count: building.floorCount ?? undefined,
    floor_plans: floorPlans,
    status: building.status,
    created_at: building.createdAt.toISOString(),
    updated_at: building.updatedAt.toISOString(),
    floors
  };
};

const convertFloorPlanToProto = (
  floorPlan: FloorPlanWithStations
): import('../types/porter').FloorPlanMessage => {
  return {
    id: floorPlan.id,
    building_id: floorPlan.buildingId,
    floor_number: floorPlan.floorNumber,
    image_data: floorPlan.imageData,
    stations: floorPlan.stations?.map(convertBleStationToProto) ?? [],
    created_at: floorPlan.createdAt.toISOString(),
    updated_at: floorPlan.updatedAt.toISOString()
  };
};

const convertBleStationToProto = (
  station: import('../generated/prisma/client').BleStation
): import('../types/porter').BleStationMessage => {
  return {
    id: station.id,
    floor_plan_id: station.floorPlanId,
    name: station.name,
    mac_address: station.macAddress,
    uuid: station.uuid ?? undefined,
    position_x: station.positionX,
    position_y: station.positionY,
    signal_strength: station.signalStrength ?? undefined,
    battery_level: station.batteryLevel ?? undefined,
    status: station.status,
    created_at: station.createdAt.toISOString(),
    updated_at: station.updatedAt.toISOString()
  };
};

const convertFloorDepartmentToProto = (
  floorDepartment: FloorDepartmentWithBuilding | FloorDepartment
): FloorDepartmentMessage => ({
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

const convertEmployeeToProto = (
  employee: PorterEmployee
): PorterEmployeeMessage => ({
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
  updated_at: employee.updatedAt.toISOString(),
  user_id: employee.userId || undefined
});

// ===== FloorPlan Service Functions =====

export const createFloorPlan = async (requestData: CreateFloorPlanInput): Promise<FloorPlanMessage> => {
  const { id, building_id, floor_number, image_data } = requestData;

  const building = await buildingRepo.findBuildingById(building_id);
  if (!building) {
    throw new Error(`Building with id ${building_id} not found`);
  }

  const existingFloorPlan = await floorPlanRepo.findFloorPlanByBuildingIdAndFloorNumber(
    building_id,
    floor_number
  );
  if (existingFloorPlan) {
    throw new Error(
      `Floor plan for building ${building_id} at floor ${floor_number} already exists`
    );
  }

  const createData: Prisma.FloorPlanUncheckedCreateInput = {
    buildingId: building_id,
    floorNumber: floor_number,
    imageData: image_data
  };
  if (id) createData.id = id;

  const floorPlan = await floorPlanRepo.createFloorPlan(createData);
  return convertFloorPlanToProto(floorPlan);
};

export const getFloorPlanById = async (id: string): Promise<FloorPlanMessage | null> => {
  const floorPlan = await floorPlanRepo.findFloorPlanById(id);
  return floorPlan ? convertFloorPlanToProto(floorPlan) : null;
};

export const listFloorPlans = async (
  filters: ListFloorPlansFilters
): Promise<PaginationResult<FloorPlanMessage>> => {
  const { building_id, floor_number, page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const where: Prisma.FloorPlanWhereInput = {};
  if (building_id) where.buildingId = building_id;
  if (floor_number !== undefined) where.floorNumber = floor_number;

  const [floorPlans, total] = await Promise.all([
    floorPlanRepo.findManyFloorPlans({
      where,
      skip,
      take: page_size,
      orderBy: [{ buildingId: 'asc' }, { floorNumber: 'asc' }]
    }),
    floorPlanRepo.countFloorPlans(where)
  ]);

  return {
    data: floorPlans.map(convertFloorPlanToProto),
    total,
    page,
    page_size
  };
};

export const updateFloorPlan = async (
  id: string,
  updateData: UpdateFloorPlanInput
): Promise<FloorPlanMessage> => {
  const data: Prisma.FloorPlanUncheckedUpdateInput = {};

  if (updateData.building_id !== undefined) {
    const building = await buildingRepo.findBuildingById(updateData.building_id);
    if (!building) {
      throw new Error(`Building with id ${updateData.building_id} not found`);
    }
    data.buildingId = updateData.building_id;
  }

  if (updateData.floor_number !== undefined) {
    data.floorNumber = updateData.floor_number;

    const currentFloorPlan = await floorPlanRepo.findFloorPlanById(id);
    const targetBuildingId = updateData.building_id ?? currentFloorPlan?.buildingId;
    const targetFloorNumber = updateData.floor_number;

    if (currentFloorPlan && targetBuildingId) {
      const existingFloorPlan =
        await floorPlanRepo.findFloorPlanByBuildingIdAndFloorNumber(
          targetBuildingId,
          targetFloorNumber
        );
      if (existingFloorPlan && existingFloorPlan.id !== id) {
        throw new Error(
          `Floor plan for building ${targetBuildingId} at floor ${targetFloorNumber} already exists`
        );
      }
    }
  }

  if (updateData.image_data !== undefined) {
    data.imageData = updateData.image_data;
  }

  const floorPlan = await floorPlanRepo.updateFloorPlan(id, data);
  return convertFloorPlanToProto(floorPlan);
};

export const deleteFloorPlan = async (id: string): Promise<void> => {
  await floorPlanRepo.deleteFloorPlan(id);
};

// ===== BleStation Service Functions =====

export const createBleStation = async (requestData: CreateBleStationInput): Promise<BleStationMessage> => {
  const { id, floor_plan_id, name, mac_address, uuid, position_x, position_y, signal_strength, battery_level, status } = requestData;

  const floorPlan = await floorPlanRepo.findFloorPlanById(floor_plan_id);
  if (!floorPlan) {
    throw new Error(`Floor plan with id ${floor_plan_id} not found`);
  }

  const existingStation = await bleStationRepo.findBleStationByMacAddress(mac_address);
  if (existingStation) {
    throw new Error(`BLE Station with MAC address ${mac_address} already exists`);
  }

  const createData: Prisma.BleStationUncheckedCreateInput = {
    floorPlanId: floor_plan_id,
    name: name.trim(),
    macAddress: mac_address,
    uuid: uuid || null,
    positionX: position_x,
    positionY: position_y,
    signalStrength: signal_strength ?? null,
    batteryLevel: battery_level ?? null,
    status: status !== undefined ? status : true
  };
  if (id) createData.id = id;

  const station = await bleStationRepo.createBleStation(createData);
  return convertBleStationToProto(station);
};

export const getBleStationById = async (id: string): Promise<BleStationMessage | null> => {
  const station = await bleStationRepo.findBleStationById(id);
  return station ? convertBleStationToProto(station) : null;
};

export const listBleStations = async (
  filters: ListBleStationsFilters
): Promise<PaginationResult<BleStationMessage>> => {
  const { floor_plan_id, status, page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const where: Prisma.BleStationWhereInput = {};
  if (floor_plan_id) where.floorPlanId = floor_plan_id;
  if (status !== undefined) where.status = status;

  const [stations, total] = await Promise.all([
    bleStationRepo.findManyBleStations({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'asc' }
    }),
    bleStationRepo.countBleStations(where)
  ]);

  return {
    data: stations.map(convertBleStationToProto),
    total,
    page,
    page_size
  };
};

export const updateBleStation = async (
  id: string,
  updateData: UpdateBleStationInput
): Promise<BleStationMessage> => {
  const data: Prisma.BleStationUpdateInput = {};

  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }

  if (updateData.mac_address !== undefined) {
    const existingStation = await bleStationRepo.findBleStationByMacAddress(
      updateData.mac_address
    );
    if (existingStation && existingStation.id !== id) {
      throw new Error(
        `BLE Station with MAC address ${updateData.mac_address} already exists`
      );
    }
    data.macAddress = updateData.mac_address;
  }

  if (updateData.uuid !== undefined) {
    data.uuid = updateData.uuid || null;
  }

  if (updateData.position_x !== undefined) data.positionX = updateData.position_x;
  if (updateData.position_y !== undefined) data.positionY = updateData.position_y;
  if (updateData.signal_strength !== undefined) {
    data.signalStrength = updateData.signal_strength ?? null;
  }
  if (updateData.battery_level !== undefined) {
    data.batteryLevel = updateData.battery_level ?? null;
  }
  if (updateData.status !== undefined) data.status = updateData.status;

  const station = await bleStationRepo.updateBleStation(id, data);
  return convertBleStationToProto(station);
};

export const deleteBleStation = async (id: string): Promise<void> => {
  await bleStationRepo.deleteBleStation(id);
};


