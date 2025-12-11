import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/hrd/positions/[id]
 * ดึงข้อมูลตำแหน่งโดย ID
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
    const positionId = Number.parseInt(id, 10);

    if (!Number.isInteger(positionId) || positionId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message: "ID ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const position = await prisma.hrd_position.findUnique({
      where: {
        HR_POSITION_ID: positionId,
      },
      select: {
        HR_POSITION_ID: true,
        HR_POSITION_NAME: true,
        POSITION_SP_ID: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!position) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: position.HR_POSITION_ID,
        name: position.HR_POSITION_NAME ?? "",
        positionSpId: position.POSITION_SP_ID ?? undefined,
        createdAt: position.created_at?.toISOString(),
        updatedAt: position.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching position:", error);

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
 * PUT /api/hrd/positions/[id]
 * อัปเดตข้อมูลตำแหน่ง
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
    const positionId = Number.parseInt(id, 10);

    if (!Number.isInteger(positionId) || positionId <= 0) {
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
    const { name, positionSpId } = requestData;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existing = await prisma.hrd_position.findUnique({
      where: {
        HR_POSITION_ID: positionId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลตำแหน่ง",
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
            message: "กรุณากรอกชื่อตำแหน่ง",
          },
          { status: 400 },
        );
      }

      // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวที่กำลังแก้ไข)
      const duplicate = await prisma.hrd_position.findFirst({
        where: {
          HR_POSITION_NAME: {
            equals: name.trim(),
          },
          HR_POSITION_ID: {
            not: positionId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: "ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว",
          },
          { status: 409 },
        );
      }
    }

    // อัปเดตข้อมูล
    const updateData: any = {};

    if (name !== undefined) {
      updateData.HR_POSITION_NAME = name.trim();
    }
    if (positionSpId !== undefined) {
      updateData.POSITION_SP_ID = positionSpId || null;
    }

    const updated = await prisma.hrd_position.update({
      where: {
        HR_POSITION_ID: positionId,
      },
      data: updateData,
      select: {
        HR_POSITION_ID: true,
        HR_POSITION_NAME: true,
        POSITION_SP_ID: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.HR_POSITION_ID,
        name: updated.HR_POSITION_NAME ?? "",
        positionSpId: updated.POSITION_SP_ID ?? undefined,
        createdAt: updated.created_at?.toISOString(),
        updatedAt: updated.updated_at?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating position:", error);

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
 * DELETE /api/hrd/positions/[id]
 * ลบตำแหน่ง
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
    const positionId = Number.parseInt(id, 10);

    if (!Number.isInteger(positionId) || positionId <= 0) {
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
    const existing = await prisma.hrd_position.findUnique({
      where: {
        HR_POSITION_ID: positionId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลตำแหน่ง",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบว่ามี user ใช้อยู่หรือไม่
    const userCount = await prisma.user.count({
      where: {
        positionId: positionId,
      },
    });

    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "IN_USE",
          message: `ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ ${userCount} รายการที่ใช้ตำแหน่งนี้อยู่`,
        },
        { status: 400 },
      );
    }

    // ลบข้อมูล
    await prisma.hrd_position.delete({
      where: {
        HR_POSITION_ID: positionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบตำแหน่งสำเร็จ",
    });
  } catch (error: any) {
    console.error("Error deleting position:", error);

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
