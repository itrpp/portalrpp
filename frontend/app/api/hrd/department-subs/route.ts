import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const departmentIdParam = searchParams.get("departmentId");
  const query = searchParams.get("q")?.trim() ?? "";

  const where: any = {
    ACTIVE: "True",
  };

  // ถ้ามี departmentId ให้ filter
  if (departmentIdParam) {
    const departmentId = Number.parseInt(departmentIdParam, 10);

    if (Number.isInteger(departmentId) && departmentId > 0) {
      where.HR_DEPARTMENT_ID = String(departmentId);
    }
  }

  if (query.length > 0) {
    where.HR_DEPARTMENT_SUB_NAME = {
      contains: query,
    };
  }

  const items = await prisma.hrd_department_sub.findMany({
    where,
    select: {
      HR_DEPARTMENT_SUB_ID: true,
      HR_DEPARTMENT_SUB_NAME: true,
      HR_DEPARTMENT_ID: true,
      ACTIVE: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      HR_DEPARTMENT_SUB_NAME: "asc",
    },
  });

  // ดึงชื่อ department สำหรับแสดงผล
  const departmentIds = [
    ...new Set(items.map((item) => item.HR_DEPARTMENT_ID).filter(Boolean)),
  ];
  const departments = await prisma.hrd_department.findMany({
    where: {
      HR_DEPARTMENT_ID: {
        in: departmentIds.map((id) => Number.parseInt(id || "0", 10)),
      },
    },
    select: {
      HR_DEPARTMENT_ID: true,
      HR_DEPARTMENT_NAME: true,
    },
  });

  const departmentMap = new Map(
    departments.map((d) => [d.HR_DEPARTMENT_ID, d.HR_DEPARTMENT_NAME ?? ""]),
  );

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_DEPARTMENT_SUB_ID,
      name: item.HR_DEPARTMENT_SUB_NAME ?? "",
      departmentId: Number.parseInt(item.HR_DEPARTMENT_ID || "0", 10),
      departmentName: departmentMap.get(
        Number.parseInt(item.HR_DEPARTMENT_ID || "0", 10),
      ),
      active: item.ACTIVE === "True",
      createdAt: item.created_at?.toISOString(),
      updatedAt: item.updated_at?.toISOString(),
    })),
  });
}

/**
 * POST /api/hrd/department-subs
 * สร้างกลุ่มงานใหม่
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const requestData = await request.json();
    const { name, departmentId, active } = requestData;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณากรอกชื่อกลุ่มงาน",
        },
        { status: 400 },
      );
    }

    if (!departmentId || typeof departmentId !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณาเลือกกลุ่มภารกิจ",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบ departmentId มีอยู่จริง
    const department = await prisma.hrd_department.findUnique({
      where: {
        HR_DEPARTMENT_ID: departmentId,
      },
    });

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          error: "DEPARTMENT_NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มภารกิจ",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบชื่อซ้ำใน department เดียวกัน
    const existing = await prisma.hrd_department_sub.findFirst({
      where: {
        HR_DEPARTMENT_ID: String(departmentId),
        HR_DEPARTMENT_SUB_NAME: {
          equals: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: "ชื่อกลุ่มงานนี้มีอยู่ในกลุ่มภารกิจนี้แล้ว",
        },
        { status: 409 },
      );
    }

    // สร้างข้อมูลใหม่
    const newDepartmentSub = await prisma.hrd_department_sub.create({
      data: {
        HR_DEPARTMENT_SUB_NAME: name.trim(),
        HR_DEPARTMENT_ID: String(departmentId),
        ACTIVE: active !== undefined ? (active ? "True" : "False") : "True",
      },
      select: {
        HR_DEPARTMENT_SUB_ID: true,
        HR_DEPARTMENT_SUB_NAME: true,
        HR_DEPARTMENT_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newDepartmentSub.HR_DEPARTMENT_SUB_ID,
          name: newDepartmentSub.HR_DEPARTMENT_SUB_NAME ?? "",
          departmentId: Number.parseInt(
            newDepartmentSub.HR_DEPARTMENT_ID || "0",
            10,
          ),
          departmentName: department.HR_DEPARTMENT_NAME ?? "",
          active: newDepartmentSub.ACTIVE === "True",
          createdAt: newDepartmentSub.created_at?.toISOString(),
          updatedAt: newDepartmentSub.updated_at?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating department sub:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างกลุ่มงาน",
      },
      { status: 500 },
    );
  }
}
