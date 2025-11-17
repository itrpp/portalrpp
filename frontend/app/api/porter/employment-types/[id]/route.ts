import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/employment-types/[id]
 * ดึงข้อมูล EmploymentType โดย ID
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
    const response = await callPorterService<any>("GetEmploymentType", {
      id,
    });

    if (response.success && response.data) {
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
          error: "NOT_FOUND",
          message: response.error_message || "ไม่พบข้อมูลประเภทการจ้าง",
        },
        { status: 404 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching employment type:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลประเภทการจ้าง",
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
 * PUT /api/porter/employment-types/[id]
 * อัปเดตข้อมูล EmploymentType
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
      "UpdateEmploymentType",
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
          message:
            response.error_message || "ไม่สามารถอัปเดตข้อมูลประเภทการจ้างได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating employment type:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลประเภทการจ้าง",
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
          message: error.message || "ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว",
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
 * DELETE /api/porter/employment-types/[id]
 * ลบ EmploymentType
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
    const response = await callPorterService<any>("DeleteEmploymentType", {
      id,
    });

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          message: response.message || "ลบประเภทการจ้างสำเร็จ",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: response.error_message || "ไม่สามารถลบประเภทการจ้างได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error deleting employment type:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลประเภทการจ้าง",
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
            "ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้ประเภทการจ้างนี้อยู่",
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
