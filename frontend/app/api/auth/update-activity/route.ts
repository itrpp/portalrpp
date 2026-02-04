import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/update-activity
 * อัปเดต lastActivityAt ของผู้ใช้ที่กำลังใช้งาน
 * เรียกจาก client-side เพื่อ track activity
 */
export async function POST(request: NextRequest) {
  try {
    // 1) ลองตรวจสอบจาก Bearer token (เช่น มาจาก /api/auth/login)
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
        // ถ้า token ใช้ไม่ได้ ให้ fallback ไปใช้ NextAuth session ตามเดิม
        console.info("Invalid bearer token for update-activity:", error);
      }
    }

    // 2) ถ้าไม่มีหรือ verify ไม่ผ่าน ให้ fallback ไปใช้ NextAuth session (เว็บ)
    if (!userId) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }

      userId = auth.userId;
    }

    const now = new Date();

    // อัปเดต lastActivityAt
    // ถ้ายังไม่มี record ใน user_activity ให้สร้างใหม่ทันที
    await prisma.user_activity.upsert({
      where: { userId },
      update: {
        lastActivityAt: now,
      },
      create: {
        userId,
        loginAt: now,
        lastActivityAt: now,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Activity updated successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    // ไม่ return error เพื่อไม่ให้กระทบการทำงานของระบบหลัก
    // ถ้าไม่มี record ใน user_activity ก็ไม่เป็นไร
    console.debug("Failed to update user activity:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดต activity",
      },
      { status: 500 },
    );
  }
}
