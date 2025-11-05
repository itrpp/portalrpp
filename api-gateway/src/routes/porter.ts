import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { callPorterService } from '../utils/grpcClient';
import { config } from '../config/env';

export const porterRouter = Router();

/**
 * Middleware สำหรับตรวจสอบว่า Porter Service ถูก config หรือไม่
 */
const requirePorterService = (req: Request, res: Response, next: any) => {
  if (!config.services.porter?.grpcUrl) {
    return res.status(503).json({
      success: false,
      error: 'PORTER_SERVICE_UNAVAILABLE',
      message: 'Porter Service is not configured'
    });
  }
  next();
};

/**
 * สร้าง Porter Request ใหม่
 * POST /api-gateway/porter/request
 */
porterRouter.post(
  '/request',
  authMiddleware,
  requirePorterService,
  async (req: Request, res: Response) => {
    try {
      const requestData = req.body;

      // แปลงข้อมูลจาก Frontend format เป็น Proto format
      const protoRequest = {
        requester_department: requestData.requesterDepartment,
        requester_name: requestData.requesterName,
        requester_phone: requestData.requesterPhone,
        requester_user_id: requestData.requesterUserId || undefined,

        patient_name: requestData.patientName,
        patient_hn: requestData.patientHN,
        patient_condition: requestData.patientCondition || undefined,

        pickup_location: requestData.pickupLocation,
        pickup_building_id: requestData.pickupLocationDetail?.buildingId,
        pickup_building_name: requestData.pickupLocationDetail?.buildingName,
        pickup_floor_department_id: requestData.pickupLocationDetail?.floorDepartmentId,
        pickup_floor_department_name: requestData.pickupLocationDetail?.floorDepartmentName,
        pickup_room_bed_id: requestData.pickupLocationDetail?.roomBedId || undefined,
        pickup_room_bed_name: requestData.pickupLocationDetail?.roomBedName || undefined,

        delivery_location: requestData.deliveryLocation,
        delivery_building_id: requestData.deliveryLocationDetail?.buildingId,
        delivery_building_name: requestData.deliveryLocationDetail?.buildingName,
        delivery_floor_department_id: requestData.deliveryLocationDetail?.floorDepartmentId,
        delivery_floor_department_name: requestData.deliveryLocationDetail?.floorDepartmentName,
        delivery_room_bed_id: requestData.deliveryLocationDetail?.roomBedId || undefined,
        delivery_room_bed_name: requestData.deliveryLocationDetail?.roomBedName || undefined,

        requested_date_time: requestData.requestedDateTime,
        urgency_level: mapUrgencyLevelToProto(requestData.urgencyLevel),
        vehicle_type: mapVehicleTypeToProto(requestData.vehicleType),
        has_vehicle: mapHasVehicleToProto(requestData.hasVehicle),
        return_trip: mapReturnTripToProto(requestData.returnTrip),
        transport_reason: requestData.transportReason,
        equipment: mapEquipmentToProto(requestData.equipment || []),
        special_notes: requestData.specialNotes || undefined,
      };

      const response = await callPorterService<any>('CreatePorterRequest', protoRequest);

      if (response.success) {
        res.json({
          success: true,
          data: response.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'CREATION_FAILED',
          message: response.error_message || 'Failed to create porter request'
        });
      }
    } catch (error: any) {
      console.error('Error creating porter request:', error);

      // Handle gRPC errors
      if (error.code === 14) { // UNAVAILABLE
        res.status(503).json({
          success: false,
          error: 'PORTER_SERVICE_UNAVAILABLE',
          message: 'Porter Service is unavailable'
        });
      } else if (error.code === 5) { // NOT_FOUND
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: error.message || 'Resource not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error'
        });
      }
    }
  }
);

/**
 * ดึงรายการ Porter Request
 * GET /api-gateway/porter/requests
 */
porterRouter.get(
  '/requests',
  authMiddleware,
  requirePorterService,
  async (req: Request, res: Response) => {
    try {
      const {
        status,
        urgency_level,
        requester_user_id,
        assigned_to_id,
        page,
        page_size,
      } = req.query;

      // สร้าง request object สำหรับ gRPC
      const protoRequest: any = {};

      if (status !== undefined && status !== null) {
        // แปลง status จาก Frontend (waiting, in-progress, completed, cancelled) เป็น Proto enum
        protoRequest.status = mapStatusToProto(status as string);
      }
      if (urgency_level !== undefined && urgency_level !== null) {
        protoRequest.urgency_level = mapUrgencyLevelToProto(urgency_level as string);
      }
      if (requester_user_id) {
        protoRequest.requester_user_id = requester_user_id as string;
      }
      if (assigned_to_id) {
        protoRequest.assigned_to_id = assigned_to_id as string;
      }
      if (page) {
        protoRequest.page = parseInt(page as string, 10);
      }
      if (page_size) {
        protoRequest.page_size = parseInt(page_size as string, 10);
      }

      const response = await callPorterService<any>('ListPorterRequests', protoRequest);

      if (response.success) {
        // แปลงข้อมูลจาก Proto format เป็น Frontend format
        const data = (response.data || []).map((item: any) =>
          convertProtoToFrontend(item)
        );

        res.json({
          success: true,
          data,
          total: response.total || data.length,
          page: response.page || 1,
          page_size: response.page_size || 20,
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'FETCH_FAILED',
          message: response.error_message || 'Failed to fetch porter requests',
        });
      }
    } catch (error: any) {
      console.error('Error listing porter requests:', error);

      // Handle gRPC errors
      if (error.code === 14) {
        // UNAVAILABLE
        res.status(503).json({
          success: false,
          error: 'PORTER_SERVICE_UNAVAILABLE',
          message: 'Porter Service is unavailable',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        });
      }
    }
  }
);

/**
 * แปลง Status จาก Frontend (waiting, in-progress, completed, cancelled) เป็น Proto enum
 */
function mapStatusToProto(status: string): number {
  const map: Record<string, number> = {
    waiting: 0,
    'in-progress': 1,
    completed: 2,
    cancelled: 3,
  };
  return map[status] ?? 0;
}

/**
 * แปลงข้อมูลจาก Proto format เป็น Frontend format
 */
function convertProtoToFrontend(protoData: any) {
  return {
    id: protoData.id,
    status: mapStatusFromProto(protoData.status),
    form: {
      requesterDepartment: protoData.requester_department,
      requesterName: protoData.requester_name,
      requesterPhone: protoData.requester_phone,
      patientName: protoData.patient_name,
      patientHN: protoData.patient_hn,
      pickupLocation: protoData.pickup_location,
      pickupLocationDetail: protoData.pickup_building_id
        ? {
            buildingId: protoData.pickup_building_id,
            buildingName: protoData.pickup_building_name,
            floorDepartmentId: protoData.pickup_floor_department_id,
            floorDepartmentName: protoData.pickup_floor_department_name,
            roomBedId: protoData.pickup_room_bed_id || undefined,
            roomBedName: protoData.pickup_room_bed_name || undefined,
          }
        : null,
      deliveryLocation: protoData.delivery_location,
      deliveryLocationDetail: protoData.delivery_building_id
        ? {
            buildingId: protoData.delivery_building_id,
            buildingName: protoData.delivery_building_name,
            floorDepartmentId: protoData.delivery_floor_department_id,
            floorDepartmentName: protoData.delivery_floor_department_name,
            roomBedId: protoData.delivery_room_bed_id || undefined,
            roomBedName: protoData.delivery_room_bed_name || undefined,
          }
        : null,
      requestedDateTime: protoData.requested_date_time,
      urgencyLevel: mapUrgencyLevelFromProto(protoData.urgency_level),
      vehicleType: mapVehicleTypeFromProto(protoData.vehicle_type),
      hasVehicle: mapHasVehicleFromProto(protoData.has_vehicle),
      returnTrip: mapReturnTripFromProto(protoData.return_trip),
      transportReason: protoData.transport_reason,
      equipment: mapEquipmentFromProto(protoData.equipment || []),
      specialNotes: protoData.special_notes || '',
      patientCondition: protoData.patient_condition || '',
      assignedToName: protoData.assigned_to_name || undefined,
    },
    assignedTo: protoData.assigned_to_id || undefined,
    assignedToName: protoData.assigned_to_name || undefined,
  };
}

/**
 * แปลง Status จาก Proto enum เป็น Frontend format
 */
function mapStatusFromProto(status: number): string {
  const map: Record<number, string> = {
    0: 'waiting',
    1: 'in-progress',
    2: 'completed',
    3: 'cancelled',
  };
  return map[status] ?? 'waiting';
}

/**
 * แปลง Urgency Level จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapUrgencyLevelFromProto(level: number): string {
  const map: Record<number, string> = {
    0: 'ปกติ',
    1: 'ด่วน',
    2: 'ฉุกเฉิน',
  };
  return map[level] ?? 'ปกติ';
}

/**
 * แปลง Vehicle Type จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapVehicleTypeFromProto(type: number): string {
  const map: Record<number, string> = {
    0: 'รถนั่ง',
    1: 'รถนอน',
    2: 'รถกอล์ฟ',
  };
  return map[type] ?? 'รถนั่ง';
}

/**
 * แปลง Has Vehicle จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapHasVehicleFromProto(hasVehicle: number): string {
  const map: Record<number, string> = {
    0: 'มี',
    1: 'ไม่มี',
  };
  return map[hasVehicle] ?? 'ไม่มี';
}

/**
 * แปลง Return Trip จาก Proto enum เป็น Frontend (ภาษาไทย)
 */
function mapReturnTripFromProto(returnTrip: number): string {
  const map: Record<number, string> = {
    0: 'ไปส่งอย่างเดียว',
    1: 'รับกลับด้วย',
  };
  return map[returnTrip] ?? 'ไปส่งอย่างเดียว';
}

/**
 * แปลง Equipment array จาก Proto enum array เป็น Frontend format
 */
function mapEquipmentFromProto(equipment: number[]): string[] {
  const map: Record<number, string> = {
    0: 'Oxygen',
    1: 'Tube',
    2: 'IV Pump',
    3: 'Ventilator',
    4: 'Monitor',
    5: 'Suction',
  };
  return equipment.map((eq) => map[eq] ?? 'Oxygen').filter(Boolean);
}

/**
 * แปลง Urgency Level จาก Frontend (ภาษาไทย) เป็น Proto enum
 */
function mapUrgencyLevelToProto(level: string): number {
  const map: Record<string, number> = {
    'ปกติ': 0,
    'ด่วน': 1,
    'ฉุกเฉิน': 2,
  };
  return map[level] ?? 0;
}

/**
 * แปลง Vehicle Type จาก Frontend (ภาษาไทย) เป็น Proto enum
 */
function mapVehicleTypeToProto(type: string): number {
  const map: Record<string, number> = {
    'รถนั่ง': 0,
    'รถนอน': 1,
    'รถกอล์ฟ': 2,
  };
  return map[type] ?? 0;
}

/**
 * แปลง Has Vehicle จาก Frontend (ภาษาไทย) เป็น Proto enum
 */
function mapHasVehicleToProto(hasVehicle: string): number {
  const map: Record<string, number> = {
    'มี': 0,
    'ไม่มี': 1,
  };
  return map[hasVehicle] ?? 1;
}

/**
 * แปลง Return Trip จาก Frontend (ภาษาไทย) เป็น Proto enum
 */
function mapReturnTripToProto(returnTrip: string): number {
  const map: Record<string, number> = {
    'ไปส่งอย่างเดียว': 0,
    'รับกลับด้วย': 1,
  };
  return map[returnTrip] ?? 0;
}

/**
 * แปลง Equipment array จาก Frontend เป็น Proto enum array
 */
function mapEquipmentToProto(equipment: string[]): number[] {
  const map: Record<string, number> = {
    'Oxygen': 0,
    'Tube': 1,
    'IV Pump': 2,
    'Ventilator': 3,
    'Monitor': 4,
    'Suction': 5,
  };
  return equipment.map((eq) => map[eq] ?? 0).filter((val) => val !== undefined);
}

