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
  const query = searchParams.get("q")?.trim() ?? "";

  const where: any = {
    ACTIVE: "True",
  };

  if (query.length > 0) {
    where.HR_DEPARTMENT_NAME = {
      contains: query,
    };
  }

  const items = await prisma.hrd_department.findMany({
    where,
    select: {
      HR_DEPARTMENT_ID: true,
      HR_DEPARTMENT_NAME: true,
      ACTIVE: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      HR_DEPARTMENT_NAME: "asc",
    },
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_DEPARTMENT_ID,
      name: item.HR_DEPARTMENT_NAME ?? "",
      active: item.ACTIVE === "True",
      createdAt: item.created_at?.toISOString(),
      updatedAt: item.updated_at?.toISOString(),
    })),
  });
}

/**
 * POST /api/hrd/departments
 * สร้างกลุ่มภารกิจใหม่
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
    const { name, active } = requestData;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณากรอกชื่อกลุ่มภารกิจ",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบชื่อซ้ำ
    const existing = await prisma.hrd_department.findFirst({
      where: {
        HR_DEPARTMENT_NAME: {
          equals: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: "ชื่อกลุ่มภารกิจนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    // สร้างข้อมูลใหม่
    const newDepartment = await prisma.hrd_department.create({
      data: {
        HR_DEPARTMENT_NAME: name.trim(),
        ACTIVE: active !== undefined ? (active ? "True" : "False") : "True",
      },
      select: {
        HR_DEPARTMENT_ID: true,
        HR_DEPARTMENT_NAME: true,
        ACTIVE: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newDepartment.HR_DEPARTMENT_ID,
          name: newDepartment.HR_DEPARTMENT_NAME ?? "",
          active: newDepartment.ACTIVE === "True",
          createdAt: newDepartment.created_at?.toISOString(),
          updatedAt: newDepartment.updated_at?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating department:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างกลุ่มภารกิจ",
      },
      { status: 500 },
    );
  }
}
