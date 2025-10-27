import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// กำหนด base URL ของ API Gateway จาก env และตัดเครื่องหมาย / ท้ายออกเพื่อป้องกันซ้ำซ้อน
const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

// ส่งออกไฟล์ ZIP จาก batch โดย proxy ไปยัง API Gateway พร้อมสตรีม binary กลับมาที่ client
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
    const { id } = await context.params;

    // อ่าน body JSON ที่มี exportType
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

    const endpoint = `${baseUrl}/api-gateway/revenue/batches/${encodeURIComponent(
      id,
    )}/export`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${signedToken}`,
    };

    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: hasBody ? forwardBody : undefined,
      // สำคัญ: ต้องไม่อ่านเป็น text/json แต่ส่งสตรีมต่อกลับไป
    });

    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!res.ok) {
      // พยายามดึงข้อความ error จากปลายทาง
      let errorPayload: any = { success: false };
      try {
        errorPayload = await res.json();
      } catch {
        const txt = await res.text().catch(() => "");
        if (txt) errorPayload = { success: false, error: txt };
      }

      return NextResponse.json(errorPayload, { status: res.status });
    }

    // สร้าง Response ใหม่ที่สตรีม body (ZIP) กลับไป พร้อม header ที่จำเป็น
    const contentType = res.headers.get("content-type") || "application/zip";
    const contentDisposition =
      res.headers.get("content-disposition") ||
      `attachment; filename="export_${id}.zip"`;
    const contentLength = res.headers.get("content-length") || undefined;

    return new Response(res.body, {
      status: 200,
      headers: new Headers({
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      }),
    });
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
