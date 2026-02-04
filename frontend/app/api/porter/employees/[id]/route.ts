import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { callPorterService } from "@/lib/grpcClient";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/porter/employees/[id]
 * ดึงข้อมูล Employee โดย ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    // เรียก gRPC service
    const response = await callPorterService<any>("GetEmployee", { id });

    if (response.success && response.data) {
      // ดึงข้อมูล employment type และ position จาก hrd tables
      const employmentTypeId = parseInt(response.data.employment_type_id, 10);
      const positionId = parseInt(response.data.position_id, 10);

      const [personType, position] = await Promise.all([
        prisma.hrd_person_type.findUnique({
          where: { HR_PERSON_TYPE_ID: employmentTypeId },
          select: { HR_PERSON_TYPE_NAME: true },
        }),
        prisma.hrd_position.findUnique({
          where: { HR_POSITION_ID: positionId },
          select: { HR_POSITION_NAME: true },
        }),
      ]);

      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        citizenId: response.data.citizen_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        nickname: response.data.nickname || undefined,
        profileImage: response.data.profile_image || undefined,
        employmentType: personType?.HR_PERSON_TYPE_NAME || "",
        employmentTypeId: response.data.employment_type_id,
        position: position?.HR_POSITION_NAME || "",
        positionId: response.data.position_id,
        status: response.data.status,
        userId: response.data.user_id || undefined,
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
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    console.error("Error fetching employee:", err);

    // จัดการ gRPC errors
    if (err.code === 5) {
      // NOT_FOUND
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: err.message || "ไม่พบข้อมูลเจ้าหน้าที่",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล",
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
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

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
    if (requestData.nickname !== undefined) {
      protoRequest.nickname = requestData.nickname || undefined;
    }
    // ส่ง empty string ถ้า profileImage เป็น null หรือ empty string เพื่อลบรูปภาพออกจาก database
    // gRPC protobuf ไม่รองรับ null สำหรับ optional string ดังนั้นใช้ empty string แทน
    if (requestData.profileImage !== undefined) {
      // ถ้าเป็น empty string หรือ null ให้ส่ง empty string เพื่อให้ backend รู้ว่าต้องลบรูปภาพ
      protoRequest.profile_image =
        requestData.profileImage && requestData.profileImage.trim() !== ""
          ? requestData.profileImage
          : "";
    }
    if (requestData.employmentTypeId !== undefined) {
      // แปลงจาก number (hrd) เป็น string (gRPC)
      protoRequest.employment_type_id = String(requestData.employmentTypeId);
    }
    if (requestData.positionId !== undefined) {
      // แปลงจาก number (hrd) เป็น string (gRPC)
      protoRequest.position_id = String(requestData.positionId);
    }
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }
    if (requestData.userId !== undefined) {
      protoRequest.user_id =
        requestData.userId && requestData.userId.trim() !== ""
          ? requestData.userId.trim()
          : "";
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdateEmployee",
      protoRequest,
    );

    if (response.success) {
      // ดึงข้อมูล employment type และ position จาก hrd tables
      const employmentTypeId = parseInt(response.data.employment_type_id, 10);
      const positionId = parseInt(response.data.position_id, 10);

      const [personType, position] = await Promise.all([
        prisma.hrd_person_type.findUnique({
          where: { HR_PERSON_TYPE_ID: employmentTypeId },
          select: { HR_PERSON_TYPE_NAME: true },
        }),
        prisma.hrd_position.findUnique({
          where: { HR_POSITION_ID: positionId },
          select: { HR_POSITION_NAME: true },
        }),
      ]);

      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        citizenId: response.data.citizen_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        nickname: response.data.nickname || undefined,
        profileImage: response.data.profile_image || undefined,
        employmentType: personType?.HR_PERSON_TYPE_NAME || "",
        employmentTypeId: response.data.employment_type_id,
        position: position?.HR_POSITION_NAME || "",
        positionId: response.data.position_id,
        status: response.data.status,
        userId: response.data.user_id || undefined,
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

    // ผู้ใช้นี้ผูกกับเจ้าหน้าที่อื่นแล้ว (unique constraint user_id)
    const details = String(error?.details ?? error?.message ?? "");

    if (
      details.includes("USER_ALREADY_LINKED") ||
      error?.message?.includes("USER_ALREADY_LINKED")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_ALREADY_LINKED",
          message:
            "ผู้ใช้นี้ผูกกับเจ้าหน้าที่อื่นแล้ว กรุณาเลือกผู้ใช้อื่นหรือยกเลิกการผูก",
        },
        { status: 409 },
      );
    }

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
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

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
