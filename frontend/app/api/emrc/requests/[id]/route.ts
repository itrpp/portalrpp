import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { callEMRCService } from "@/lib/grpcClient";
import {
  mapBookingPurposeToProto,
  mapRequiredEquipmentToProto,
  mapInfectionStatusToProto,
  mapConditionTypeToProto,
  convertProtoToFrontend,
} from "@/lib/emrc";

/**
 * PUT /api/emrc/requests/[id]
 * อัปเดตข้อมูล EMRC Request
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

    // หน่วยงานผู้แจ้งควรถูกอัปเดตจากโปรไฟล์ผู้ใช้งาน (departmentSubSubId)
    const requesterDepartment = (session.user as any)?.departmentSubSubId;

    if (requesterDepartment !== null && requesterDepartment !== undefined) {
      protoRequest.requester_department = requesterDepartment;
    }
    if (requestData.requesterName !== undefined) {
      protoRequest.requester_name = requestData.requesterName;
    }
    if (requestData.requesterPhone !== undefined) {
      protoRequest.requester_phone = requestData.requesterPhone;
    }
    if (requestData.requestDate !== undefined) {
      protoRequest.request_date = requestData.requestDate;
    }
    if (requestData.requestTime !== undefined) {
      protoRequest.request_time = requestData.requestTime;
    }
    if (requestData.bookingPurpose !== undefined) {
      protoRequest.booking_purpose = mapBookingPurposeToProto(
        requestData.bookingPurpose,
      );
    }
    if (requestData.bookingPurposeOther !== undefined) {
      protoRequest.booking_purpose_other = requestData.bookingPurposeOther || null;
    }
    if (requestData.patientName !== undefined) {
      protoRequest.patient_name = requestData.patientName || null;
    }
    if (requestData.patientBirthDate !== undefined) {
      protoRequest.patient_birth_date = requestData.patientBirthDate || null;
    }
    if (requestData.destinationAddress !== undefined) {
      protoRequest.destination_address = requestData.destinationAddress || null;
    }
    if (requestData.patientRights !== undefined) {
      protoRequest.patient_rights = requestData.patientRights || null;
    }
    if (requestData.patientHN !== undefined) {
      protoRequest.patient_hn = requestData.patientHN || null;
    }
    if (requestData.patientCitizenId !== undefined) {
      protoRequest.patient_citizen_id = requestData.patientCitizenId || null;
    }
    if (requestData.patientPhone !== undefined) {
      protoRequest.patient_phone = requestData.patientPhone || null;
    }
    if (requestData.requiredEquipment !== undefined) {
      protoRequest.required_equipment = mapRequiredEquipmentToProto(
        requestData.requiredEquipment || [],
      );
    }
    if (requestData.infectionStatus !== undefined) {
      protoRequest.infection_status = mapInfectionStatusToProto(
        requestData.infectionStatus,
      );
    }
    if (requestData.infectionStatusOther !== undefined) {
      protoRequest.infection_status_other =
        requestData.infectionStatusOther || null;
    }
    if (requestData.departmentPhone !== undefined) {
      protoRequest.department_phone = requestData.departmentPhone || null;
    }
    if (requestData.requesterNameDetail !== undefined) {
      protoRequest.requester_name_detail =
        requestData.requesterNameDetail || null;
    }
    if (requestData.conditionType !== undefined) {
      protoRequest.condition_type = mapConditionTypeToProto(
        requestData.conditionType,
      );
    }
    if (requestData.acknowledged !== undefined) {
      protoRequest.acknowledged = requestData.acknowledged ?? false;
    }

    // เรียก gRPC service
    const response = await callEMRCService<any>(
      "UpdateAmbulanceRequest",
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
          error: "EMRC_SERVICE_UNAVAILABLE",
          message: "บริการจองรถพยาบาลไม่พร้อมใช้งานในขณะนี้",
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

    console.error("Error updating EMRC request:", error);

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

