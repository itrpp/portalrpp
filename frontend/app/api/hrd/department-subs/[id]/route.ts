import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hrd/department-subs/[id]
 * ดึงข้อมูลกลุ่มงานโดย ID
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
    const departmentSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubId) || departmentSubId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const departmentSub = await prisma.hrd_department_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
      select: {
        HR_DEPARTMENT_SUB_ID: true,
        HR_DEPARTMENT_SUB_NAME: true,
        HR_DEPARTMENT_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!departmentSub) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มงาน",
        },
        { status: 404 },
      );
    }

    // ดึงชื่อ department
    const department = departmentSub.HR_DEPARTMENT_ID
      ? await prisma.hrd_department.findUnique({
          where: {
            HR_DEPARTMENT_ID: Number.parseInt(
              departmentSub.HR_DEPARTMENT_ID,
              10,
            ),
          },
          select: {
            HR_DEPARTMENT_NAME: true,
          },
        })
      : null;

    return NextResponse.json({
      success: true,
      data: {
        id: departmentSub.HR_DEPARTMENT_SUB_ID,
        name: departmentSub.HR_DEPARTMENT_SUB_NAME ?? "",
        departmentId: Number.parseInt(
          departmentSub.HR_DEPARTMENT_ID || "0",
          10,
        ),
        departmentName: department?.HR_DEPARTMENT_NAME ?? "",
        active: departmentSub.ACTIVE === "True",
        createdAt: departmentSub.created_at?.toISOString(),
        updatedAt: departmentSub.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching department sub:", error);

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
 * PUT /api/hrd/department-subs/[id]
 * อัปเดตข้อมูลกลุ่มงาน
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
    const departmentSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubId) || departmentSubId <= 0) {
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
    const { name, departmentId, active } = requestData;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existing = await prisma.hrd_department_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มงาน",
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
            message: "กรุณากรอกชื่อกลุ่มงาน",
          },
          { status: 400 },
        );
      }
    }

    if (departmentId !== undefined) {
      if (typeof departmentId !== "number") {
        return NextResponse.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: "กรุณาเลือกกลุ่มภารกิจ",
          },
          { status: 400 },
        );
      }

      // ตรวจสอบ departmentId มีอยู่จริง
      const department = await prisma.hrd_department.findUnique({
        where: {
          HR_DEPARTMENT_ID: departmentId,
        },
      });

      if (!department) {
        return NextResponse.json(
          {
            success: false,
            error: "DEPARTMENT_NOT_FOUND",
            message: "ไม่พบข้อมูลกลุ่มภารกิจ",
          },
          { status: 404 },
        );
      }
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวที่กำลังแก้ไข)
    if (name !== undefined) {
      const finalDepartmentId =
        departmentId !== undefined
          ? departmentId
          : Number.parseInt(existing.HR_DEPARTMENT_ID || "0", 10);

      const duplicate = await prisma.hrd_department_sub.findFirst({
        where: {
          HR_DEPARTMENT_ID: String(finalDepartmentId),
          HR_DEPARTMENT_SUB_NAME: {
            equals: name.trim(),
          },
          HR_DEPARTMENT_SUB_ID: {
            not: departmentSubId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: "ชื่อกลุ่มงานนี้มีอยู่ในกลุ่มภารกิจนี้แล้ว",
          },
          { status: 409 },
        );
      }
    }

    // อัปเดตข้อมูล
    const updateData: any = {};

    if (name !== undefined) {
      updateData.HR_DEPARTMENT_SUB_NAME = name.trim();
    }
    if (departmentId !== undefined) {
      updateData.HR_DEPARTMENT_ID = String(departmentId);
    }
    if (active !== undefined) {
      updateData.ACTIVE = active ? "True" : "False";
    }

    const updated = await prisma.hrd_department_sub.update({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
      data: updateData,
      select: {
        HR_DEPARTMENT_SUB_ID: true,
        HR_DEPARTMENT_SUB_NAME: true,
        HR_DEPARTMENT_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    // ดึงชื่อ department
    const finalDepartmentId = Number.parseInt(
      updated.HR_DEPARTMENT_ID || "0",
      10,
    );
    const department = await prisma.hrd_department.findUnique({
      where: {
        HR_DEPARTMENT_ID: finalDepartmentId,
      },
      select: {
        HR_DEPARTMENT_NAME: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.HR_DEPARTMENT_SUB_ID,
        name: updated.HR_DEPARTMENT_SUB_NAME ?? "",
        departmentId: finalDepartmentId,
        departmentName: department?.HR_DEPARTMENT_NAME ?? "",
        active: updated.ACTIVE === "True",
        createdAt: updated.created_at?.toISOString(),
        updatedAt: updated.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating department sub:", error);

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
 * DELETE /api/hrd/department-subs/[id]
 * ลบกลุ่มงาน
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
    const departmentSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubId) || departmentSubId <= 0) {
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
    const existing = await prisma.hrd_department_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มงาน",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบว่ามี department_sub_sub ใช้อยู่หรือไม่
    const departmentSubSubCount = await prisma.hrd_department_sub_sub.count({
      where: {
        HR_DEPARTMENT_SUB_ID: String(departmentSubId),
      },
    });

    if (departmentSubSubCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message: `ไม่สามารถลบได้ เนื่องจากมีหน่วยงาน ${departmentSubSubCount} รายการที่ใช้กลุ่มงานนี้อยู่`,
        },
        { status: 400 },
      );
    }

    // ลบข้อมูล
    await prisma.hrd_department_sub.delete({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบกลุ่มงานสำเร็จ",
    });
  } catch (error: any) {
    console.error("Error deleting department sub:", error);

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
