import prisma from '../config/database.js';
import porterEventEmitter from '../utils/eventEmitter.js';
import {
  mapUrgencyLevelToPrisma,
  mapUrgencyLevelToProto,
  mapVehicleTypeToPrisma,
  mapVehicleTypeToProto,
  mapHasVehicleToPrisma,
  mapHasVehicleToProto,
  mapReturnTripToPrisma,
  mapReturnTripToProto,
  mapStatusToPrisma,
  mapStatusToProto,
  mapEquipmentToPrisma,
  mapEquipmentToProto,
} from '../utils/enumMapper.js';

/**
 * Porter Service
 * จัดการ business logic และ database operations สำหรับ Porter Request
 */

/**
 * สร้าง Porter Request ใหม่
 */
export const createPorterRequest = async (requestData) => {
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
    special_notes,
  } = requestData;

  // ตรวจสอบและแปลง undefined เป็น null สำหรับ optional fields
  // Field ที่ required ต้องมีค่า (ไม่ใช่ null หรือ undefined)
  
  // แปลง patient_condition จาก string (join ด้วย ", ") เป็น array
  let patientConditionArray = null;
  if (patient_condition) {
    if (typeof patient_condition === 'string') {
      // ถ้าเป็น string ให้ split ด้วย ", "
      patientConditionArray = patient_condition.split(", ").filter(Boolean);
    } else if (Array.isArray(patient_condition)) {
      // ถ้าเป็น array อยู่แล้วให้ใช้เลย
      patientConditionArray = patient_condition;
    }
  }
  
  const createData = {
    requesterDepartment: requester_department,
    requesterName: requester_name,
    requesterPhone: requester_phone,
    patientName: patient_name,
    patientHN: patient_hn,
    patientCondition: patientConditionArray,
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
    equipment: equipment && Array.isArray(equipment) && equipment.length > 0
      ? JSON.stringify(mapEquipmentToPrisma(equipment))
      : JSON.stringify([]),
    equipmentOther: equipment_other ?? null,
    specialNotes: special_notes ?? null,
  };

  const porterRequest = await prisma.porterRequest.create({
    data: createData,
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  porterEventEmitter.emit('porterRequestCreated', protoResponse);

  return protoResponse;
};

/**
 * ดึงข้อมูล Porter Request โดย ID
 */
export const getPorterRequestById = async (id) => {
  const porterRequest = await prisma.porterRequest.findUnique({
    where: { id },
  });

  if (!porterRequest) {
    return null;
  }

  return convertToProtoResponse(porterRequest);
};

/**
 * ดึงรายการ Porter Request พร้อม filters และ pagination
 */
export const listPorterRequests = async (filters) => {
  const {
    status,
    urgency_level,
    assigned_to_id,
    page = 1,
    page_size = 20,
  } = filters;

  // สร้าง filter object
  const where = {};
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
      orderBy: { createdAt: 'desc' },
    }),
    prisma.porterRequest.count({ where }),
  ]);

  return {
    data: porterRequests.map((pr) => convertToProtoResponse(pr)),
    total,
    page,
    page_size,
  };
};

/**
 * อัปเดตข้อมูล Porter Request
 */
export const updatePorterRequest = async (id, updateData) => {
  const data = {};

  // แปลง update data
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
    // แปลง patient_condition จาก string (join ด้วย ", ") เป็น array
    if (typeof updateData.patient_condition === 'string') {
      data.patientCondition = updateData.patient_condition.split(", ").filter(Boolean);
    } else if (Array.isArray(updateData.patient_condition)) {
      data.patientCondition = updateData.patient_condition;
    } else if (updateData.patient_condition === null) {
      data.patientCondition = null;
    }
  }
  if (updateData.requested_date_time) {
    data.requestedDateTime = new Date(updateData.requested_date_time);
  }
  if (updateData.special_notes !== undefined) {
    data.specialNotes = updateData.special_notes;
  }

  // แปลง enum
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
  if (updateData.equipment && updateData.equipment.length > 0) {
    data.equipment = JSON.stringify(mapEquipmentToPrisma(updateData.equipment));
  }
  if (updateData.equipment_other !== undefined) {
    data.equipmentOther = updateData.equipment_other ?? null;
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data,
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

/**
 * อัปเดตสถานะ Porter Request
 */
export const updatePorterRequestStatus = async (id, statusData) => {
  const { status, assigned_to_id, cancelled_reason } = statusData;

  const newStatus = mapStatusToPrisma(status);

  // ดึงข้อมูลเก่าก่อนเพื่อเปรียบเทียบ status
  const oldRequest = await prisma.porterRequest.findUnique({ where: { id } });
  const oldStatus = oldRequest?.status;

  const data = {
    status: newStatus,
  };

  // อัปเดต timestamp ตาม status
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
    data,
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  if (oldStatus !== newStatus) {
    porterEventEmitter.emit('porterRequestStatusChanged', protoResponse);
  } else {
    porterEventEmitter.emit('porterRequestUpdated', protoResponse);
  }

  return protoResponse;
};

/**
 * อัปเดต Timestamps ของ Porter Request (pickup, delivery, return)
 */
export const updatePorterRequestTimestamps = async (id, timestampData) => {
  const { pickup_at, delivery_at, return_at } = timestampData;

  const data = {};

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
    data,
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  porterEventEmitter.emit('porterRequestUpdated', protoResponse);

  return protoResponse;
};

/**
 * ลบ Porter Request
 */
export const deletePorterRequest = async (id) => {
  const porterRequest = await prisma.porterRequest.findUnique({
    where: { id },
  });

  if (porterRequest) {
    const protoResponse = convertToProtoResponse(porterRequest);

    await prisma.porterRequest.delete({
      where: { id },
    });

    // Emit event สำหรับ real-time updates
    porterEventEmitter.emit('porterRequestDeleted', protoResponse);
  }
};

/**
 * Health Check - ทดสอบการเชื่อมต่อ database
 */
export const healthCheck = async () => {
  await prisma.$queryRaw`SELECT 1`;
  return {
    success: true,
    message: 'Porter service is healthy',
    timestamp: new Date().toISOString(),
  };
};

/**
 * Helper function: แปลง Prisma model เป็น proto response
 */
function convertToProtoResponse(porterRequest) {
  return {
    id: porterRequest.id,
    created_at: porterRequest.createdAt.toISOString(),
    updated_at: porterRequest.updatedAt.toISOString(),
    requester_department: porterRequest.requesterDepartment,
    requester_name: porterRequest.requesterName,
    requester_phone: porterRequest.requesterPhone,
    patient_name: porterRequest.patientName,
    patient_hn: porterRequest.patientHN,
    // แปลง patientCondition จาก array (JSON) เป็น string (join ด้วย ", ")
    // รองรับทั้ง array และ string (backward compatibility)
    patient_condition: (() => {
      if (!porterRequest.patientCondition) {
        return undefined;
      }
      if (Array.isArray(porterRequest.patientCondition)) {
        return porterRequest.patientCondition.length > 0
          ? porterRequest.patientCondition.join(", ")
          : undefined;
      }
      if (typeof porterRequest.patientCondition === 'string') {
        // Backward compatibility: ถ้ายังเป็น string อยู่ (จากข้อมูลเก่า)
        try {
          const parsed = JSON.parse(porterRequest.patientCondition);
          if (Array.isArray(parsed)) {
            return parsed.length > 0 ? parsed.join(", ") : undefined;
          }
          return porterRequest.patientCondition;
        } catch {
          return porterRequest.patientCondition;
        }
      }
      return undefined;
    })(),
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
    equipment: mapEquipmentToProto(porterRequest.equipment),
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
    return_at: porterRequest.returnAt?.toISOString() || undefined,
  };
}

// ========================================
// LOCATION SETTINGS SERVICE
// ========================================

/**
 * สร้าง Building ใหม่
 */
export const createBuilding = async (requestData) => {
  const { id, name, floor_count } = requestData;

  const createData = {
    name: name.trim(),
    floorCount: floor_count ?? null,
  };

  // ถ้ามี id ที่ระบุมา ให้ใช้ id นั้น (สำหรับ custom ID)
  if (id) {
    createData.id = id;
  }

  const building = await prisma.building.create({
    data: createData,
    include: {
      floors: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return convertBuildingToProto(building);
};

/**
 * ดึงข้อมูล Building โดย ID
 */
export const getBuildingById = async (id) => {
  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      floors: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!building) {
    return null;
  }

  return convertBuildingToProto(building);
};

/**
 * ดึงรายการ Building ทั้งหมด
 */
export const listBuildings = async (filters) => {
  const { page = 1, page_size = 100 } = filters;

  const skip = (page - 1) * page_size;

  const [buildings, total] = await Promise.all([
    prisma.building.findMany({
      skip,
      take: page_size,
      include: {
        floors: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.building.count(),
  ]);

  return {
    data: buildings.map((b) => convertBuildingToProto(b)),
    total,
    page,
    page_size,
  };
};

/**
 * อัปเดตข้อมูล Building
 */
export const updateBuilding = async (id, updateData) => {
  const data = {};

  if (updateData.name) {
    data.name = updateData.name.trim();
  }
  if (updateData.floor_count !== undefined) {
    data.floorCount = updateData.floor_count ?? null;
  }

  const building = await prisma.building.update({
    where: { id },
    data,
    include: {
      floors: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return convertBuildingToProto(building);
};

/**
 * ลบ Building
 */
export const deleteBuilding = async (id) => {
  await prisma.building.delete({
    where: { id },
  });
};

/**
 * สร้าง FloorDepartment ใหม่
 */
export const createFloorDepartment = async (requestData) => {
  const {
    id,
    name,
    building_id,
    floor_number,
    department_type,
    room_type,
    room_count,
    bed_count,
  } = requestData;

  const createData = {
    name: name.trim(),
    buildingId: building_id,
    floorNumber: floor_number ?? null,
    departmentType: department_type,
    roomType: room_type ?? null,
    roomCount: room_count ?? null,
    bedCount: bed_count ?? null,
  };

  // ถ้ามี id ที่ระบุมา ให้ใช้ id นั้น (สำหรับ custom ID)
  if (id) {
    createData.id = id;
  }

  const floorDepartment = await prisma.floorDepartment.create({
    data: createData,
    include: {
      building: true,
    },
  });

  return convertFloorDepartmentToProto(floorDepartment);
};

/**
 * ดึงข้อมูล FloorDepartment โดย ID
 */
export const getFloorDepartmentById = async (id) => {
  const floorDepartment = await prisma.floorDepartment.findUnique({
    where: { id },
    include: {
      building: true,
    },
  });

  if (!floorDepartment) {
    return null;
  }

  return convertFloorDepartmentToProto(floorDepartment);
};

/**
 * ดึงรายการ FloorDepartment พร้อม filters
 */
export const listFloorDepartments = async (filters) => {
  const {
    building_id,
    department_type,
    page = 1,
    page_size = 100,
  } = filters;

  const where = {};
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
      include: {
        building: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.floorDepartment.count({ where }),
  ]);

  return {
    data: floorDepartments.map((f) => convertFloorDepartmentToProto(f)),
    total,
    page,
    page_size,
  };
};

/**
 * อัปเดตข้อมูล FloorDepartment
 */
export const updateFloorDepartment = async (id, updateData) => {
  const data = {};

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
    data.roomCount = updateData.room_count ?? null;
  }
  if (updateData.bed_count !== undefined) {
    data.bedCount = updateData.bed_count ?? null;
  }

  const floorDepartment = await prisma.floorDepartment.update({
    where: { id },
    data,
    include: {
      building: true,
    },
  });

  return convertFloorDepartmentToProto(floorDepartment);
};

/**
 * ลบ FloorDepartment
 */
export const deleteFloorDepartment = async (id) => {
  await prisma.floorDepartment.delete({
    where: { id },
  });
};

/**
 * Helper function: แปลง Building Prisma model เป็น proto response
 */
function convertBuildingToProto(building) {
  return {
    id: building.id,
    name: building.name,
    floor_count: building.floorCount ?? undefined,
    created_at: building.createdAt.toISOString(),
    updated_at: building.updatedAt.toISOString(),
    floors: building.floors?.map((f) => convertFloorDepartmentToProto(f)) || [],
  };
}

/**
 * Helper function: แปลง FloorDepartment Prisma model เป็น proto response
 */
function convertFloorDepartmentToProto(floorDepartment) {
  return {
    id: floorDepartment.id,
    name: floorDepartment.name,
    building_id: floorDepartment.buildingId,
    floor_number: floorDepartment.floorNumber ?? undefined,
    department_type: floorDepartment.departmentType,
    room_type: floorDepartment.roomType || undefined,
    room_count: floorDepartment.roomCount ?? undefined,
    bed_count: floorDepartment.bedCount ?? undefined,
    created_at: floorDepartment.createdAt.toISOString(),
    updated_at: floorDepartment.updatedAt.toISOString(),
    rooms: [], // RoomBed model ถูกลบออกแล้ว ใช้ API แยกสำหรับดึงข้อมูลห้อง/เตียง
  };
}

// ========================================
// EMPLOYEE MANAGEMENT SERVICE
// ========================================

/**
 * สร้าง Employee ใหม่
 */
export const createEmployee = async (requestData) => {
  const {
    citizen_id,
    first_name,
    last_name,
    employment_type_id,
    position_id,
    status,
  } = requestData;

  const createData = {
    citizenId: citizen_id.trim(),
    firstName: first_name.trim(),
    lastName: last_name.trim(),
    employmentTypeId: employment_type_id,
    positionId: position_id,
    status: status ?? true,
  };

  const employee = await prisma.porterEmployee.create({
    data: createData,
    include: {
      employmentType: true,
      position: true,
    },
  });

  return convertEmployeeToProto(employee);
};

/**
 * ดึงข้อมูล Employee โดย ID
 */
export const getEmployeeById = async (id) => {
  const employee = await prisma.porterEmployee.findUnique({
    where: { id },
    include: {
      employmentType: true,
      position: true,
    },
  });

  if (!employee) {
    return null;
  }

  return convertEmployeeToProto(employee);
};

/**
 * ดึงรายการ Employee พร้อม filters และ pagination
 */
export const listEmployees = async (filters) => {
  const {
    employment_type_id,
    position_id,
    status,
    page = 1,
    page_size = 20,
  } = filters;

  // สร้าง filter object
  const where = {};
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
        position: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.porterEmployee.count({ where }),
  ]);

  return {
    data: employees.map((e) => convertEmployeeToProto(e)),
    total,
    page,
    page_size,
  };
};

/**
 * อัปเดตข้อมูล Employee
 */
export const updateEmployee = async (id, updateData) => {
  const data = {};

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
      position: true,
    },
  });

  return convertEmployeeToProto(employee);
};

/**
 * ลบ Employee
 */
export const deleteEmployee = async (id) => {
  await prisma.porterEmployee.delete({
    where: { id },
  });
};

/**
 * Helper function: แปลง Employee Prisma model เป็น proto response
 */
function convertEmployeeToProto(employee) {
  return {
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
    updated_at: employee.updatedAt.toISOString(),
  };
}

// ========================================
// EMPLOYMENT TYPE MANAGEMENT SERVICE
// ========================================

/**
 * สร้าง EmploymentType ใหม่
 */
export const createEmploymentType = async (requestData) => {
  const { name, status = true } = requestData;

  const employmentType = await prisma.employmentType.create({
    data: {
      name: name.trim(),
      status: status !== undefined ? status : true,
    },
  });

  return convertEmploymentTypeToProto(employmentType);
};

/**
 * ดึงข้อมูล EmploymentType โดย ID
 */
export const getEmploymentTypeById = async (id) => {
  const employmentType = await prisma.employmentType.findUnique({
    where: { id },
  });

  if (!employmentType) {
    return null;
  }

  return convertEmploymentTypeToProto(employmentType);
};

/**
 * ดึงรายการ EmploymentType ทั้งหมด
 */
export const listEmploymentTypes = async () => {
  const employmentTypes = await prisma.employmentType.findMany({
    orderBy: { name: 'asc' },
  });

  return {
    data: employmentTypes.map((et) => convertEmploymentTypeToProto(et)),
  };
};

/**
 * อัปเดตข้อมูล EmploymentType
 */
export const updateEmploymentType = async (id, updateData) => {
  const data = {};

  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const employmentType = await prisma.employmentType.update({
    where: { id },
    data,
  });

  return convertEmploymentTypeToProto(employmentType);
};

/**
 * ลบ EmploymentType
 */
export const deleteEmploymentType = async (id) => {
  await prisma.employmentType.delete({
    where: { id },
  });
};

/**
 * Helper function: แปลง EmploymentType Prisma model เป็น proto response
 */
function convertEmploymentTypeToProto(employmentType) {
  return {
    id: employmentType.id,
    name: employmentType.name,
    status: employmentType.status,
    created_at: employmentType.createdAt.toISOString(),
    updated_at: employmentType.updatedAt.toISOString(),
  };
}

// ========================================
// POSITION MANAGEMENT SERVICE
// ========================================

/**
 * สร้าง Position ใหม่
 */
export const createPosition = async (requestData) => {
  const { name, status = true } = requestData;

  const position = await prisma.position.create({
    data: {
      name: name.trim(),
      status: status !== undefined ? status : true,
    },
  });

  return convertPositionToProto(position);
};

/**
 * ดึงข้อมูล Position โดย ID
 */
export const getPositionById = async (id) => {
  const position = await prisma.position.findUnique({
    where: { id },
  });

  if (!position) {
    return null;
  }

  return convertPositionToProto(position);
};

/**
 * ดึงรายการ Position ทั้งหมด
 */
export const listPositions = async () => {
  const positions = await prisma.position.findMany({
    orderBy: { name: 'asc' },
  });

  return {
    data: positions.map((p) => convertPositionToProto(p)),
  };
};

/**
 * อัปเดตข้อมูล Position
 */
export const updatePosition = async (id, updateData) => {
  const data = {};

  if (updateData.name !== undefined) {
    data.name = updateData.name.trim();
  }
  if (updateData.status !== undefined) {
    data.status = updateData.status;
  }

  const position = await prisma.position.update({
    where: { id },
    data,
  });

  return convertPositionToProto(position);
};

/**
 * ลบ Position
 */
export const deletePosition = async (id) => {
  await prisma.position.delete({
    where: { id },
  });
};

/**
 * Helper function: แปลง Position Prisma model เป็น proto response
 */
function convertPositionToProto(position) {
  return {
    id: position.id,
    name: position.name,
    status: position.status,
    created_at: position.createdAt.toISOString(),
    updated_at: position.updatedAt.toISOString(),
  };
}

