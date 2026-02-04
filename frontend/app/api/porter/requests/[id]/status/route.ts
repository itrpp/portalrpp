import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { callPorterService } from "@/lib/grpcClient";
import { mapStatusToProto, convertProtoToFrontend } from "@/lib/porter";

/**
 * PUT /api/porter/requests/[id]/status
 * อัปเดตสถานะ Porter Request
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    // อ่านข้อมูลจาก request body
    const requestData = await request.json();

    // สร้าง proto request
    const protoRequest: any = {
      id,
      status: mapStatusToProto(requestData.status),
    };

    if (requestData.assignedToId) {
      protoRequest.assigned_to_id = requestData.assignedToId;
    }
    if (requestData.cancelledReason) {
      protoRequest.cancelled_reason = requestData.cancelledReason;

      protoRequest.cancelled_by_id = auth.userId;
    }
    if (
      requestData.status === "IN_PROGRESS" ||
      requestData.status === "in-progress"
    ) {
      protoRequest.accepted_by_id = auth.userId;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdatePorterRequestStatus",
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
          message: response.error_message || "ไม่สามารถอัปเดตสถานะได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลคำขอ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
      },
      { status: 500 },
    );
  }
}
