import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/positions/[id]
 * ดึงข้อมูล Position โดย ID
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
    const response = await callPorterService<any>("GetPosition", { id });

    if (response.success && response.data) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        name: response.data.name,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
      };

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
          error: "NOT_FOUND",
          message: response.error_message || "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching position:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }

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
 * PUT /api/porter/positions/[id]
 * อัปเดตข้อมูล Position
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

    // สร้าง proto request
    const protoRequest: any = {
      id,
    };

    if (requestData.name !== undefined) {
      protoRequest.name = requestData.name;
    }
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdatePosition",
      protoRequest,
    );

    if (response.success) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status ?? true,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
      };

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
          message: response.error_message || "ไม่สามารถอัปเดตข้อมูลตำแหน่งได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating position:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }

    if (error.code === 6) {
      // ALREADY_EXISTS
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: error.message || "ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/porter/positions/[id]
 * ลบ Position
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
    const response = await callPorterService<any>("DeletePosition", { id });

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          message: response.message || "ลบตำแหน่งสำเร็จ",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: response.error_message || "ไม่สามารถลบตำแหน่งได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error deleting position:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }

    if (error.code === 9) {
      // FAILED_PRECONDITION - มี Employee ใช้อยู่
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message:
            error.message ||
            "ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ตำแหน่งนี้อยู่",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการลบข้อมูล",
      },
      { status: 500 },
    );
  }
}
