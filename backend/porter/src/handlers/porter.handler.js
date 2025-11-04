import prisma from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * gRPC Handlers สำหรับ Porter Service
 * ใช้ asyncHandler pattern เพื่อจัดการ errors
 */

/**
 * สร้าง Porter Request ใหม่
 */
export const createPorterRequest = async (call, callback) => {
  try {
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
    } = call.request;

    // แปลง enum จาก proto เป็น Prisma enum
    const urgencyLevelMap = {
      0: 'NORMAL',
      1: 'RUSH',
      2: 'EMERGENCY',
    };

    const vehicleTypeMap = {
      0: 'SITTING',
      1: 'LYING',
      2: 'GOLF',
    };

    const hasVehicleMap = {
      0: 'YES',
      1: 'NO',
    };

    const returnTripMap = {
      0: 'ONE_WAY',
      1: 'ROUND_TRIP',
    };

    const equipmentMap = {
      0: 'OXYGEN',
      1: 'TUBE',
      2: 'IV_PUMP',
      3: 'VENTILATOR',
      4: 'MONITOR',
      5: 'SUCTION',
    };

    // สร้าง Porter Request
    const porterRequest = await prisma.porterRequest.create({
      data: {
        requesterDepartment: requester_department,
        requesterName: requester_name,
        requesterPhone: requester_phone,
        requesterUserId: requester_user_id || null,
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
        urgencyLevel: urgencyLevelMap[urgency_level],
        vehicleType: vehicleTypeMap[vehicle_type],
        hasVehicle: hasVehicleMap[has_vehicle],
        returnTrip: returnTripMap[return_trip],
        transportReason: transport_reason,
        equipment: JSON.stringify(equipment.map((eq) => equipmentMap[eq])),
        specialNotes: special_notes || null,
      },
    });

    // แปลงกลับเป็น proto response
    const response = convertToProtoResponse(porterRequest);

    callback(null, {
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error creating porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to create porter request',
    });
  }
};

/**
 * ดึงข้อมูล Porter Request โดย ID
 */
export const getPorterRequest = async (call, callback) => {
  try {
    const { id } = call.request;

    const porterRequest = await prisma.porterRequest.findUnique({
      where: { id },
    });

    if (!porterRequest) {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    const response = convertToProtoResponse(porterRequest);

    callback(null, {
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error getting porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to get porter request',
    });
  }
};

/**
 * ดึงรายการ Porter Request ทั้งหมด
 */
export const listPorterRequests = async (call, callback) => {
  try {
    const {
      status,
      urgency_level,
      requester_user_id,
      assigned_to_id,
      page = 1,
      page_size = 20,
    } = call.request;

    // สร้าง filter object
    const where = {};
    if (status !== undefined && status !== null) {
      const statusMap = { 0: 'WAITING', 1: 'IN_PROGRESS', 2: 'COMPLETED', 3: 'CANCELLED' };
      where.status = statusMap[status];
    }
    if (urgency_level !== undefined && urgency_level !== null) {
      const urgencyLevelMap = { 0: 'NORMAL', 1: 'RUSH', 2: 'EMERGENCY' };
      where.urgencyLevel = urgencyLevelMap[urgency_level];
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

    const data = porterRequests.map((pr) => convertToProtoResponse(pr));

    callback(null, {
      success: true,
      data,
      total,
      page,
      page_size,
    });
  } catch (error) {
    console.error('Error listing porter requests:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to list porter requests',
    });
  }
};

/**
 * อัปเดตข้อมูล Porter Request
 */
export const updatePorterRequest = async (call, callback) => {
  try {
    const { id, ...updateData } = call.request;

    // แปลง update data
    const data = {};
    if (updateData.requester_department) data.requesterDepartment = updateData.requester_department;
    if (updateData.requester_name) data.requesterName = updateData.requester_name;
    if (updateData.requester_phone) data.requesterPhone = updateData.requester_phone;
    if (updateData.patient_name) data.patientName = updateData.patient_name;
    if (updateData.patient_hn) data.patientHN = updateData.patient_hn;
    if (updateData.patient_condition !== undefined) data.patientCondition = updateData.patient_condition;
    if (updateData.requested_date_time) data.requestedDateTime = new Date(updateData.requested_date_time);
    if (updateData.special_notes !== undefined) data.specialNotes = updateData.special_notes;

    // แปลง enum
    if (updateData.urgency_level !== undefined && updateData.urgency_level !== null) {
      const urgencyLevelMap = { 0: 'NORMAL', 1: 'RUSH', 2: 'EMERGENCY' };
      data.urgencyLevel = urgencyLevelMap[updateData.urgency_level];
    }
    if (updateData.vehicle_type !== undefined && updateData.vehicle_type !== null) {
      const vehicleTypeMap = { 0: 'SITTING', 1: 'LYING', 2: 'GOLF' };
      data.vehicleType = vehicleTypeMap[updateData.vehicle_type];
    }
    if (updateData.has_vehicle !== undefined && updateData.has_vehicle !== null) {
      const hasVehicleMap = { 0: 'YES', 1: 'NO' };
      data.hasVehicle = hasVehicleMap[updateData.has_vehicle];
    }
    if (updateData.return_trip !== undefined && updateData.return_trip !== null) {
      const returnTripMap = { 0: 'ONE_WAY', 1: 'ROUND_TRIP' };
      data.returnTrip = returnTripMap[updateData.return_trip];
    }
    if (updateData.equipment && updateData.equipment.length > 0) {
      const equipmentMap = { 0: 'OXYGEN', 1: 'TUBE', 2: 'IV_PUMP', 3: 'VENTILATOR', 4: 'MONITOR', 5: 'SUCTION' };
      data.equipment = JSON.stringify(updateData.equipment.map((eq) => equipmentMap[eq]));
    }

    const porterRequest = await prisma.porterRequest.update({
      where: { id },
      data,
    });

    const response = convertToProtoResponse(porterRequest);

    callback(null, {
      success: true,
      data: response,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error updating porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update porter request',
    });
  }
};

/**
 * อัปเดตสถานะ Porter Request
 */
export const updatePorterRequestStatus = async (call, callback) => {
  try {
    const { id, status, assigned_to_id, assigned_to_name, cancelled_reason } = call.request;

    const statusMap = { 0: 'WAITING', 1: 'IN_PROGRESS', 2: 'COMPLETED', 3: 'CANCELLED' };
    const newStatus = statusMap[status];

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

    const response = convertToProtoResponse(porterRequest);

    callback(null, {
      success: true,
      data: response,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error updating porter request status:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to update porter request status',
    });
  }
};

/**
 * ลบ Porter Request
 */
export const deletePorterRequest = async (call, callback) => {
  try {
    const { id } = call.request;

    await prisma.porterRequest.delete({
      where: { id },
    });

    callback(null, {
      success: true,
      message: 'Porter request deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      callback({
        code: 5, // NOT_FOUND
        message: 'Porter request not found',
      });
      return;
    }

    console.error('Error deleting porter request:', error);
    callback({
      code: 13, // INTERNAL
      message: error.message || 'Failed to delete porter request',
    });
  }
};

/**
 * Health Check
 */
export const healthCheck = async (call, callback) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    callback(null, {
      success: true,
      message: 'Porter service is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    callback({
      code: 13, // INTERNAL
      message: 'Service is unhealthy',
    });
  }
};

/**
 * Helper function: แปลง Prisma model เป็น proto response
 */
function convertToProtoResponse(porterRequest) {
  // แปลง enum จาก Prisma เป็น proto enum
  const urgencyLevelReverseMap = {
    NORMAL: 0,
    RUSH: 1,
    EMERGENCY: 2,
  };

  const vehicleTypeReverseMap = {
    SITTING: 0,
    LYING: 1,
    GOLF: 2,
  };

  const hasVehicleReverseMap = {
    YES: 0,
    NO: 1,
  };

  const returnTripReverseMap = {
    ONE_WAY: 0,
    ROUND_TRIP: 1,
  };

  const statusReverseMap = {
    WAITING: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    CANCELLED: 3,
  };

  const equipmentReverseMap = {
    OXYGEN: 0,
    TUBE: 1,
    IV_PUMP: 2,
    VENTILATOR: 3,
    MONITOR: 4,
    SUCTION: 5,
  };

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
    urgency_level: urgencyLevelReverseMap[porterRequest.urgencyLevel],
    vehicle_type: vehicleTypeReverseMap[porterRequest.vehicleType],
    has_vehicle: hasVehicleReverseMap[porterRequest.hasVehicle],
    return_trip: returnTripReverseMap[porterRequest.returnTrip],
    transport_reason: porterRequest.transportReason,
    equipment: (() => {
      // Prisma เก็บ equipment เป็น JSON อาจเป็น string หรือ array
      let equipmentArray = porterRequest.equipment;
      if (typeof equipmentArray === 'string') {
        try {
          equipmentArray = JSON.parse(equipmentArray);
        } catch (e) {
          equipmentArray = [];
        }
      }
      if (!Array.isArray(equipmentArray)) {
        equipmentArray = [];
      }
      return equipmentArray.map((eq) => equipmentReverseMap[eq] ?? 0);
    })(),
    special_notes: porterRequest.specialNotes || undefined,
    status: statusReverseMap[porterRequest.status],
    assigned_to_id: porterRequest.assignedToId || undefined,
    assigned_to_name: porterRequest.assignedToName || undefined,
    accepted_at: porterRequest.acceptedAt?.toISOString() || undefined,
    completed_at: porterRequest.completedAt?.toISOString() || undefined,
    cancelled_at: porterRequest.cancelledAt?.toISOString() || undefined,
    cancelled_reason: porterRequest.cancelledReason || undefined,
  };
}
