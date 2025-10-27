import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// กำหนด base URL ของ API Gateway จาก env และตัดเครื่องหมาย / ท้ายออกเพื่อป้องกันซ้ำซ้อน
const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

// ประมวลผล batch สำหรับ IPD: ส่งต่อไปยัง API Gateway
export async function POST(
  request: Request,
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

    // ต้อง await params ตามข้อกำหนดของ Next.js
    const { id: _id } = await context.params; // ใช้ชื่อขึ้นต้น _ เพื่อหลีกเลี่ยง unused-var

    const endpoint = `${baseUrl}/api-gateway/revenue/batches/${encodeURIComponent(
      _id,
    )}/process-opd`;

    // สร้าง JWT สำหรับ API Gateway จากข้อมูลใน session
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

    // อ่าน body ถ้ามี (รองรับกรณีไม่มี body)
    let forwardBody: string | undefined = undefined;
    let hasBody = false;

    try {
      const rawText = await request.text();

      if (rawText && rawText.trim().length > 0) {
        forwardBody = rawText;
        hasBody = true;
      }
    } catch {
      // ไม่มี body หรืออ่านไม่ได้ ให้ข้ามไป
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${signedToken}`,
    };

    // ตั้ง Content-Type เฉพาะเมื่อมี body เป็น JSON ที่อ่านมาแล้ว
    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: hasBody ? forwardBody : undefined,
      credentials: "include",
    });

    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!res.ok) {
      if (res.status === 504) {
        return NextResponse.json(
          { success: false, error: "REVENUE_SERVICE_UNAVAILABLE" },
          { status: 504 },
        );
      }

      return NextResponse.json(
        { success: false, error: `${res.status} ${res.statusText}` },
        { status: res.status },
      );
    }

    // พยายาม parse เป็น JSON ถ้าไม่ใช่ให้ส่งเป็นข้อความ
    const text = await res.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    return NextResponse.json(data ?? { success: true }, { status: 200 });
  } catch (error: any) {
    if (
      error?.name === "TypeError" &&
      String(error?.message || "").includes("fetch")
    ) {
      return NextResponse.json(
        { success: false, error: "API_GATEWAY_UNREACHABLE" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
