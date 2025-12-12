import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/buildings/[id]
 * ดึงข้อมูล Building โดย ID
 */
export async function GET(
  request: NextRequest,
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

    // เรียก gRPC service
    const response = await callPorterService<any>("GetBuilding", { id });

    if (response.success && response.data) {
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
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลอาคาร",
        },
        { status: 404 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching building:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/porter/buildings/[id]
 * อัปเดตข้อมูล Building
 */
export async function PUT(
  request: NextRequest,
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
    const requestData = await request.json();

    // สร้าง proto request
    const protoRequest: any = {
      id,
      name: requestData.name,
    };

    // ถ้ามี floorCount ที่ระบุมา
    if (requestData.floorCount !== undefined) {
      protoRequest.floor_count = requestData.floorCount;
    }
    // ถ้ามี floorPlans ที่ระบุมา (เป็น array)
    if (requestData.floorPlans !== undefined) {
      protoRequest.floor_plans = Array.isArray(requestData.floorPlans)
        ? requestData.floorPlans
        : [];
    }
    // ถ้ามี status ที่ระบุมา
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdateBuilding",
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
          error: "UPDATE_FAILED",
          message: response.error_message || "ไม่สามารถอัปเดตอาคารได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating building:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดตอาคาร",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/porter/buildings/[id]
 * ลบ Building
 */
export async function DELETE(
  request: NextRequest,
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

    // เรียก gRPC service
    const response = await callPorterService<any>("DeleteBuilding", { id });

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          message: response.message || "ลบอาคารสำเร็จ",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: response.error_message || "ไม่สามารถลบอาคารได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error deleting building:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการลบอาคาร",
      },
      { status: 500 },
    );
  }
}
