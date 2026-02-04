import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { callPorterService } from "@/lib/grpcClient";
import { convertProtoToFrontend } from "@/lib/porter";

/**
 * PUT /api/porter/requests/[id]/timestamps
 * อัปเดต Timestamps ของ Porter Request (pickup, delivery, return)
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
    };

    if (requestData.pickupAt !== undefined && requestData.pickupAt !== null) {
      protoRequest.pickup_at = requestData.pickupAt;
    }
    if (
      requestData.deliveryAt !== undefined &&
      requestData.deliveryAt !== null
    ) {
      protoRequest.delivery_at = requestData.deliveryAt;
    }
    if (requestData.returnAt !== undefined && requestData.returnAt !== null) {
      protoRequest.return_at = requestData.returnAt;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdatePorterRequestTimestamps",
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
          message: response.error_message || "ไม่สามารถอัปเดต Timestamps ได้",
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
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดต Timestamps",
      },
      { status: 500 },
    );
  }
}
