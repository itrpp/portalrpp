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
  convertProtoToFrontend,
} from "@/lib/porter";

/**
 * PUT /api/porter/requests/[id]
 * อัปเดตข้อมูล Porter Request
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;

    // อ่านข้อมูลจาก request body
    const requestData = await request.json();

    // แปลงข้อมูลจาก Frontend format เป็น Proto format
    const protoRequest: any = {
      id,
    };

    if (requestData.requesterDepartment !== undefined) {
      protoRequest.requester_department = requestData.requesterDepartment;
    }
    if (requestData.requesterName !== undefined) {
      protoRequest.requester_name = requestData.requesterName;
    }
    if (requestData.requesterPhone !== undefined) {
      protoRequest.requester_phone = requestData.requesterPhone;
    }
    if (requestData.patientName !== undefined) {
      protoRequest.patient_name = requestData.patientName;
    }
    if (requestData.patientHN !== undefined) {
      protoRequest.patient_hn = requestData.patientHN;
    }
    if (requestData.patientCondition !== undefined) {
      protoRequest.patient_condition =
        Array.isArray(requestData.patientCondition) &&
        requestData.patientCondition.length > 0
          ? requestData.patientCondition.join(", ")
          : null;
    }
    if (requestData.pickupLocation !== undefined) {
      protoRequest.pickup_location = requestData.pickupLocation;
    }
    if (requestData.pickupLocationDetail?.buildingId !== undefined) {
      protoRequest.pickup_building_id =
        requestData.pickupLocationDetail?.buildingId || null;
    }
    if (requestData.pickupLocationDetail?.floorDepartmentId !== undefined) {
      protoRequest.pickup_floor_department_id =
        requestData.pickupLocationDetail?.floorDepartmentId || null;
    }
    if (requestData.pickupLocationDetail?.roomBedName !== undefined) {
      protoRequest.pickup_room_bed_name =
        requestData.pickupLocationDetail?.roomBedName || null;
    }
    if (requestData.deliveryLocation !== undefined) {
      protoRequest.delivery_location = requestData.deliveryLocation;
    }
    if (requestData.deliveryLocationDetail?.buildingId !== undefined) {
      protoRequest.delivery_building_id =
        requestData.deliveryLocationDetail?.buildingId || null;
    }
    if (requestData.deliveryLocationDetail?.floorDepartmentId !== undefined) {
      protoRequest.delivery_floor_department_id =
        requestData.deliveryLocationDetail?.floorDepartmentId || null;
    }
    if (requestData.deliveryLocationDetail?.roomBedName !== undefined) {
      protoRequest.delivery_room_bed_name =
        requestData.deliveryLocationDetail?.roomBedName || null;
    }
    if (requestData.requestedDateTime !== undefined) {
      protoRequest.requested_date_time = requestData.requestedDateTime;
    }
    if (requestData.urgencyLevel !== undefined) {
      protoRequest.urgency_level = mapUrgencyLevelToProto(
        requestData.urgencyLevel,
      );
    }
    if (requestData.vehicleType !== undefined) {
      protoRequest.vehicle_type = mapVehicleTypeToProto(
        requestData.vehicleType,
      );
    }
    if (requestData.hasVehicle !== undefined) {
      protoRequest.has_vehicle = mapHasVehicleToProto(requestData.hasVehicle);
    }
    if (requestData.returnTrip !== undefined) {
      protoRequest.return_trip = mapReturnTripToProto(requestData.returnTrip);
    }
    if (requestData.transportReason !== undefined) {
      protoRequest.transport_reason = requestData.transportReason;
    }
    if (requestData.equipment !== undefined) {
      protoRequest.equipment = mapEquipmentToProto(requestData.equipment || []);
    }
    if (requestData.equipmentOther !== undefined) {
      protoRequest.equipment_other = requestData.equipmentOther || null;
    }
    if (requestData.specialNotes !== undefined) {
      protoRequest.special_notes = requestData.specialNotes || null;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdatePorterRequest",
      protoRequest,
    );

    if (response.success) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = convertProtoToFrontend(response.data);

      return NextResponse.json(
        {
          success: true,
          data: frontendData,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "UPDATE_FAILED",
          message: response.error_message || "ไม่สามารถอัปเดตคำขอได้",
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

    console.error("Error updating porter request:", error);

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
