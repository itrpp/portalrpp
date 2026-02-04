import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/profile";

const LINE_PROVIDER_ID = "line";

/**
 * DELETE /api/users/[id]/line
 * ยกเลิกการเชื่อมต่อ LINE ของ user อื่น
 * ต้องเป็น admin เท่านั้น
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    // ตรวจสอบสิทธิ์ admin
    if ((auth.session.user as { role?: string }).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // ตรวจสอบว่า user มีอยู่จริง
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        lineUserId: true,
        displayName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลผู้ใช้",
        },
        { status: 404 },
      );
    }

    if (!user.lineUserId) {
      return NextResponse.json(
        { success: false, error: "LINE_NOT_LINKED" },
        { status: 400 },
      );
    }

    try {
      await prisma.$transaction([
        prisma.account.deleteMany({
          where: {
            userId: user.id,
            provider: LINE_PROVIDER_ID,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            lineUserId: null,
            lineDisplayName: null,
          },
        }),
      ]);
    } catch (error) {
      console.error("Failed to disconnect LINE:", error);

      return NextResponse.json(
        { success: false, error: "LINE_DISCONNECT_FAILED" },
        { status: 500 },
      );
    }

    const profile = await getUserProfile(user.id);

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error("Error disconnecting LINE:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ LINE",
      },
      { status: 500 },
    );
  }
}
