import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/authOptions";

const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

// ดึงรายการไฟล์ของ batch ตาม ID โดยส่งต่อคำขอไปยัง API Gateway
export async function GET(
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

    const { id: _batchId } = await context.params; // ต้อง await params ตามข้อกำหนดของ Next.js; ใช้ชื่อขึ้นต้น _ เพื่อหลีกเลี่ยง unused-var

    const { searchParams } = new URL(request.url);
    const endpoint = `${baseUrl}/api-gateway/revenue/batches/${_batchId}/files${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    // สร้าง JWT สำหรับ API Gateway จากข้อมูลใน session
    const jwtSecret =
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
    const signedToken = jwt.sign(
      {
        sub: session.user.id,
        department: session.user.department,
        position: session.user.position,
        memberOf: session.user.memberOf,
        role: session.user.role,
      },
      jwtSecret,
      { expiresIn: "15m" },
    );

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signedToken}`,
      },
      credentials: "include",
    });

    if (res.status === 401) {
      return NextResponse.json(
        {
          success: false,
          data: {
            batch: null,
            files: [],
            pagination: { page: 1, limit: 0, totalPages: 0, totalItems: 0 },
          },
          error: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    if (!res.ok) {
      if (res.status === 504) {
        return NextResponse.json(
          {
            success: false,
            data: {
              batch: null,
              files: [],
              pagination: { page: 1, limit: 0, totalPages: 0, totalItems: 0 },
            },
            error: "REVENUE_SERVICE_UNAVAILABLE",
          },
          { status: 504 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          data: {
            batch: null,
            files: [],
            pagination: { page: 1, limit: 0, totalPages: 0, totalItems: 0 },
          },
          error: `${res.status} ${res.statusText}`,
        },
        { status: res.status },
      );
    }

    const data = await res.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    if (
      error?.name === "TypeError" &&
      String(error?.message || "").includes("fetch")
    ) {
      return NextResponse.json(
        {
          success: false,
          data: {
            batch: null,
            files: [],
            pagination: { page: 1, limit: 0, totalPages: 0, totalItems: 0 },
          },
          error: "API_GATEWAY_UNREACHABLE",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: {
          batch: null,
          files: [],
          pagination: { page: 1, limit: 0, totalPages: 0, totalItems: 0 },
        },
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
