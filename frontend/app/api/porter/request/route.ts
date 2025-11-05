import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// กำหนด base URL ของ API Gateway จาก env และตัดเครื่องหมาย / ท้ายออกเพื่อป้องกันซ้ำซ้อน
const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

export async function POST(request: Request) {
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

    // อ่านข้อมูลจาก request body
    const requestData = await request.json();

    // เตรียมส่งต่อไปยัง API Gateway
    // สร้าง JWT เพื่อยืนยันตัวตนกับ API Gateway
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

    // เพิ่ม requesterUserId จาก session
    const payload = {
      ...requestData,
      requesterUserId: session.user.id,
    };

    const endpoint = `${baseUrl}/api-gateway/porter/request`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signedToken}`,
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!res.ok) {
      if (res.status === 503) {
        return NextResponse.json(
          { success: false, error: "PORTER_SERVICE_UNAVAILABLE" },
          { status: 503 },
        );
      }

      // อ่าน error message จาก response
      let errorMessage = `Request failed with status ${res.status}`;

      try {
        const errorData = await res.json();

        errorMessage = errorData.message || errorMessage;
      } catch {
        // ถ้า parse JSON ไม่ได้ ให้ใช้ default message
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: res.status },
      );
    }

    const data = await res.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    // จัดการกรณีเครือข่ายผิดพลาดจาก fetch
    if (
      error?.name === "TypeError" &&
      String(error?.message || "").includes("fetch")
    ) {
      return NextResponse.json(
        { success: false, error: "API_GATEWAY_UNREACHABLE" },
        { status: 503 },
      );
    }

    // Log error for debugging (in production, use proper logging service)
    // eslint-disable-next-line no-console
    console.error("Error creating porter request:", error);

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
