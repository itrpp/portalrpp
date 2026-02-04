/**
 * HRD service layer
 * รวม logic การดึง/สร้างกลุ่มภารกิจ (departments) และ validation
 * ให้ API route ทำแค่ auth + เรียก service + ส่ง response
 */

import type { Department } from "@/types/hrd";

import { prisma } from "@/lib/prisma";

const departmentSelect = {
  HR_DEPARTMENT_ID: true,
  HR_DEPARTMENT_NAME: true,
  ACTIVE: true,
  created_at: true,
  updated_at: true,
} as const;

type DepartmentRow = {
  HR_DEPARTMENT_ID: number;
  HR_DEPARTMENT_NAME: string | null;
  ACTIVE: string | null;
  created_at: Date | null;
  updated_at: Date | null;
};

function mapDepartmentToItem(row: DepartmentRow): Department {
  return {
    id: row.HR_DEPARTMENT_ID,
    name: row.HR_DEPARTMENT_NAME ?? "",
    active: String(row.ACTIVE) === "True",
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

/**
 * ดึงรายการกลุ่มภารกิจ (filter ตาม query ถ้ามี)
 */
export async function listDepartments(query?: string): Promise<Department[]> {
  const where: { ACTIVE?: "True"; HR_DEPARTMENT_NAME?: { contains: string } } =
    {
      ACTIVE: "True",
    };

  if (query != null && query.trim().length > 0) {
    where.HR_DEPARTMENT_NAME = { contains: query.trim() };
  }

  const items = await prisma.hrd_department.findMany({
    where,
    select: departmentSelect,
    orderBy: { HR_DEPARTMENT_NAME: "asc" },
  });

  return items.map((row) =>
    mapDepartmentToItem({
      ...row,
      ACTIVE: row.ACTIVE as string | null,
    }),
  );
}

export class CreateDepartmentError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION_ERROR" | "DUPLICATE_NAME",
  ) {
    super(message);
    this.name = "CreateDepartmentError";
  }
}

/**
 * สร้างกลุ่มภารกิจใหม่ (validate ชื่อ, ตรวจชื่อซ้ำ, สร้าง)
 */
export async function createDepartment(
  name: string,
  active: boolean = true,
): Promise<Department> {
  const trimmedName = typeof name === "string" ? name.trim() : "";

  if (trimmedName.length === 0) {
    throw new CreateDepartmentError(
      "กรุณากรอกชื่อกลุ่มภารกิจ",
      "VALIDATION_ERROR",
    );
  }

  const existing = await prisma.hrd_department.findFirst({
    where: { HR_DEPARTMENT_NAME: { equals: trimmedName } },
  });

  if (existing) {
    throw new CreateDepartmentError(
      "ชื่อกลุ่มภารกิจนี้มีอยู่ในระบบแล้ว",
      "DUPLICATE_NAME",
    );
  }

  const newRow = await prisma.hrd_department.create({
    data: {
      HR_DEPARTMENT_NAME: trimmedName,
      ACTIVE: active ? "True" : "False",
    },
    select: departmentSelect,
  });

  return mapDepartmentToItem({
    ...newRow,
    ACTIVE: newRow.ACTIVE as string | null,
  });
}
