import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// กำหนด base URL ของ API Gateway จาก env และตัดเครื่องหมาย / ท้ายออกเพื่อป้องกันซ้ำซ้อน
const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

export async function GET(request: Request) {
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

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;

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

    // สร้าง query string สำหรับส่งต่อไปยัง API Gateway
    const queryString = searchParams.toString();
    const endpoint = `${baseUrl}/api-gateway/porter/requests${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${signedToken}`,
      },
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
  } catch (error: unknown) {
    // จัดการกรณีเครือข่ายผิดพลาดจาก fetch
    if (
      error instanceof Error &&
      error.name === "TypeError" &&
      String(error.message || "").includes("fetch")
    ) {
      return NextResponse.json(
        { success: false, error: "API_GATEWAY_UNREACHABLE" },
        { status: 503 },
      );
    }

    // Log error for debugging (in production, use proper logging service)
    // eslint-disable-next-line no-console
    console.error("Error fetching porter requests:", error);

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

