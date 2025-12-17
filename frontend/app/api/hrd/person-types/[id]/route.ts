import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hrd/person-types/[id]
 * ดึงข้อมูลกลุ่มบุคลากรโดย ID
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
    const personTypeId = Number.parseInt(id, 10);

    if (!Number.isInteger(personTypeId) || personTypeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const personType = await prisma.hrd_person_type.findUnique({
      where: {
        HR_PERSON_TYPE_ID: personTypeId,
      },
      select: {
        HR_PERSON_TYPE_ID: true,
        HR_PERSON_TYPE_NAME: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!personType) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มบุคลากร",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: personType.HR_PERSON_TYPE_ID,
        name: personType.HR_PERSON_TYPE_NAME ?? "",
        active: true, // Default value until ACTIVE field is added to schema
        createdAt: personType.created_at?.toISOString(),
        updatedAt: personType.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching person type:", error);

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
 * PUT /api/hrd/person-types/[id]
 * อัปเดตข้อมูลกลุ่มบุคลากร
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
    const personTypeId = Number.parseInt(id, 10);

    if (!Number.isInteger(personTypeId) || personTypeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const requestData = await request.json();
    const { name, active } = requestData;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existing = await prisma.hrd_person_type.findUnique({
      where: {
        HR_PERSON_TYPE_ID: personTypeId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มบุคลากร",
        },
        { status: 404 },
      );
    }

    // Validation
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: "กรุณากรอกชื่อกลุ่มบุคลากร",
          },
          { status: 400 },
        );
      }

      // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวที่กำลังแก้ไข)
      const duplicate = await prisma.hrd_person_type.findFirst({
        where: {
          HR_PERSON_TYPE_NAME: {
            equals: name.trim(),
          },
          HR_PERSON_TYPE_ID: {
            not: personTypeId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: "ชื่อกลุ่มบุคลากรนี้มีอยู่ในระบบแล้ว",
          },
          { status: 409 },
        );
      }
    }

    // อัปเดตข้อมูล
    const updateData: any = {};

    if (name !== undefined) {
      updateData.HR_PERSON_TYPE_NAME = name.trim();
    }
    // Note: active field will be handled when ACTIVE column is added to database schema

    const updated = await prisma.hrd_person_type.update({
      where: {
        HR_PERSON_TYPE_ID: personTypeId,
      },
      data: updateData,
      select: {
        HR_PERSON_TYPE_ID: true,
        HR_PERSON_TYPE_NAME: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.HR_PERSON_TYPE_ID,
        name: updated.HR_PERSON_TYPE_NAME ?? "",
        active: active !== undefined ? active : true, // Use provided value or default to true
        createdAt: updated.created_at?.toISOString(),
        updatedAt: updated.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating person type:", error);

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
 * DELETE /api/hrd/person-types/[id]
 * ลบกลุ่มบุคลากร
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
    const personTypeId = Number.parseInt(id, 10);

    if (!Number.isInteger(personTypeId) || personTypeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existing = await prisma.hrd_person_type.findUnique({
      where: {
        HR_PERSON_TYPE_ID: personTypeId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มบุคลากร",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบว่ามี user ใช้อยู่หรือไม่
    const userCount = await prisma.user.count({
      where: {
        personTypeId: personTypeId,
      },
    });

    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message: `ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ ${userCount} รายการที่ใช้กลุ่มบุคลากรนี้อยู่`,
        },
        { status: 400 },
      );
    }

    // ลบข้อมูล
    await prisma.hrd_person_type.delete({
      where: {
        HR_PERSON_TYPE_ID: personTypeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบกลุ่มบุคลากรสำเร็จ",
    });
  } catch (error: any) {
    console.error("Error deleting person type:", error);

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
