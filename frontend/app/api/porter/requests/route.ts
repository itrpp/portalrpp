import type { ListPorterRequestsParams } from "@/types/porter";

import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { callPorterService } from "@/lib/grpcClient";
import { listPorterRequestsWithEnrichment } from "@/lib/porterRequests";
import {
  mapUrgencyLevelToProto,
  mapVehicleTypeToProto,
  mapHasVehicleToProto,
  mapReturnTripToProto,
  mapEquipmentToProto,
} from "@/lib/porter";

/**
 * GET /api/porter/requests
 * ดึงรายการ Porter Requests (auth + เรียก service + ส่ง response)
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const params: ListPorterRequestsParams = Object.fromEntries(searchParams);

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
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        message: result.message,
      },
      { status: 400 },
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    if (err.code === 14) {
      return NextResponse.json(
        {
          success: false,
          error: "PORTER_SERVICE_UNAVAILABLE",
          message: "บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้",
        },
        { status: 503 },
      );
    }
    if (err.code === 5) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: err.message ?? "ไม่พบข้อมูลที่ต้องการ",
        },
        { status: 404 },
      );
    }
    if (err.code === 3) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ARGUMENT",
          message: err.message ?? "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: err.message ?? "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      },
      { status: 500 },
    );
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

    const requestData = (await request.json()) as Record<string, unknown>;
    const requesterDepartment =
      (auth.session.user as { departmentSubSubId?: number })
        ?.departmentSubSubId ??
      (requestData.requesterDepartment as number | undefined) ??
      null;

    const protoRequest = {
      requester_department: requesterDepartment,
      requester_name: requestData.requesterName,
      requester_phone: requestData.requesterPhone,
      requester_user_id: auth.userId,
      patient_name: requestData.patientName,
      patient_hn: requestData.patientHN,
      patient_condition:
        Array.isArray(requestData.patientCondition) &&
        (requestData.patientCondition as unknown[]).length > 0
          ? (requestData.patientCondition as string[]).join(", ")
          : null,
      pickup_building_id:
        (requestData.pickupLocationDetail as { buildingId?: string })
          ?.buildingId ?? null,
      pickup_floor_department_id:
        (requestData.pickupLocationDetail as { floorDepartmentId?: string })
          ?.floorDepartmentId ?? "",
      pickup_room_bed_name:
        (requestData.pickupLocationDetail as { roomBedName?: string })
          ?.roomBedName ?? null,
      delivery_building_id:
        (requestData.deliveryLocationDetail as { buildingId?: string })
          ?.buildingId ?? null,
      delivery_floor_department_id:
        (requestData.deliveryLocationDetail as { floorDepartmentId?: string })
          ?.floorDepartmentId ?? "",
      delivery_room_bed_name:
        (requestData.deliveryLocationDetail as { roomBedName?: string })
          ?.roomBedName ?? null,
      requested_date_time: requestData.requestedDateTime,
      urgency_level: mapUrgencyLevelToProto(
        String(requestData.urgencyLevel ?? ""),
      ),
      vehicle_type: mapVehicleTypeToProto(
        String(requestData.vehicleType ?? ""),
      ),
      has_vehicle: mapHasVehicleToProto(String(requestData.hasVehicle ?? "")),
      return_trip: mapReturnTripToProto(String(requestData.returnTrip ?? "")),
      transport_reason: requestData.transportReason,
      equipment: mapEquipmentToProto((requestData.equipment as string[]) ?? []),
      equipment_other: (requestData.equipmentOther as string) ?? null,
      special_notes: (requestData.specialNotes as string) ?? null,
    };

    const response = await callPorterService<{
      success: boolean;
      data?: unknown;
      error_message?: string;
    }>("CreatePorterRequest", protoRequest);

    if (response.success) {
      return NextResponse.json(
        { success: true, data: response.data },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "CREATION_FAILED",
        message: response.error_message ?? "ไม่สามารถสร้างคำขอได้",
      },
      { status: 400 },
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    if (err.code === 14) {
      return NextResponse.json(
        {
          success: false,
          error: "PORTER_SERVICE_UNAVAILABLE",
          message: "บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้",
        },
        { status: 503 },
      );
    }
    if (err.code === 5) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: err.message ?? "ไม่พบข้อมูลที่ต้องการ",
        },
        { status: 404 },
      );
    }
    if (err.code === 3) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ARGUMENT",
          message: err.message ?? "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: err.message ?? "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      },
      { status: 500 },
    );
  }
}
