import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const profileSelect = {
  id: true,
  displayName: true,
  email: true,
  // legacy text fields (ใช้สำหรับแสดงผลช่วง transition)
  department: true,
  position: true,
  memberOf: true,
  role: true,
  phone: true,
  mobile: true,
  image: true,
  lineUserId: true,
  lineDisplayName: true,
  ldapDisplayName: true,
  // โครงสร้างองค์กรแบบอิง ID จาก HRD
  personTypeId: true,
  positionId: true,
  departmentId: true,
  departmentSubId: true,
  departmentSubSubId: true,
} satisfies Prisma.userSelect;

export type ProfileDTO = Prisma.userGetPayload<{
  select: typeof profileSelect;
}>;

/** ใช้เฉพาะภายใน lib/profile สำหรับ applyProfileUpdate */
type ProfileUpdateData = Record<string, string | number | null>;

function normalizeStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("INVALID_TYPE");
  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function validatePhone(value: string | null, field: "phone" | "mobile"): void {
  if (field === "phone") {
    if (!value) throw new Error("PHONE_REQUIRED");
    const digitCount = (value.match(/\d/g) || []).length;

    if (digitCount < 3) throw new Error("PHONE_INVALID_FORMAT");
  } else {
    if (!value) return;
  }
  const pattern = /^[0-9+\-\s]{3,20}$/;

  if (value && !pattern.test(value)) {
    throw new Error(`${field.toUpperCase()}_INVALID_FORMAT`);
  }
}

function validateDisplayName(value: string | null): void {
  if (!value) throw new Error("DISPLAY_NAME_REQUIRED");
  if (value.trim().length < 2) throw new Error("DISPLAY_NAME_TOO_SHORT");
  if (value.trim().length > 100) throw new Error("DISPLAY_NAME_TOO_LONG");
}

function validateRole(value: string | null): void {
  if (!value) throw new Error("ROLE_REQUIRED");
  if (value !== "user" && value !== "admin") throw new Error("ROLE_INVALID");
}

function normalizeNumericId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const asNumber =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isInteger(asNumber) || asNumber <= 0)
    throw new Error("INVALID_ID_TYPE");

  return asNumber;
}

type HrdIdType =
  | "personType"
  | "position"
  | "department"
  | "departmentSub"
  | "departmentSubSub";

async function assertHrdIdExists(
  type: HrdIdType,
  id: number | null,
): Promise<void> {
  if (id === null) return;
  let count = 0;

  if (type === "personType") {
    count = await prisma.hrd_person_type.count({
      where: { HR_PERSON_TYPE_ID: id },
    });
  } else if (type === "position") {
    count = await prisma.hrd_position.count({ where: { HR_POSITION_ID: id } });
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
    const messages: Record<HrdIdType, string> = {
      personType: "PERSON_TYPE_NOT_FOUND",
      position: "POSITION_NOT_FOUND",
      department: "DEPARTMENT_ID_NOT_FOUND",
      departmentSub: "DEPARTMENT_SUB_ID_NOT_FOUND",
      departmentSubSub: "DEPARTMENT_SUB_ID_NOT_FOUND",
    };

    throw new Error(messages[type]);
  }
}

/**
 * แปลงและตรวจสอบ payload การอัปเดตโปรไฟล์ คืนค่า updateData สำหรับ prisma.user.update
 * throw Error เมื่อ validation ไม่ผ่าน
 */
export async function parseAndValidateProfileUpdate(
  payload: unknown,
): Promise<ProfileUpdateData> {
  if (payload === null || typeof payload !== "object") {
    throw new Error("INVALID_REQUEST");
  }
  const p = payload as Record<string, unknown>;
  const updateData: ProfileUpdateData = {};

  if ("displayName" in p) {
    const normalized = normalizeStringValue(p.displayName);

    validateDisplayName(normalized);
    updateData.displayName = normalized;
  }
  if ("phone" in p) {
    const normalized = normalizeStringValue(p.phone);

    validatePhone(normalized, "phone");
    updateData.phone = normalized;
  }
  if ("mobile" in p) {
    const normalized = normalizeStringValue(p.mobile);

    validatePhone(normalized, "mobile");
    updateData.mobile = normalized;
  }
  if ("role" in p) {
    const normalized = normalizeStringValue(p.role);

    validateRole(normalized);
    updateData.role = normalized;
  }

  const personTypeId =
    "personTypeId" in p ? normalizeNumericId(p.personTypeId) : undefined;
  const positionId =
    "positionId" in p ? normalizeNumericId(p.positionId) : undefined;
  const departmentId =
    "departmentId" in p ? normalizeNumericId(p.departmentId) : undefined;
  const departmentSubId =
    "departmentSubId" in p ? normalizeNumericId(p.departmentSubId) : undefined;
  const departmentSubSubId =
    "departmentSubSubId" in p
      ? normalizeNumericId(p.departmentSubSubId)
      : undefined;

  if ("personTypeId" in p && personTypeId === null)
    throw new Error("PERSON_TYPE_REQUIRED");
  if ("positionId" in p && positionId === null)
    throw new Error("POSITION_REQUIRED");
  if ("departmentId" in p && departmentId === null)
    throw new Error("DEPARTMENT_ID_REQUIRED");
  if ("departmentSubId" in p && departmentSubId === null)
    throw new Error("DEPARTMENT_SUB_ID_REQUIRED");
  if ("departmentSubSubId" in p && departmentSubSubId === null)
    throw new Error("DEPARTMENT_SUB_SUB_ID_REQUIRED");

  await Promise.all([
    "personTypeId" in p
      ? assertHrdIdExists("personType", personTypeId ?? null)
      : Promise.resolve(),
    "positionId" in p
      ? assertHrdIdExists("position", positionId ?? null)
      : Promise.resolve(),
    "departmentId" in p
      ? assertHrdIdExists("department", departmentId ?? null)
      : Promise.resolve(),
    "departmentSubId" in p
      ? assertHrdIdExists("departmentSub", departmentSubId ?? null)
      : Promise.resolve(),
    "departmentSubSubId" in p
      ? assertHrdIdExists("departmentSubSub", departmentSubSubId ?? null)
      : Promise.resolve(),
  ]);

  if ("personTypeId" in p) updateData.personTypeId = personTypeId ?? null;
  if ("positionId" in p) updateData.positionId = positionId ?? null;
  if ("departmentId" in p) updateData.departmentId = departmentId ?? null;
  if ("departmentSubId" in p)
    updateData.departmentSubId = departmentSubId ?? null;
  if ("departmentSubSubId" in p) {
    updateData.departmentSubSubId = departmentSubSubId ?? null;
    if (departmentSubSubId != null) {
      const row = await prisma.hrd_department_sub_sub.findUnique({
        where: { HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId },
        select: { HR_DEPARTMENT_SUB_SUB_NAME: true },
      });

      updateData.department = row?.HR_DEPARTMENT_SUB_SUB_NAME ?? null;
    } else {
      updateData.department = null;
    }
  }

  return updateData;
}

/**
 * อัปเดต user ตาม updateData แล้วคืนค่า profile ล่าสุด
 */
export async function applyProfileUpdate(
  userId: string,
  updateData: ProfileUpdateData,
): Promise<ProfileDTO | null> {
  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return getUserProfile(userId);
}

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
}
