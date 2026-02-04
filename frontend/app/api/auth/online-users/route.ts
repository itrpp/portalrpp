import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/online-users
 * ดึงจำนวนผู้ใช้ที่ Online (lastActivityAt ยังไม่เกิน 15 นาที)
 * ต้อง login ก่อน
 */
export async function GET(request: NextRequest) {
  try {
    // 1) รองรับ Bearer token จาก /api/auth/login
    let userIdFromToken: string | null = null;
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
            userIdFromToken = String(decoded.sub);
          }
        }
      } catch (error) {
        console.info("Invalid bearer token for online-users:", error);
      }
    }

    // 2) ถ้าไม่มี Bearer หรือ verify ไม่ผ่าน ให้ fallback ไปใช้ NextAuth session (เว็บ)
    if (!userIdFromToken) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }
    }

    // คำนวณเวลาที่ถือว่า offline (15 นาทีที่แล้ว)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // ดึง records จาก user_activity ที่ lastActivityAt ยังไม่เกิน 15 นาที
    const onlineUsers = await prisma.user_activity.findMany({
      where: {
        lastActivityAt: {
          gte: fifteenMinutesAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            department: true,
            departmentId: true,
            departmentSubId: true,
            departmentSubSubId: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: "desc",
      },
    });

    // นับจำนวนผู้ใช้ Online
    const count = onlineUsers.length;

    // สร้าง response data
    const users = onlineUsers.map((activity) => ({
      id: activity.user.id,
      name: activity.user.displayName || activity.user.email || "ไม่ระบุ",
      email: activity.user.email,
      department: activity.user.department,
      departmentId: activity.user.departmentId,
      departmentSubId: activity.user.departmentSubId,
      departmentSubSubId: activity.user.departmentSubSubId,
      loginAt: activity.loginAt,
      lastActivityAt: activity.lastActivityAt,
    }));

    return NextResponse.json(
      {
        success: true,
        count,
        users,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching online users:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ Online",
      },
      { status: 500 },
    );
  }
}
