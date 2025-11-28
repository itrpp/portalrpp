import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/profile";

function normalizeStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("INVALID_TYPE");
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function validatePhone(value: string | null, field: string) {
  // สำหรับโทรศัพท์สำนักงาน (phone) ต้องบังคับกรอก
  if (field === "phone") {
    if (!value) {
      throw new Error("PHONE_REQUIRED");
    }

    // นับจำนวนตัวเลขในค่า
    const digitCount = (value.match(/\d/g) || []).length;

    // ตรวจสอบว่ามีตัวเลขอย่างน้อย 3 ตัว
    if (digitCount < 3) {
      throw new Error("PHONE_INVALID_FORMAT");
    }
  } else {
    // สำหรับ mobile ไม่บังคับ
    if (!value) {
      return;
    }
  }

  // ตรวจสอบรูปแบบทั่วไป (อนุญาตตัวเลข, +, -, และช่องว่าง)
  const pattern = /^[0-9+\-\s]{3,20}$/;

  if (!pattern.test(value)) {
    throw new Error(`${field.toUpperCase()}_INVALID_FORMAT`);
  }
}

export async function GET() {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const user = await getUserProfile(session.user.id);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: user });
}

function validateDisplayName(value: string | null) {
  if (!value) {
    throw new Error("DISPLAY_NAME_REQUIRED");
  }

  if (value.trim().length < 2) {
    throw new Error("DISPLAY_NAME_TOO_SHORT");
  }

  if (value.trim().length > 100) {
    throw new Error("DISPLAY_NAME_TOO_LONG");
  }
}

function validateRole(value: string | null) {
  if (!value) {
    throw new Error("ROLE_REQUIRED");
  }

  if (value !== "user" && value !== "admin") {
    throw new Error("ROLE_INVALID");
  }
}

function validateDepartment(value: string | null) {
  if (!value) {
    throw new Error("DEPARTMENT_REQUIRED");
  }

  if (value.trim().length > 100) {
    throw new Error("DEPARTMENT_TOO_LONG");
  }
}

function validatePosition(value: string | null) {
  if (!value) {
    throw new Error("POSITION_REQUIRED");
  }

  if (value.trim().length > 100) {
    throw new Error("POSITION_TOO_LONG");
  }
}

export async function PUT(request: Request) {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const payload = await request.json();
  const editableFields = [
    "displayName",
    "phone",
    "mobile",
    "department",
    "position",
    "role",
  ] as const;
  const updateData: Record<string, string | null> = {};

  try {
    for (const field of editableFields) {
      if (field in payload) {
        const normalized = normalizeStringValue(payload[field]);

        if (field === "displayName") {
          validateDisplayName(normalized);
          updateData[field] = normalized;
        } else if (field === "phone" || field === "mobile") {
          validatePhone(normalized, field);
          updateData[field] = normalized;
        } else if (field === "role") {
          validateRole(normalized);
          updateData[field] = normalized;
        } else if (field === "department") {
          validateDepartment(normalized);
          updateData[field] = normalized;
        } else if (field === "position") {
          validatePosition(normalized);
          updateData[field] = normalized;
        }
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, error: "NO_MUTATIONS" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  const user = await getUserProfile(session.user.id);

  return NextResponse.json({
    success: true,
    data: user,
  });
}
