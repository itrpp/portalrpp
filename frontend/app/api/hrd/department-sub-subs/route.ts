import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const departmentSubIdParam = searchParams.get("departmentSubId");
  const query = searchParams.get("q")?.trim() ?? "";

  const where: any = {
    ACTIVE: "True",
  };

  // ถ้ามี departmentSubId ให้ filter
  if (departmentSubIdParam) {
    const departmentSubId = Number.parseInt(departmentSubIdParam, 10);

    if (Number.isInteger(departmentSubId) && departmentSubId > 0) {
      where.HR_DEPARTMENT_SUB_ID = String(departmentSubId);
    }
  }

  if (query.length > 0) {
    where.HR_DEPARTMENT_SUB_SUB_NAME = {
      contains: query,
    };
  }

  const items = await prisma.hrd_department_sub_sub.findMany({
    where,
    select: {
      HR_DEPARTMENT_SUB_SUB_ID: true,
      HR_DEPARTMENT_SUB_SUB_NAME: true,
      HR_DEPARTMENT_SUB_ID: true,
      ACTIVE: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      HR_DEPARTMENT_SUB_SUB_NAME: "asc",
    },
  });

  // ดึงชื่อ department_sub สำหรับแสดงผล
  const departmentSubIds = [
    ...new Set(items.map((item) => item.HR_DEPARTMENT_SUB_ID).filter(Boolean)),
  ];
  const departmentSubs = await prisma.hrd_department_sub.findMany({
    where: {
      HR_DEPARTMENT_SUB_ID: {
        in: departmentSubIds.map((id) => Number.parseInt(id || "0", 10)),
      },
    },
    select: {
      HR_DEPARTMENT_SUB_ID: true,
      HR_DEPARTMENT_SUB_NAME: true,
    },
  });

  const departmentSubMap = new Map(
    departmentSubs.map((d) => [
      d.HR_DEPARTMENT_SUB_ID,
      d.HR_DEPARTMENT_SUB_NAME ?? "",
    ]),
  );

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_DEPARTMENT_SUB_SUB_ID,
      name: item.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
      departmentSubId: Number.parseInt(item.HR_DEPARTMENT_SUB_ID || "0", 10),
      departmentSubName: departmentSubMap.get(
        Number.parseInt(item.HR_DEPARTMENT_SUB_ID || "0", 10),
      ),
      active: item.ACTIVE === "True",
      createdAt: item.created_at?.toISOString(),
      updatedAt: item.updated_at?.toISOString(),
    })),
  });
}

/**
 * POST /api/hrd/department-sub-subs
 * สร้างหน่วยงานใหม่
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

    const requestData = await request.json();
    const { name, departmentSubId, active } = requestData;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณากรอกชื่อหน่วยงาน",
        },
        { status: 400 },
      );
    }

    if (!departmentSubId || typeof departmentSubId !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณาเลือกกลุ่มงาน",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบ departmentSubId มีอยู่จริง
    const departmentSub = await prisma.hrd_department_sub.findUnique({
      where: {
        HR_DEPARTMENT_SUB_ID: departmentSubId,
      },
    });

    if (!departmentSub) {
      return NextResponse.json(
        {
          success: false,
          error: "DEPARTMENT_SUB_NOT_FOUND",
          message: "ไม่พบข้อมูลกลุ่มงาน",
        },
        { status: 404 },
      );
    }

    // ตรวจสอบชื่อซ้ำใน department_sub เดียวกัน
    const existing = await prisma.hrd_department_sub_sub.findFirst({
      where: {
        HR_DEPARTMENT_SUB_ID: String(departmentSubId),
        HR_DEPARTMENT_SUB_SUB_NAME: {
          equals: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: "ชื่อหน่วยงานนี้มีอยู่ในกลุ่มงานนี้แล้ว",
        },
        { status: 409 },
      );
    }

    // สร้างข้อมูลใหม่
    const newDepartmentSubSub = await prisma.hrd_department_sub_sub.create({
      data: {
        HR_DEPARTMENT_SUB_SUB_NAME: name.trim(),
        HR_DEPARTMENT_SUB_ID: String(departmentSubId),
        ACTIVE: active !== undefined ? (active ? "True" : "False") : "True",
      },
      select: {
        HR_DEPARTMENT_SUB_SUB_ID: true,
        HR_DEPARTMENT_SUB_SUB_NAME: true,
        HR_DEPARTMENT_SUB_ID: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newDepartmentSubSub.HR_DEPARTMENT_SUB_SUB_ID,
          name: newDepartmentSubSub.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
          departmentSubId: Number.parseInt(
            newDepartmentSubSub.HR_DEPARTMENT_SUB_ID || "0",
            10,
          ),
          departmentSubName: departmentSub.HR_DEPARTMENT_SUB_NAME ?? "",
          active: newDepartmentSubSub.ACTIVE === "True",
          createdAt: newDepartmentSubSub.created_at?.toISOString(),
          updatedAt: newDepartmentSubSub.updated_at?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating department sub sub:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างหน่วยงาน",
      },
      { status: 500 },
    );
  }
}
