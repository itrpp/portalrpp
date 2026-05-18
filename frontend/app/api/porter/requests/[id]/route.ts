import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import {
  mapUrgencyLevelToProto,
  mapVehicleTypeToProto,
  mapHasVehicleToProto,
  mapReturnTripToProto,
  mapEquipmentToProto,
  convertProtoToFrontend,
} from '@/lib/porter';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { UpdatePorterRequestSchema, formatZodError } from '@/lib/schemas/porterRequest';

/**
 * PUT /api/porter/requests/[id]
 * อัปเดตข้อมูล Porter Request
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    const body = await request.json();
    const parsed = UpdatePorterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;

    // หน่วยงานผู้แจ้งใช้จาก session profile เสมอ
    const requesterDepartment = (auth.session.user as { departmentSubSubId?: number })
      ?.departmentSubSubId;

    const protoRequest: Record<string, unknown> = { id };

    if (requesterDepartment !== undefined && requesterDepartment !== null) {
      protoRequest.requester_department = requesterDepartment;
    }
    if (data.requesterName !== undefined) protoRequest.requester_name = data.requesterName;
    if (data.requesterPhone !== undefined) protoRequest.requester_phone = data.requesterPhone;
    if (data.patientName !== undefined) protoRequest.patient_name = data.patientName;
    if (data.patientHN !== undefined) protoRequest.patient_hn = data.patientHN;
    if (data.patientCondition !== undefined) {
      protoRequest.patient_condition =
        data.patientCondition.length > 0 ? data.patientCondition.join(', ') : null;
    }

    if (data.pickupLocationDetail !== undefined && data.pickupLocationDetail !== null) {
      protoRequest.pickup_building_id = data.pickupLocationDetail.buildingId ?? null;
      protoRequest.pickup_floor_department_id = data.pickupLocationDetail.floorDepartmentId ?? '';
      protoRequest.pickup_room_bed_name = data.pickupLocationDetail.roomBedName ?? null;
    }
    if (data.deliveryLocationDetail !== undefined && data.deliveryLocationDetail !== null) {
      protoRequest.delivery_building_id = data.deliveryLocationDetail.buildingId ?? null;
      protoRequest.delivery_floor_department_id =
        data.deliveryLocationDetail.floorDepartmentId ?? '';
      protoRequest.delivery_room_bed_name = data.deliveryLocationDetail.roomBedName ?? null;
    }
    if (data.requestedDateTime !== undefined) {
      protoRequest.requested_date_time = data.requestedDateTime;
    }
    if (data.urgencyLevel !== undefined) {
      protoRequest.urgency_level = mapUrgencyLevelToProto(data.urgencyLevel);
    }
    if (data.vehicleType !== undefined) {
      protoRequest.vehicle_type = mapVehicleTypeToProto(data.vehicleType);
    }
    if (data.hasVehicle !== undefined) {
      protoRequest.has_vehicle = mapHasVehicleToProto(data.hasVehicle);
    }
    if (data.returnTrip !== undefined) {
      protoRequest.return_trip = mapReturnTripToProto(data.returnTrip);
    }
    if (data.transportReason !== undefined) {
      protoRequest.transport_reason = data.transportReason;
    }
    // ส่งชัดเจนเสมอเมื่อ client ระบุ — รวมกรณี [] เพื่อล้างใน DB
    if (Object.prototype.hasOwnProperty.call(body, 'equipment')) {
      protoRequest.equipment = mapEquipmentToProto(data.equipment ?? []);
    }
    if (data.equipmentOther !== undefined) {
      protoRequest.equipment_other = data.equipmentOther ?? '';
    }
    if (data.specialNotes !== undefined) {
      protoRequest.special_notes = data.specialNotes ?? '';
    }

    const response = await callPorterService<{
      success: boolean;
      data?: unknown;
      error_message?: string;
    }>('UpdatePorterRequest', protoRequest);

    if (response.success) {
      const frontendData = convertProtoToFrontend(response.data);

      return NextResponse.json({ success: true, data: frontendData }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: response.error_message || 'ไม่สามารถอัปเดตคำขอได้',
      },
      { status: 400 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'PUT /api/porter/requests/[id]' });
  }
}
