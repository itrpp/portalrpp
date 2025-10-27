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

    // อ่าน query params (เช่น batchId)
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // อ่าน multipart/form-data ที่ถูกส่งเข้ามา
    const incomingFormData = await request.formData();

    // เตรียมส่งต่อไปยัง API Gateway โดยคงรูปแบบ multipart เดิม
    // หมายเหตุ: อย่าตั้ง Header Content-Type เอง ให้เบราว์เซอร์กำหนด boundary ให้อัตโนมัติ
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

    const endpoint = `${baseUrl}/api-gateway/revenue/upload${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${signedToken}`,
      },
      body: incomingFormData,
      // ส่งต่อคุ้กกี้หากจำเป็น
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

    // // พยายาม parse เป็น JSON ถ้าไม่ใช่ให้ส่งเป็นข้อความ
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

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
