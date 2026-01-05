import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/[id]/basic
 * ดึงข้อมูล user พื้นฐาน (id, email, displayName, ldapDisplayName) สำหรับ autocomplete
 * ไม่ต้องเป็น admin (ใช้สำหรับ autocomplete ในหน้าแก้ไขเจ้าหน้าที่เปล)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = (await getServerSession(
      authOptions as any,
    )) as import("@/types/ldap").ExtendedSession;

    // ตรวจสอบ authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        ldapDisplayName: true,
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

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching user:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
      },
      { status: 500 },
    );
  }
}

