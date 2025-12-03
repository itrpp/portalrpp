import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";
import { prisma } from "@/lib/prisma";
import {
  mapStatusToProto,
  mapUrgencyLevelToProto,
  mapVehicleTypeToProto,
  mapHasVehicleToProto,
  mapReturnTripToProto,
  mapEquipmentToProto,
  convertProtoToFrontend,
} from "@/lib/porter";

/**
 * GET /api/porter/requests
 * ดึงรายการ Porter Requests
 */
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(
      authOptions as any,
    )) as import("@/types/ldap").ExtendedSession;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const {
      status,
      urgency_level,
      requester_user_id,
      assigned_to_id,
      page,
      page_size,
    } = Object.fromEntries(searchParams);

    // สร้าง request object สำหรับ gRPC
    const protoRequest: any = {};

    if (status !== undefined && status !== null) {
      protoRequest.status = mapStatusToProto(status);
    }
    if (urgency_level !== undefined && urgency_level !== null) {
      protoRequest.urgency_level = mapUrgencyLevelToProto(urgency_level);
    }
    if (requester_user_id) {
      protoRequest.requester_user_id = requester_user_id;
    }
    if (assigned_to_id) {
      protoRequest.assigned_to_id = assigned_to_id;
    }
    if (page) {
      protoRequest.page = parseInt(page, 10);
    }
    if (page_size) {
      protoRequest.page_size = parseInt(page_size, 10);
    }

    // เรียก gRPC service โดยตรง
    const response = await callPorterService<any>(
      "ListPorterRequests",
      protoRequest,
    );

    if (response.success) {
      let frontendData = (response.data || []).map((item: any) =>
        convertProtoToFrontend(item),
      );

      // ดึงข้อมูลชื่อผู้ยกเลิก (CancelledBy) จาก User table
      const cancelledUserIds = frontendData
        .filter(
          (item: any) => item.status === "cancelled" && item.cancelledById,
        )
        .map((item: any) => item.cancelledById)
        .filter((id: any, index: any, self: any) => self.indexOf(id) === index); // unique ids

      if (cancelledUserIds.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            id: { in: cancelledUserIds },
          },
          select: {
            id: true,
            displayName: true,
          },
        });

        const userMap = new Map(users.map((u) => [u.id, u.displayName]));

        frontendData = frontendData.map((item: any) => {
          if (item.status === "cancelled" && item.cancelledById) {
            return {
              ...item,
              cancelledByName: userMap.get(item.cancelledById) || undefined,
            };
          }

          return item;
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: frontendData,
          total: response.total || frontendData.length,
          page: response.page || 1,
          page_size: response.page_size || frontendData.length,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "FETCH_FAILED",
          message: response.error_message || "ไม่สามารถดึงข้อมูลได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    // จัดการ gRPC errors
    if (error.code === 14) {
      // UNAVAILABLE
      return NextResponse.json(
        {
          success: false,
          error: "PORTER_SERVICE_UNAVAILABLE",
          message: "บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้",
        },
        { status: 503 },
      );
    } else if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลที่ต้องการ",
        },
        { status: 404 },
      );
    } else if (error.code === 3) {
      // INVALID_ARGUMENT
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ARGUMENT",
          message: error.message || "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    // Log error for debugging (in production, use proper logging service)

    console.error("Error fetching porter requests:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
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
    const session = (await getServerSession(
      authOptions as any,
    )) as import("@/types/ldap").ExtendedSession;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // อ่านข้อมูลจาก request body
    const requestData = await request.json();

    // หน่วยงานผู้แจ้งควรถูกกำหนดจากโปรไฟล์ผู้ใช้งาน (legacy department string)
    const requesterDepartment =
      (session.user as any)?.department ??
      requestData.requesterDepartment ??
      "";

    // แปลงข้อมูลจาก Frontend format เป็น Proto format
    const protoRequest = {
      requester_department: requesterDepartment,
      requester_name: requestData.requesterName,
      requester_phone: requestData.requesterPhone,
      requester_user_id: session.user.id,

      patient_name: requestData.patientName,
      patient_hn: requestData.patientHN,
      patient_condition:
        Array.isArray(requestData.patientCondition) &&
        requestData.patientCondition.length > 0
          ? requestData.patientCondition.join(", ")
          : null,

      pickup_building_id: requestData.pickupLocationDetail?.buildingId || null,
      pickup_floor_department_id:
        requestData.pickupLocationDetail?.floorDepartmentId || "",
      pickup_room_bed_name:
        requestData.pickupLocationDetail?.roomBedName || null,

      delivery_building_id:
        requestData.deliveryLocationDetail?.buildingId || null,
      delivery_floor_department_id:
        requestData.deliveryLocationDetail?.floorDepartmentId || "",
      delivery_room_bed_name:
        requestData.deliveryLocationDetail?.roomBedName || null,

      requested_date_time: requestData.requestedDateTime,
      urgency_level: mapUrgencyLevelToProto(requestData.urgencyLevel),
      vehicle_type: mapVehicleTypeToProto(requestData.vehicleType),
      has_vehicle: mapHasVehicleToProto(requestData.hasVehicle),
      return_trip: mapReturnTripToProto(requestData.returnTrip),
      transport_reason: requestData.transportReason,
      equipment: mapEquipmentToProto(requestData.equipment || []),
      equipment_other: requestData.equipmentOther || null,
      special_notes: requestData.specialNotes || null,
    };

    console.info("protoRequest", protoRequest);

    // เรียก gRPC service โดยตรง
    const response = await callPorterService<any>(
      "CreatePorterRequest",
      protoRequest,
    );

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          data: response.data,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "CREATION_FAILED",
          message: response.error_message || "ไม่สามารถสร้างคำขอได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    // จัดการ gRPC errors
    if (error.code === 14) {
      // UNAVAILABLE
      return NextResponse.json(
        {
          success: false,
          error: "PORTER_SERVICE_UNAVAILABLE",
          message: "บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้",
        },
        { status: 503 },
      );
    } else if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลที่ต้องการ",
        },
        { status: 404 },
      );
    } else if (error.code === 3) {
      // INVALID_ARGUMENT
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ARGUMENT",
          message: error.message || "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    // Log error for debugging (in production, use proper logging service)

    console.error("Error creating porter request:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      },
      { status: 500 },
    );
  }
}
