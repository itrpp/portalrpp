import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";
import {
  mapStatusToProto,
  mapUrgencyLevelToProto,
  convertProtoToFrontend,
} from "@/lib/porter";

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
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
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
