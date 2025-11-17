import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";
import {
  mapUrgencyLevelToProto,
  mapVehicleTypeToProto,
  mapHasVehicleToProto,
  mapReturnTripToProto,
  mapEquipmentToProto,
} from "@/lib/porter";

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

    // แปลงข้อมูลจาก Frontend format เป็น Proto format
    const protoRequest = {
      requester_department: requestData.requesterDepartment,
      requester_name: requestData.requesterName,
      requester_phone: requestData.requesterPhone,

      patient_name: requestData.patientName,
      patient_hn: requestData.patientHN,
      patient_condition:
        Array.isArray(requestData.patientCondition) &&
        requestData.patientCondition.length > 0
          ? requestData.patientCondition.join(", ")
          : null,

      pickup_location: requestData.pickupLocation,
      pickup_building_id: requestData.pickupLocationDetail?.buildingId || null,
      pickup_floor_department_id:
        requestData.pickupLocationDetail?.floorDepartmentId || null,
      pickup_room_bed_name:
        requestData.pickupLocationDetail?.roomBedName || null,

      delivery_location: requestData.deliveryLocation,
      delivery_building_id:
        requestData.deliveryLocationDetail?.buildingId || null,
      delivery_floor_department_id:
        requestData.deliveryLocationDetail?.floorDepartmentId || null,
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
