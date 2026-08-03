import type { ListPorterRequestsParams } from '@/types/porter';

import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { listPorterRequestsWithEnrichment } from '@/lib/porterRequests';
import {
  mapUrgencyLevelToProto,
  mapVehicleTypeToProto,
  mapHasVehicleToProto,
  mapVehicleTypeGolfToProto,
  mapReturnTripToProto,
  mapEquipmentToProto,
} from '@/lib/porter';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { logger } from '@/lib/logger';
import {
  CreatePorterRequestSchema,
  ListPorterRequestsQuerySchema,
  formatZodError,
} from '@/lib/schemas/porterRequest';

// บังคับให้ route นี้เป็น dynamic เสมอ — กัน Next.js cache + edge cache ฝั่ง infra
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Headers สำหรับห้าม cache ทุกชั้น (browser / reverse proxy / CDN)
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/porter/requests
 * ดึงรายการ Porter Requests (auth + เรียก service + ส่ง response)
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const queryObject = Object.fromEntries(url.searchParams);
    const parsed = ListPorterRequestsQuerySchema.safeParse(queryObject);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const params: ListPorterRequestsParams = parsed.data;

    // ความปลอดภัย + ความถูกต้อง: ถ้า client ส่ง requester_user_id มา ให้บังคับเป็น session userId เสมอ
    // กันทั้ง (1) user แอบดึงรายการคนอื่นผ่าน URL และ (2) ปัญหา client/server userId ไม่ตรงกัน
    if (params.requester_user_id) {
      params.requester_user_id = auth.userId;
    }

    logger.info('GET /api/porter/requests', {
      user: auth.userId,
      requester_user_id: params.requester_user_id ?? '(all)',
    });

    const result = await listPorterRequestsWithEnrichment(params);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          data: result.data,
          total: result.total,
          page: result.page,
          page_size: result.page_size,
        },
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        message: result.message,
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleGrpcError(error, {
      context: 'GET /api/porter/requests',
      headers: NO_STORE_HEADERS,
    });
  }
}

/**
 * POST /api/porter/requests
 * สร้าง Porter Request ใหม่
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreatePorterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;
    const requesterDepartment =
      (auth.session.user as { departmentSubSubId?: number })?.departmentSubSubId ??
      data.requesterDepartment ??
      null;

    const protoRequest = {
      requester_department: requesterDepartment,
      requester_name: data.requesterName,
      requester_phone: data.requesterPhone,
      requester_user_id: auth.userId,
      patient_name: data.patientName,
      patient_hn: data.patientHN,
      patient_condition:
        data.patientCondition.length > 0 ? data.patientCondition.join(', ') : null,
      pickup_building_id: data.pickupLocationDetail?.buildingId ?? null,
      pickup_floor_department_id: data.pickupLocationDetail?.floorDepartmentId ?? '',
      pickup_room_bed_name: data.pickupLocationDetail?.roomBedName ?? null,
      delivery_building_id: data.deliveryLocationDetail?.buildingId ?? null,
      delivery_floor_department_id: data.deliveryLocationDetail?.floorDepartmentId ?? '',
      delivery_room_bed_name: data.deliveryLocationDetail?.roomBedName ?? null,
      requested_date_time: data.requestedDateTime,
      urgency_level: mapUrgencyLevelToProto(data.urgencyLevel),
      vehicle_type: mapVehicleTypeToProto(data.vehicleType),
      has_vehicle: mapHasVehicleToProto(data.hasVehicle),
      vehicle_type_golf: mapVehicleTypeGolfToProto(data.vehicleTypeGolf ?? 'ไม่ต้องการ'),
      return_trip: mapReturnTripToProto(data.returnTrip),
      transport_reason: data.transportReason,
      equipment: mapEquipmentToProto(data.equipment),
      equipment_other: data.equipmentOther ?? null,
      special_notes: data.specialNotes ?? null,
    };

    const response = await callPorterService<{
      success: boolean;
      data?: unknown;
      error_message?: string;
    }>('CreatePorterRequest', protoRequest);

    if (response.success) {
      return NextResponse.json({ success: true, data: response.data }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'CREATION_FAILED',
        message: response.error_message ?? 'ไม่สามารถสร้างคำขอได้',
      },
      { status: 400 },
    );
  } catch (error) {
    return handleGrpcError(error, { context: 'POST /api/porter/requests' });
  }
}
