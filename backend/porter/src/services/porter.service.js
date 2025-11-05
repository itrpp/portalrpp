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
    requester_user_id,
    patient_name,
    patient_hn,
    patient_condition,
    pickup_location,
    pickup_building_id,
    pickup_building_name,
    pickup_floor_department_id,
    pickup_floor_department_name,
    pickup_room_bed_id,
    pickup_room_bed_name,
    delivery_location,
    delivery_building_id,
    delivery_building_name,
    delivery_floor_department_id,
    delivery_floor_department_name,
    delivery_room_bed_id,
    delivery_room_bed_name,
    requested_date_time,
    urgency_level,
    vehicle_type,
    has_vehicle,
    return_trip,
    transport_reason,
    equipment,
    special_notes,
  } = requestData;

  // ตรวจสอบว่า requester_user_id มีอยู่ใน User table หรือไม่
  // ถ้าไม่มี ให้ใช้ null เพื่อหลีกเลี่ยง foreign key constraint error
  let validRequesterUserId = null;
  if (requester_user_id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: requester_user_id },
        select: { id: true },
      });

      if (user) {
        validRequesterUserId = requester_user_id;
      }
    } catch (error) {
      // ถ้าเกิด error ในการค้นหา user ให้ใช้ null
      // (เช่น User table ไม่มี หรือ database connection error)
      console.warn('Warning: Could not verify requester_user_id:', error.message);
    }
  }

  const porterRequest = await prisma.porterRequest.create({
    data: {
      requesterDepartment: requester_department,
      requesterName: requester_name,
      requesterPhone: requester_phone,
      requesterUserId: validRequesterUserId,
      patientName: patient_name,
      patientHN: patient_hn,
      patientCondition: patient_condition || null,
      pickupLocation: pickup_location,
      pickupBuildingId: pickup_building_id,
      pickupBuildingName: pickup_building_name,
      pickupFloorDepartmentId: pickup_floor_department_id,
      pickupFloorDepartmentName: pickup_floor_department_name,
      pickupRoomBedId: pickup_room_bed_id || null,
      pickupRoomBedName: pickup_room_bed_name || null,
      deliveryLocation: delivery_location,
      deliveryBuildingId: delivery_building_id,
      deliveryBuildingName: delivery_building_name,
      deliveryFloorDepartmentId: delivery_floor_department_id,
      deliveryFloorDepartmentName: delivery_floor_department_name,
      deliveryRoomBedId: delivery_room_bed_id || null,
      deliveryRoomBedName: delivery_room_bed_name || null,
      requestedDateTime: new Date(requested_date_time),
      urgencyLevel: mapUrgencyLevelToPrisma(urgency_level),
      vehicleType: mapVehicleTypeToPrisma(vehicle_type),
      hasVehicle: mapHasVehicleToPrisma(has_vehicle),
      returnTrip: mapReturnTripToPrisma(return_trip),
      transportReason: transport_reason,
      equipment: JSON.stringify(mapEquipmentToPrisma(equipment)),
      specialNotes: special_notes || null,
    },
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  console.log('[Porter Service] Emitting porterRequestCreated event:', {
    requestId: protoResponse.id,
    status: protoResponse.status,
    statusType: typeof protoResponse.status,
    urgencyLevel: protoResponse.urgency_level,
    listenersCount: porterEventEmitter.listenerCount('porterRequestCreated'),
  });
  
  // ตรวจสอบว่ามี listeners หรือไม่
  if (porterEventEmitter.listenerCount('porterRequestCreated') === 0) {
    console.warn('[Porter Service] WARNING: No listeners for porterRequestCreated event! Stream may not be connected.');
  }
  
  porterEventEmitter.emit('porterRequestCreated', protoResponse);
  console.log('[Porter Service] Event porterRequestCreated emitted successfully');

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
    requester_user_id,
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
  if (requester_user_id) {
    where.requesterUserId = requester_user_id;
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
    data.patientCondition = updateData.patient_condition;
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
  const { status, assigned_to_id, assigned_to_name, cancelled_reason } = statusData;

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
  if (assigned_to_name) {
    data.assignedToName = assigned_to_name;
  }

  const porterRequest = await prisma.porterRequest.update({
    where: { id },
    data,
  });

  const protoResponse = convertToProtoResponse(porterRequest);

  // Emit event สำหรับ real-time updates
  if (oldStatus !== newStatus) {
    console.log('[Porter Service] Emitting porterRequestStatusChanged event:', protoResponse.id, 'from', oldStatus, 'to', newStatus);
    porterEventEmitter.emit('porterRequestStatusChanged', protoResponse);
  } else {
    console.log('[Porter Service] Emitting porterRequestUpdated event:', protoResponse.id);
    porterEventEmitter.emit('porterRequestUpdated', protoResponse);
  }

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
    requester_user_id: porterRequest.requesterUserId || undefined,
    patient_name: porterRequest.patientName,
    patient_hn: porterRequest.patientHN,
    patient_condition: porterRequest.patientCondition || undefined,
    pickup_location: porterRequest.pickupLocation,
    pickup_building_id: porterRequest.pickupBuildingId,
    pickup_building_name: porterRequest.pickupBuildingName,
    pickup_floor_department_id: porterRequest.pickupFloorDepartmentId,
    pickup_floor_department_name: porterRequest.pickupFloorDepartmentName,
    pickup_room_bed_id: porterRequest.pickupRoomBedId || undefined,
    pickup_room_bed_name: porterRequest.pickupRoomBedName || undefined,
    delivery_location: porterRequest.deliveryLocation,
    delivery_building_id: porterRequest.deliveryBuildingId,
    delivery_building_name: porterRequest.deliveryBuildingName,
    delivery_floor_department_id: porterRequest.deliveryFloorDepartmentId,
    delivery_floor_department_name: porterRequest.deliveryFloorDepartmentName,
    delivery_room_bed_id: porterRequest.deliveryRoomBedId || undefined,
    delivery_room_bed_name: porterRequest.deliveryRoomBedName || undefined,
    requested_date_time: porterRequest.requestedDateTime.toISOString(),
    urgency_level: mapUrgencyLevelToProto(porterRequest.urgencyLevel),
    vehicle_type: mapVehicleTypeToProto(porterRequest.vehicleType),
    has_vehicle: mapHasVehicleToProto(porterRequest.hasVehicle),
    return_trip: mapReturnTripToProto(porterRequest.returnTrip),
    transport_reason: porterRequest.transportReason,
    equipment: mapEquipmentToProto(porterRequest.equipment),
    special_notes: porterRequest.specialNotes || undefined,
    status: mapStatusToProto(porterRequest.status),
    assigned_to_id: porterRequest.assignedToId || undefined,
    assigned_to_name: porterRequest.assignedToName || undefined,
    accepted_at: porterRequest.acceptedAt?.toISOString() || undefined,
    completed_at: porterRequest.completedAt?.toISOString() || undefined,
    cancelled_at: porterRequest.cancelledAt?.toISOString() || undefined,
    cancelled_reason: porterRequest.cancelledReason || undefined,
  };
}

