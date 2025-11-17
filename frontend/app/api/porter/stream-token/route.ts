import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * สร้าง JWT token สำหรับ SSE stream connection
 * GET /api/porter/stream-token
 */
export async function GET() {
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

    // สร้าง JWT token สำหรับ authentication กับ API Gateway
    const jwtSecret =
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

    const signedToken = jwt.sign(
      {
        sub: session.user.id,
        department: session.user.department,
        title: session.user.title,
        groups: session.user.groups,
        role: session.user.role,
      },
      jwtSecret,
      { expiresIn: "15m" },
    );

    return NextResponse.json({
      success: true,
      token: signedToken,
    });
  } catch (error: unknown) {
    console.error("Error creating stream token:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to create stream token",
      },
      { status: 500 },
    );
  }
}
