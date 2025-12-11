import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
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
  // สำหรับโทรศัพท์ภายใน (phone) ต้องบังคับกรอก
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

function normalizeNumericId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const asNumber =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isInteger(asNumber) || asNumber <= 0) {
    throw new Error("INVALID_ID_TYPE");
  }

  return asNumber;
}

async function assertHrdIdExists(
  type:
    | "personType"
    | "position"
    | "department"
    | "departmentSub"
    | "departmentSubSub",
  id: number | null,
) {
  if (id === null) {
    return;
  }

  let count = 0;

  if (type === "personType") {
    count = await prisma.hrd_person_type.count({
      where: { HR_PERSON_TYPE_ID: id },
    });
  } else if (type === "position") {
    count = await prisma.hrd_position.count({
      where: { HR_POSITION_ID: id },
    });
  } else if (type === "department") {
    count = await prisma.hrd_department.count({
      where: { HR_DEPARTMENT_ID: id },
    });
  } else if (type === "departmentSub") {
    count = await prisma.hrd_department_sub.count({
      where: { HR_DEPARTMENT_SUB_ID: id },
    });
  } else if (type === "departmentSubSub") {
    count = await prisma.hrd_department_sub_sub.count({
      where: { HR_DEPARTMENT_SUB_SUB_ID: id },
    });
  }

  if (count === 0) {
    if (type === "personType") {
      throw new Error("PERSON_TYPE_NOT_FOUND");
    }
    if (type === "position") {
      throw new Error("POSITION_NOT_FOUND");
    }
    if (type === "department") {
      throw new Error("DEPARTMENT_ID_NOT_FOUND");
    }
    if (type === "departmentSub") {
      throw new Error("DEPARTMENT_SUB_ID_NOT_FOUND");
    }
    if (type === "departmentSubSub") {
      throw new Error("DEPARTMENT_SUB_SUB_ID_NOT_FOUND");
    }
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

  const updateData: Record<string, string | number | null> = {};

  try {
    // ฟิลด์ข้อความพื้นฐาน
    if ("displayName" in payload) {
      const normalized = normalizeStringValue(payload.displayName);

      validateDisplayName(normalized);
      updateData.displayName = normalized;
    }

    if ("phone" in payload) {
      const normalized = normalizeStringValue(payload.phone);

      validatePhone(normalized, "phone");
      updateData.phone = normalized;
    }

    if ("mobile" in payload) {
      const normalized = normalizeStringValue(payload.mobile);

      validatePhone(normalized, "mobile");
      updateData.mobile = normalized;
    }

    if ("role" in payload) {
      const normalized = normalizeStringValue(payload.role);

      validateRole(normalized);
      updateData.role = normalized;
    }

    // ฟิลด์โครงสร้างองค์กร (ID จาก HRD)
    const personTypeId =
      "personTypeId" in payload
        ? normalizeNumericId(payload.personTypeId)
        : undefined;
    const positionId =
      "positionId" in payload
        ? normalizeNumericId(payload.positionId)
        : undefined;
    const departmentId =
      "departmentId" in payload
        ? normalizeNumericId(payload.departmentId)
        : undefined;
    const departmentSubId =
      "departmentSubId" in payload
        ? normalizeNumericId(payload.departmentSubId)
        : undefined;
    const departmentSubSubId =
      "departmentSubSubId" in payload
        ? normalizeNumericId(payload.departmentSubSubId)
        : undefined;

    // กติกา required ขั้นพื้นฐาน (ใช้เมื่อ client ส่ง field นั้นมา)
    if ("personTypeId" in payload && personTypeId === null) {
      throw new Error("PERSON_TYPE_REQUIRED");
    }
    if ("positionId" in payload && positionId === null) {
      throw new Error("POSITION_REQUIRED");
    }
    if ("departmentId" in payload && departmentId === null) {
      throw new Error("DEPARTMENT_ID_REQUIRED");
    }
    if ("departmentSubId" in payload && departmentSubId === null) {
      throw new Error("DEPARTMENT_SUB_ID_REQUIRED");
    }
    if ("departmentSubSubId" in payload && departmentSubSubId === null) {
      throw new Error("DEPARTMENT_SUB_SUB_ID_REQUIRED");
    }

    // ตรวจสอบว่า ID มีอยู่จริงในตาราง HRD
    await Promise.all([
      "personTypeId" in payload
        ? assertHrdIdExists("personType", personTypeId ?? null)
        : Promise.resolve(),
      "positionId" in payload
        ? assertHrdIdExists("position", positionId ?? null)
        : Promise.resolve(),
      "departmentId" in payload
        ? assertHrdIdExists("department", departmentId ?? null)
        : Promise.resolve(),
      "departmentSubId" in payload
        ? assertHrdIdExists("departmentSub", departmentSubId ?? null)
        : Promise.resolve(),
      "departmentSubSubId" in payload
        ? assertHrdIdExists("departmentSubSub", departmentSubSubId ?? null)
        : Promise.resolve(),
    ]);

    if ("personTypeId" in payload) {
      updateData.personTypeId = personTypeId ?? null;
    }
    if ("positionId" in payload) {
      updateData.positionId = positionId ?? null;
    }
    if ("departmentId" in payload) {
      updateData.departmentId = departmentId ?? null;
    }
    if ("departmentSubId" in payload) {
      updateData.departmentSubId = departmentSubId ?? null;
    }
    if ("departmentSubSubId" in payload) {
      updateData.departmentSubSubId = departmentSubSubId ?? null;

      // อัพเดทฟิลด์ department (legacy) จากชื่อหน่วยงานที่ดึงจาก departmentSubSubId
      if (departmentSubSubId !== null && departmentSubSubId !== undefined) {
        const departmentSubSub = await prisma.hrd_department_sub_sub.findUnique(
          {
            where: {
              HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
            },
            select: {
              HR_DEPARTMENT_SUB_SUB_NAME: true,
            },
          },
        );

        if (departmentSubSub?.HR_DEPARTMENT_SUB_SUB_NAME) {
          updateData.department = departmentSubSub.HR_DEPARTMENT_SUB_SUB_NAME;
        } else {
          updateData.department = null;
        }
      } else {
        // ถ้า departmentSubSubId เป็น null ให้ตั้ง department เป็น null ด้วย
        updateData.department = null;
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
