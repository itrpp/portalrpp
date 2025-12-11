import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

  const where =
    query.length > 0
      ? {
          HR_PERSON_TYPE_NAME: {
            contains: query,
          },
        }
      : {};

  const items = await prisma.hrd_person_type.findMany({
    where,
    select: {
      HR_PERSON_TYPE_ID: true,
      HR_PERSON_TYPE_NAME: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      HR_PERSON_TYPE_NAME: "asc",
    },
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_PERSON_TYPE_ID,
      name: item.HR_PERSON_TYPE_NAME ?? "",
      createdAt: item.created_at?.toISOString(),
      updatedAt: item.updated_at?.toISOString(),
    })),
  });
}

/**
 * POST /api/hrd/person-types
 * สร้างกลุ่มบุคลากรใหม่
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
    const { name } = requestData;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณากรอกชื่อกลุ่มบุคลากร",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบชื่อซ้ำ
    const existing = await prisma.hrd_person_type.findFirst({
      where: {
        HR_PERSON_TYPE_NAME: {
          equals: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: "ชื่อกลุ่มบุคลากรนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    // สร้างข้อมูลใหม่
    const newPersonType = await prisma.hrd_person_type.create({
      data: {
        HR_PERSON_TYPE_NAME: name.trim(),
        max_leave_day: 0, // Default value
      },
      select: {
        HR_PERSON_TYPE_ID: true,
        HR_PERSON_TYPE_NAME: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newPersonType.HR_PERSON_TYPE_ID,
          name: newPersonType.HR_PERSON_TYPE_NAME ?? "",
          createdAt: newPersonType.created_at?.toISOString(),
          updatedAt: newPersonType.updated_at?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating person type:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างกลุ่มบุคลากร",
      },
      { status: 500 },
    );
  }
}
