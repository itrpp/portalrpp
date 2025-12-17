import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import jwt from "jsonwebtoken";

import { authOptions } from "@/app/api/auth/authOptions";

// กำหนด base URL ของ API Gateway จาก env และตัดเครื่องหมาย / ท้ายออกเพื่อป้องกันซ้ำซ้อน
const baseUrl = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "").replace(
  /\/$/,
  "",
);

/**
 * แปลงรูปแบบ HN/AN จาก "123456/68" หรือ "123456-68" เป็น "680123456"
 * หมายเลขคนไข้ / หรือ - ปี -> เอาปีขึ้นก่อน และทั้งหมดรวมแล้วต้องได้ 9 หลัก
 * ตัวอย่าง: "123456/68" -> "680123456" (ปี 68 + HN 0123456 = 9 หลัก)
 * ตัวอย่าง: "123456-68" -> "680123456" (ปี 68 + AN 0123456 = 9 หลัก)
 * @returns Object with convertedValue and type ('hn' | 'an')
 */
function convertHNANFormat(patientHN: string): {
  convertedValue: string;
  type: "hn" | "an";
} {
  if (!patientHN) {
    return { convertedValue: "", type: "hn" };
  }

  const trimmed = patientHN.trim();
  let type: "hn" | "an" = "hn";
  let separator = "/";
  let parts: string[];

  // ตรวจสอบว่าเป็น HN (/) หรือ AN (-)
  if (trimmed.includes("/")) {
    type = "hn";
    separator = "/";
    parts = trimmed.split("/");
  } else if (trimmed.includes("-")) {
    type = "an";
    separator = "-";
    parts = trimmed.split("-");
  } else {
    // ถ้าไม่มี separator ให้ส่งคืนค่าเดิม
    return { convertedValue: trimmed, type: "hn" };
  }

  if (parts.length === 2) {
    // มีทั้ง HN/AN และ ปี
    const code = parts[0].trim();
    const year = parts[1].trim();

    // เอาปีขึ้นก่อน (2 หลัก)
    // HN/AN (6 หลัก) เติม 0 หน้าให้เป็น 7 หลัก
    const paddedCode = code.padStart(7, "0");

    // รวมกันให้ได้ 9 หลัก: ปี (2 หลัก) + HN/AN ที่เติม 0 แล้ว (7 หลัก)
    return {
      convertedValue: `${year}${paddedCode}`,
      type,
    };
  } else if (parts.length === 1) {
    // มีแค่ HN/AN หรือ ปี อย่างเดียว
    // ถ้ามีแค่ HN/AN ให้เติม 0 หน้าให้เป็น 9 หลัก
    const value = parts[0].trim();

    return {
      convertedValue: value.padStart(9, "0"),
      type,
    };
  }

  // ถ้ารูปแบบไม่ถูกต้อง ให้ส่งคืนค่าเดิม
  return { convertedValue: trimmed, type };
}

/**
 * POST /api/porter/patient
 * ค้นหาข้อมูลผู้ป่วยจาก EPHIS API
 */
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
    const body = await request.json();
    const { patientHN } = body;

    if (!patientHN) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_PARAMETER",
          message: "patientHN is required",
        },
        { status: 400 },
      );
    }

    // แปลงรูปแบบ HN/AN และตรวจสอบประเภท
    const { convertedValue, type } = convertHNANFormat(patientHN);

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

    // เรียก API Gateway endpoint
    const endpoint = `${baseUrl}/api-gateway/ephis/patient`;

    // ส่งเฉพาะประเภทที่ตรวจพบ (hn หรือ an) ไม่ส่งทั้งสองอย่าง
    const requestBody: { hn?: string; an?: string } = {};

    if (type === "hn") {
      requestBody.hn = convertedValue;
    } else {
      requestBody.an = convertedValue;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signedToken}`,
      },
      body: JSON.stringify(requestBody),
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
          { success: false, error: "EPHIS_SERVICE_UNAVAILABLE" },
          { status: 503 },
        );
      }

      const errorData = await res.json().catch(() => ({}));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "PATIENT_FETCH_FAILED",
          message: errorData.message || `HTTP ${res.status} ${res.statusText}`,
        },
        { status: res.status },
      );
    }

    // อ่าน response data
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

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
