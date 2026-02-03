import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { getUserProfile } from "@/lib/profile";

/**
 * GET /api/users/[id]/basic
 * ดึงข้อมูล user เบื้องต้นตาม id (ไม่ต้องเป็น admin) ใช้สำหรับ map employee กับ user login
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID" },
        { status: 400 },
      );
    }

    const user = await getUserProfile(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
