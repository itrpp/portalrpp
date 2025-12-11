import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/employees/[id]
 * ดึงข้อมูล Employee โดย ID
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
    const response = await callPorterService<any>("GetEmployee", { id });

    if (response.success && response.data) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        citizenId: response.data.citizen_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        employmentType: response.data.employment_type || "",
        employmentTypeId: response.data.employment_type_id,
        position: response.data.position || "",
        positionId: response.data.position_id,
        status: response.data.status,
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
          message: response.error_message || "ไม่พบข้อมูลเจ้าหน้าที่",
        },
        { status: 404 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching employee:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลเจ้าหน้าที่",
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
 * PUT /api/porter/employees/[id]
 * อัปเดตข้อมูล Employee
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

    if (requestData.firstName !== undefined) {
      protoRequest.first_name = requestData.firstName;
    }
    if (requestData.lastName !== undefined) {
      protoRequest.last_name = requestData.lastName;
    }
    if (requestData.employmentTypeId !== undefined) {
      protoRequest.employment_type_id = requestData.employmentTypeId;
    }
    if (requestData.positionId !== undefined) {
      protoRequest.position_id = requestData.positionId;
    }
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdateEmployee",
      protoRequest,
    );

    if (response.success) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        citizenId: response.data.citizen_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        employmentType: response.data.employment_type || "",
        employmentTypeId: response.data.employment_type_id,
        position: response.data.position || "",
        positionId: response.data.position_id,
        status: response.data.status,
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
            response.error_message || "ไม่สามารถอัปเดตข้อมูลเจ้าหน้าที่ได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating employee:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลเจ้าหน้าที่",
        },
        { status: 404 },
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
 * DELETE /api/porter/employees/[id]
 * ลบ Employee
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
    const response = await callPorterService<any>("DeleteEmployee", { id });

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          message: response.message || "ลบเจ้าหน้าที่สำเร็จ",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: response.error_message || "ไม่สามารถลบเจ้าหน้าที่ได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error deleting employee:", error);

    // จัดการ gRPC errors
    if (error.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: error.message || "ไม่พบข้อมูลเจ้าหน้าที่",
        },
        { status: 404 },
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
