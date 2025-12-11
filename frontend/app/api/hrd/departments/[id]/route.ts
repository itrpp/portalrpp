import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hrd/departments/[id]
 * ดึงข้อมูลกลุ่มภารกิจโดย ID
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
    const departmentId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const department = await prisma.hrd_department.findUnique({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
      select: {
        HR_DEPARTMENT_ID: true,
        HR_DEPARTMENT_NAME: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มภารกิจ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: department.HR_DEPARTMENT_ID,
        name: department.HR_DEPARTMENT_NAME ?? "",
        active: department.ACTIVE === "True",
        createdAt: department.created_at?.toISOString(),
        updatedAt: department.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching department:", error);

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
 * PUT /api/hrd/departments/[id]
 * อัปเดตข้อมูลกลุ่มภารกิจ
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
    const departmentId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
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
    const existing = await prisma.hrd_department.findUnique({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มภารกิจ",
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
            message: "กรุณากรอกชื่อกลุ่มภารกิจ",
          },
          { status: 400 },
        );
      }

      // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวที่กำลังแก้ไข)
      const duplicate = await prisma.hrd_department.findFirst({
        where: {
          HR_DEPARTMENT_NAME: {
            equals: name.trim(),
          },
          HR_DEPARTMENT_ID: {
            not: departmentId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: "ชื่อกลุ่มภารกิจนี้มีอยู่ในระบบแล้ว",
          },
          { status: 409 },
        );
      }
    }

    // อัปเดตข้อมูล
    const updateData: any = {};

    if (name !== undefined) {
      updateData.HR_DEPARTMENT_NAME = name.trim();
    }
    if (active !== undefined) {
      updateData.ACTIVE = active ? "True" : "False";
    }

    const updated = await prisma.hrd_department.update({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
      data: updateData,
      select: {
        HR_DEPARTMENT_ID: true,
        HR_DEPARTMENT_NAME: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.HR_DEPARTMENT_ID,
        name: updated.HR_DEPARTMENT_NAME ?? "",
        active: updated.ACTIVE === "True",
        createdAt: updated.created_at?.toISOString(),
        updatedAt: updated.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating department:", error);

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
 * DELETE /api/hrd/departments/[id]
 * ลบกลุ่มภารกิจ
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
    const departmentId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
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
    const existing = await prisma.hrd_department.findUnique({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มภารกิจ",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบว่ามี department_sub ใช้อยู่หรือไม่
    const departmentSubCount = await prisma.hrd_department_sub.count({
      where: {
        HR_DEPARTMENT_ID: String(departmentId),
      },
    });

    if (departmentSubCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message: `ไม่สามารถลบได้ เนื่องจากมีกลุ่มงาน ${departmentSubCount} รายการที่ใช้กลุ่มภารกิจนี้อยู่`,
        },
        { status: 400 },
      );
    }

    // ลบข้อมูล
    await prisma.hrd_department.delete({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบกลุ่มภารกิจสำเร็จ",
    });
  } catch (error: any) {
    console.error("Error deleting department:", error);

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

