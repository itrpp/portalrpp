import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/auth/cleanup-activity
 * ลบข้อมูล user_activity ของผู้ใช้ที่กำลัง logout
 * ใช้เรียกก่อน signOut เพื่อ cleanup
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1) รองรับ Bearer token (เช่น มาจาก /api/auth/login)
    let userId: string | null = null;
    const authHeader =
      request.headers.get("authorization") ??
      request.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();

      try {
        const jwtSecret =
          process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

          if (decoded && typeof decoded === "object" && decoded.sub) {
            userId = String(decoded.sub);
          }
        }
      } catch (error) {
        console.info("Invalid bearer token for cleanup-activity:", error);
      }
    }

    // 2) ถ้าไม่มี Bearer หรือ verify ไม่ผ่าน ให้ fallback ใช้ NextAuth session (เว็บ)
    if (!userId) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }

      userId = auth.userId;
    }

    // ลบ user_activity ของผู้ใช้ที่กำลัง logout
    await prisma.user_activity.deleteMany({
      where: { userId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User activity cleaned up successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error cleaning up user activity:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการลบข้อมูล activity",
      },
      { status: 500 },
    );
  }
}
