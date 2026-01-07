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
 * GET /api/emrc/requests
 * ดึงรายการ EMRC Requests
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
      booking_purpose,
      requester_user_id,
      assigned_to_id,
      page,
      page_size,
    } = Object.fromEntries(searchParams);

    // สร้าง request object สำหรับ gRPC
    const protoRequest: any = {};

    if (status !== undefined && status !== null) {
      protoRequest.status = status;
    }
    if (booking_purpose !== undefined && booking_purpose !== null) {
      protoRequest.booking_purpose = mapBookingPurposeToProto(booking_purpose);
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
    const response = await callEMRCService<any>(
      "ListAmbulanceRequests",
      protoRequest,
    );

    if (response.success) {
      const frontendData = (response.data || []).map((item: any) =>
        convertProtoToFrontend(item),
      );

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

    console.error("Error fetching EMRC requests:", error);

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
 * POST /api/emrc/requests
 * สร้าง EMRC Request ใหม่
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

    // หน่วยงานผู้แจ้งควรถูกกำหนดจากโปรไฟล์ผู้ใช้งาน (departmentSubSubId)
    const requesterDepartment =
      (session.user as any)?.departmentSubSubId ??
      requestData.requesterDepartment ??
      null;

    // แปลงข้อมูลจาก Frontend format เป็น Proto format
    const protoRequest = {
      requester_department: requesterDepartment,
      requester_name: requestData.requesterName,
      requester_phone: requestData.requesterPhone,
      requester_user_id: session.user.id,
      request_date: requestData.requestDate,
      request_time: requestData.requestTime,
      booking_purpose: mapBookingPurposeToProto(requestData.bookingPurpose),
      booking_purpose_other: requestData.bookingPurposeOther || null,
      patient_name: requestData.patientName || null,
      patient_birth_date: requestData.patientBirthDate || null,
      destination_address: requestData.destinationAddress || null,
      patient_rights: requestData.patientRights || null,
      patient_hn: requestData.patientHN || null,
      patient_citizen_id: requestData.patientCitizenId || null,
      patient_phone: requestData.patientPhone || null,
      required_equipment: mapRequiredEquipmentToProto(
        requestData.requiredEquipment || [],
      ),
      infection_status: mapInfectionStatusToProto(requestData.infectionStatus),
      infection_status_other: requestData.infectionStatusOther || null,
      department_phone: requestData.departmentPhone || null,
      requester_name_detail: requestData.requesterNameDetail || null,
      condition_type: mapConditionTypeToProto(requestData.conditionType),
      acknowledged: requestData.acknowledged ?? false,
    };

    // เรียก gRPC service โดยตรง
    const response = await callEMRCService<any>(
      "CreateAmbulanceRequest",
      protoRequest,
    );

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          data: convertProtoToFrontend(response.data),
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

    console.error("Error creating EMRC request:", error);

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

