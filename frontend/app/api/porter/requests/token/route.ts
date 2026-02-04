import type { ExtendedUser } from "@/types/ldap";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { getAuthSession } from "@/lib/auth";

/**
 * สร้าง JWT token สำหรับ SSE stream connection
 * GET /api/porter/requests/token
 */
export async function GET() {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const user = auth.session.user as ExtendedUser;

    // สร้าง JWT token สำหรับ authentication กับ API Gateway
    const jwtSecret =
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

    const signedToken = jwt.sign(
      {
        sub: user.id,
        department: user.department,
        position: user.position,
        memberOf: user.memberOf,
        role: user.role,
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
