import { Prisma, type PorterRequest, type FloorDepartment, type PorterEmployee, type FloorPlan, type BleStation } from '@prisma/client';
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

type BuildingWithFloors = Prisma.BuildingGetPayload<{ include: { floors: true; floorPlans: { include: { stations: true } } } }>;
type FloorPlanEntity = FloorPlan & { stations: BleStation[] };
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
    specialNotes: special_notes ?? null,
    status: 'WAITING_CENTER'
  };

  const porterRequest = await prisma.porterRequest.create({ data: createData });
  
  // ดึงข้อมูล building names, floor department names, และ assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);

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

  // ดึงข้อมูล building names, floor department names, และ assigned employee name ก่อนส่งผ่าน stream
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
  const newStatus = mapStatusToPrisma(status);

  const oldRequest = await prisma.porterRequest.findUnique({ where: { id } });
  const oldStatus = oldRequest?.status;

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

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  // ดึงข้อมูล building names, floor department names, และ assigned employee name ก่อนส่งผ่าน stream
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

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data
  });

  // ดึงข้อมูล building names, floor department names, และ assigned employee name ก่อนส่งผ่าน stream
  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);
  
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

export const deletePorterRequest = async (id: string): Promise<void> => {
  const porterRequest = await prisma.porterRequest.findUnique({ where: { id } });

  if (!porterRequest) {
    return;
  }

  // ดึงข้อมูล building names, floor department names, และ assigned employee name ก่อนลบและส่งผ่าน stream
  const enrichedRequest = await enrichPorterRequestWithNames(porterRequest);
  const protoResponse = convertToProtoResponse(enrichedRequest);
  
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

  const building = await prisma.building.create({
    data: createData,
    include: {
      floors: {
        // ลบ orderBy ออกเพื่อหลีกเลี่ยง MySQL sort memory error
        // Frontend สามารถ sort เองได้ถ้าต้องการ
      },
      floorPlans: {
        include: {
          stations: true
        }
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
        // ลบ orderBy ออกเพื่อหลีกเลี่ยง MySQL sort memory error
        // Frontend สามารถ sort เองได้ถ้าต้องการ
      },
      floorPlans: {
        include: {
          stations: true
        }
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

  // ใช้ select แทน include เพื่อ exclude floorPlans (JSON field ที่ใหญ่มาก) 
  // เพื่อหลีกเลี่ยง MySQL sort memory error
  // ไม่ใช้ orderBy ใน nested floors เพื่อลด memory usage ในการ sort
  const [buildings, total] = await Promise.all([
    prisma.building.findMany({
      skip,
      take: page_size,
      select: {
        id: true,
        name: true,
        floorCount: true,
        // ไม่ดึง floorPlans เพื่อลด memory usage
        // floorPlans: true, // exclude เพื่อลด memory
        status: true,
        createdAt: true,
        updatedAt: true,
        floors: {
          // ลบ orderBy ออกเพื่อหลีกเลี่ยง MySQL sort memory error
          // Frontend สามารถ sort เองได้ถ้าต้องการ
        }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.building.count()
  ]);

  // แปลงเป็น BuildingWithFloors format โดยเพิ่ม floorPlans เป็น empty array
  // Type assertion เพื่อให้ type ตรงกับ BuildingWithFloors
  const buildingsWithFloors = buildings.map(b => ({
    ...b,
    floorPlans: []
  })) as BuildingWithFloors[];

  return {
    data: buildingsWithFloors.map(convertBuildingToProto),
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

  // จัดการ floor plans แบบ upsert
  if (updateData.floor_plans !== undefined) {
    // ลบ floor plans ที่ไม่มีในรายการใหม่
    const existingFloorPlans = await prisma.floorPlan.findMany({
      where: { buildingId: id },
      select: { id: true, floorNumber: true }
    });

    const incomingFloorNumbers = new Set(updateData.floor_plans.map(fp => fp.floor_number));
    const toDelete = existingFloorPlans.filter((efp: { id: string; floorNumber: number }) => !incomingFloorNumbers.has(efp.floorNumber));

    if (toDelete.length > 0) {
      await prisma.floorPlan.deleteMany({
        where: {
          id: { in: toDelete.map((d: { id: string }) => d.id) }
        }
      });
    }

    // Upsert floor plans
    if (updateData.floor_plans.length > 0) {
      // ใช้ Promise.all เพื่อ upsert แต่ละ floor plan
      await Promise.all(
        updateData.floor_plans.map(fp =>
          prisma.floorPlan.upsert({
            where: {
              buildingId_floorNumber: {
                buildingId: id,
                floorNumber: fp.floor_number
              }
            },
            create: {
              buildingId: id,
              floorNumber: fp.floor_number,
              imageData: fp.image_data
            },
            update: {
              imageData: fp.image_data
            }
          })
        )
      );
    } else {
      // ถ้าไม่มี floor plans ให้ลบทั้งหมด
      await prisma.floorPlan.deleteMany({
        where: { buildingId: id }
      });
    }
  }

  const building = await prisma.building.update({
    where: { id },
    data,
    include: {
      floors: {
        // ลบ orderBy ออกเพื่อหลีกเลี่ยง MySQL sort memory error
        // Frontend สามารถ sort เองได้ถ้าต้องการ
      },
      floorPlans: {
        include: {
          stations: true
        }
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
  if (updateData.user_id !== undefined) {
    data.userId = updateData.user_id?.trim() || null;
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

/**
 * Helper function สำหรับดึงข้อมูล building names, floor department names, และ assigned employee name
 * เพื่อให้ข้อมูลครบถ้วนก่อนส่งผ่าน stream
 */
const enrichPorterRequestWithNames = async (
  porterRequest: PorterRequest
): Promise<PorterRequestWithLocationNames> => {
  // ดึงข้อมูล building names, floor department names, และ assigned employee name พร้อมกัน
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

  return {
    ...porterRequest,
    pickupBuildingName: pickupBuilding?.name,
    pickupFloorDepartmentName: pickupFloorDepartment?.name,
    deliveryBuildingName: deliveryBuilding?.name,
    deliveryFloorDepartmentName: deliveryFloorDepartment?.name,
    assignedToName: assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : undefined
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

const convertBuildingToProto = (building: BuildingWithFloors): BuildingMessage => {
  return {
    id: building.id,
    name: building.name,
    floor_count: building.floorCount ?? undefined,
    floor_plans: building.floorPlans?.map(convertFloorPlanToProto) ?? [],
    status: building.status,
    created_at: building.createdAt.toISOString(),
    updated_at: building.updatedAt.toISOString(),
    floors: building.floors?.map(convertFloorDepartmentToProto) ?? []
  };
};

const convertFloorPlanToProto = (floorPlan: FloorPlanEntity): import('../types/porter').FloorPlanMessage => {
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

const convertBleStationToProto = (station: BleStation): import('../types/porter').BleStationMessage => {
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
  updated_at: employee.updatedAt.toISOString(),
  user_id: employee.userId || undefined
});

// ===== FloorPlan Service Functions =====

export const createFloorPlan = async (requestData: CreateFloorPlanInput): Promise<FloorPlanMessage> => {
  const { id, building_id, floor_number, image_data } = requestData;

  // ตรวจสอบว่า building_id มีอยู่จริง
  const building = await prisma.building.findUnique({
    where: { id: building_id }
  });

  if (!building) {
    throw new Error(`Building with id ${building_id} not found`);
  }

  // ตรวจสอบว่า floor_number นี้มีอยู่แล้วหรือไม่
  const existingFloorPlan = await prisma.floorPlan.findUnique({
    where: {
      buildingId_floorNumber: {
        buildingId: building_id,
        floorNumber: floor_number
      }
    }
  });

  if (existingFloorPlan) {
    throw new Error(`Floor plan for building ${building_id} at floor ${floor_number} already exists`);
  }

  const createData: Prisma.FloorPlanUncheckedCreateInput = {
    buildingId: building_id,
    floorNumber: floor_number,
    imageData: image_data
  };

  if (id) {
    createData.id = id;
  }

  const floorPlan = await prisma.floorPlan.create({
    data: createData,
    include: {
      stations: true
    }
  });

  return convertFloorPlanToProto(floorPlan);
};

export const getFloorPlanById = async (id: string): Promise<FloorPlanMessage | null> => {
  const floorPlan = await prisma.floorPlan.findUnique({
    where: { id },
    include: {
      stations: true
    }
  });

  return floorPlan ? convertFloorPlanToProto(floorPlan) : null;
};

export const listFloorPlans = async (
  filters: ListFloorPlansFilters
): Promise<PaginationResult<FloorPlanMessage>> => {
  const { building_id, floor_number, page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const where: Prisma.FloorPlanWhereInput = {};
  if (building_id) {
    where.buildingId = building_id;
  }
  if (floor_number !== undefined) {
    where.floorNumber = floor_number;
  }

  const [floorPlans, total] = await Promise.all([
    prisma.floorPlan.findMany({
      where,
      skip,
      take: page_size,
      include: {
        stations: true
      },
      orderBy: [
        { buildingId: 'asc' },
        { floorNumber: 'asc' }
      ]
    }),
    prisma.floorPlan.count({ where })
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
    // ตรวจสอบว่า building_id มีอยู่จริง
    const building = await prisma.building.findUnique({
      where: { id: updateData.building_id }
    });

    if (!building) {
      throw new Error(`Building with id ${updateData.building_id} not found`);
    }

    data.buildingId = updateData.building_id;
  }

  if (updateData.floor_number !== undefined) {
    data.floorNumber = updateData.floor_number;

    // ตรวจสอบว่า floor_number ใหม่ไม่ซ้ำกับ floor plan อื่นใน building เดียวกัน
    const currentFloorPlan = await prisma.floorPlan.findUnique({
      where: { id }
    });

    if (currentFloorPlan && updateData.building_id) {
      const existingFloorPlan = await prisma.floorPlan.findUnique({
        where: {
          buildingId_floorNumber: {
            buildingId: updateData.building_id,
            floorNumber: updateData.floor_number
          }
        }
      });

      if (existingFloorPlan && existingFloorPlan.id !== id) {
        throw new Error(`Floor plan for building ${updateData.building_id} at floor ${updateData.floor_number} already exists`);
      }
    } else if (currentFloorPlan && !updateData.building_id) {
      const existingFloorPlan = await prisma.floorPlan.findUnique({
        where: {
          buildingId_floorNumber: {
            buildingId: currentFloorPlan.buildingId,
            floorNumber: updateData.floor_number
          }
        }
      });

      if (existingFloorPlan && existingFloorPlan.id !== id) {
        throw new Error(`Floor plan for building ${currentFloorPlan.buildingId} at floor ${updateData.floor_number} already exists`);
      }
    }
  }

  if (updateData.image_data !== undefined) {
    data.imageData = updateData.image_data;
  }

  const floorPlan = await prisma.floorPlan.update({
    where: { id },
    data,
    include: {
      stations: true
    }
  });

  return convertFloorPlanToProto(floorPlan);
};

export const deleteFloorPlan = async (id: string): Promise<void> => {
  await prisma.floorPlan.delete({
    where: { id }
  });
};

// ===== BleStation Service Functions =====

export const createBleStation = async (requestData: CreateBleStationInput): Promise<BleStationMessage> => {
  const { id, floor_plan_id, name, mac_address, uuid, position_x, position_y, signal_strength, battery_level, status } = requestData;

  // ตรวจสอบว่า floor_plan_id มีอยู่จริง
  const floorPlan = await prisma.floorPlan.findUnique({
    where: { id: floor_plan_id }
  });

  if (!floorPlan) {
    throw new Error(`Floor plan with id ${floor_plan_id} not found`);
  }

  // ตรวจสอบว่า mac_address ไม่ซ้ำ
  const existingStation = await prisma.bleStation.findUnique({
    where: { macAddress: mac_address }
  });

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

  if (id) {
    createData.id = id;
  }

  const station = await prisma.bleStation.create({
    data: createData
  });

  return convertBleStationToProto(station);
};

export const getBleStationById = async (id: string): Promise<BleStationMessage | null> => {
  const station = await prisma.bleStation.findUnique({
    where: { id }
  });

  return station ? convertBleStationToProto(station) : null;
};

export const listBleStations = async (
  filters: ListBleStationsFilters
): Promise<PaginationResult<BleStationMessage>> => {
  const { floor_plan_id, status, page = 1, page_size = 100 } = filters;
  const skip = (page - 1) * page_size;

  const where: Prisma.BleStationWhereInput = {};
  if (floor_plan_id) {
    where.floorPlanId = floor_plan_id;
  }
  if (status !== undefined) {
    where.status = status;
  }

  const [stations, total] = await Promise.all([
    prisma.bleStation.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { createdAt: 'asc' }
    }),
    prisma.bleStation.count({ where })
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
    // ตรวจสอบว่า mac_address ไม่ซ้ำกับ station อื่น
    const existingStation = await prisma.bleStation.findUnique({
      where: { macAddress: updateData.mac_address }
    });

    if (existingStation && existingStation.id !== id) {
      throw new Error(`BLE Station with MAC address ${updateData.mac_address} already exists`);
    }

    data.macAddress = updateData.mac_address;
  }

  if (updateData.uuid !== undefined) {
    data.uuid = updateData.uuid || null;
  }

  if (updateData.position_x !== undefined) {
    data.positionX = updateData.position_x;
  }

  if (updateData.position_y !== undefined) {
    data.positionY = updateData.position_y;
  }

  if (updateData.signal_strength !== undefined) {
    data.signalStrength = updateData.signal_strength ?? null;
  }

  if (updateData.battery_level !== undefined) {
    data.batteryLevel = updateData.battery_level ?? null;
  }

  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const station = await prisma.bleStation.update({
    where: { id },
    data
  });

  return convertBleStationToProto(station);
};

export const deleteBleStation = async (id: string): Promise<void> => {
  await prisma.bleStation.delete({
    where: { id }
  });
};


