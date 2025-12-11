import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hrd/department-sub-subs/[id]
 * ดึงข้อมูลหน่วยงานโดย ID
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
    const departmentSubSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubSubId) || departmentSubSubId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const departmentSubSub = await prisma.hrd_department_sub_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
      },
      select: {
        HR_DEPARTMENT_SUB_SUB_ID: true,
        HR_DEPARTMENT_SUB_SUB_NAME: true,
        HR_DEPARTMENT_SUB_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!departmentSubSub) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลหน่วยงาน",
        },
        { status: 404 },
      );
    }

    // ดึงชื่อ department_sub
    const departmentSub = departmentSubSub.HR_DEPARTMENT_SUB_ID
      ? await prisma.hrd_department_sub.findUnique({
          where: {
            HR_DEPARTMENT_SUB_ID: Number.parseInt(
              departmentSubSub.HR_DEPARTMENT_SUB_ID,
              10,
            ),
          },
          select: {
            HR_DEPARTMENT_SUB_NAME: true,
          },
        })
      : null;

    return NextResponse.json({
      success: true,
      data: {
        id: departmentSubSub.HR_DEPARTMENT_SUB_SUB_ID,
        name: departmentSubSub.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
        departmentSubId: Number.parseInt(
          departmentSubSub.HR_DEPARTMENT_SUB_ID || "0",
          10,
        ),
        departmentSubName: departmentSub?.HR_DEPARTMENT_SUB_NAME ?? "",
        active: departmentSubSub.ACTIVE === "True",
        createdAt: departmentSubSub.created_at?.toISOString(),
        updatedAt: departmentSubSub.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching department sub sub:", error);

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
 * PUT /api/hrd/department-sub-subs/[id]
 * อัปเดตข้อมูลหน่วยงาน
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
    const departmentSubSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubSubId) || departmentSubSubId <= 0) {
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
    const { name, departmentSubId, active } = requestData;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existing = await prisma.hrd_department_sub_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลหน่วยงาน",
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
            message: "กรุณากรอกชื่อหน่วยงาน",
          },
          { status: 400 },
        );
      }
    }

    if (departmentSubId !== undefined) {
      if (typeof departmentSubId !== "number") {
        return NextResponse.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: "กรุณาเลือกกลุ่มงาน",
          },
          { status: 400 },
        );
      }

      // ตรวจสอบ departmentSubId มีอยู่จริง
      const departmentSub = await prisma.hrd_department_sub.findUnique({
        where: {
          HR_DEPARTMENT_SUB_ID: departmentSubId,
        },
      });

      if (!departmentSub) {
        return NextResponse.json(
          {
            success: false,
            error: "DEPARTMENT_SUB_NOT_FOUND",
            message: "ไม่พบข้อมูลกลุ่มงาน",
          },
          { status: 404 },
        );
      }
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวที่กำลังแก้ไข)
    if (name !== undefined) {
      const finalDepartmentSubId =
        departmentSubId !== undefined
          ? departmentSubId
          : Number.parseInt(existing.HR_DEPARTMENT_SUB_ID || "0", 10);

      const duplicate = await prisma.hrd_department_sub_sub.findFirst({
        where: {
          HR_DEPARTMENT_SUB_ID: String(finalDepartmentSubId),
          HR_DEPARTMENT_SUB_SUB_NAME: {
            equals: name.trim(),
          },
          HR_DEPARTMENT_SUB_SUB_ID: {
            not: departmentSubSubId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: "ชื่อหน่วยงานนี้มีอยู่ในกลุ่มงานนี้แล้ว",
          },
          { status: 409 },
        );
      }
    }

    // อัปเดตข้อมูล
    const updateData: any = {};

    if (name !== undefined) {
      updateData.HR_DEPARTMENT_SUB_SUB_NAME = name.trim();
    }
    if (departmentSubId !== undefined) {
      updateData.HR_DEPARTMENT_SUB_ID = String(departmentSubId);
    }
    if (active !== undefined) {
      updateData.ACTIVE = active ? "True" : "False";
    }

    const updated = await prisma.hrd_department_sub_sub.update({
      where: {
        HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
      },
      data: updateData,
      select: {
        HR_DEPARTMENT_SUB_SUB_ID: true,
        HR_DEPARTMENT_SUB_SUB_NAME: true,
        HR_DEPARTMENT_SUB_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    // ดึงชื่อ department_sub
    const finalDepartmentSubId = Number.parseInt(
      updated.HR_DEPARTMENT_SUB_ID || "0",
      10,
    );
    const departmentSub = await prisma.hrd_department_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_ID: finalDepartmentSubId,
      },
      select: {
        HR_DEPARTMENT_SUB_NAME: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.HR_DEPARTMENT_SUB_SUB_ID,
        name: updated.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
        departmentSubId: finalDepartmentSubId,
        departmentSubName: departmentSub?.HR_DEPARTMENT_SUB_NAME ?? "",
        active: updated.ACTIVE === "True",
        createdAt: updated.created_at?.toISOString(),
        updatedAt: updated.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating department sub sub:", error);

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
 * DELETE /api/hrd/department-sub-subs/[id]
 * ลบหน่วยงาน
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
    const departmentSubSubId = Number.parseInt(id, 10);

    if (!Number.isInteger(departmentSubSubId) || departmentSubSubId <= 0) {
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
    const existing = await prisma.hrd_department_sub_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลหน่วยงาน",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบว่ามี user ใช้อยู่หรือไม่
    const userCount = await prisma.user.count({
      where: {
        departmentSubSubId: departmentSubSubId,
      },
    });

    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message: `ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ ${userCount} รายการที่ใช้หน่วยงานนี้อยู่`,
        },
        { status: 400 },
      );
    }

    // ลบข้อมูล
    await prisma.hrd_department_sub_sub.delete({
      where: {
        HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบหน่วยงานสำเร็จ",
    });
  } catch (error: any) {
    console.error("Error deleting department sub sub:", error);

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
