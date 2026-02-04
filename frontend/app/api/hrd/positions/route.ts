import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const where =
    query.length > 0
      ? {
          HR_POSITION_NAME: {
            contains: query,
          },
        }
      : {};

  const items = await prisma.hrd_position.findMany({
    where,
    select: {
      HR_POSITION_ID: true,
      HR_POSITION_NAME: true,
      POSITION_SP_ID: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      HR_POSITION_NAME: "asc",
    },
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_POSITION_ID,
      name: item.HR_POSITION_NAME ?? "",
      positionSpId: item.POSITION_SP_ID ?? undefined,
      active: true, // Default value until ACTIVE field is added to schema
      createdAt: item.created_at?.toISOString(),
      updatedAt: item.updated_at?.toISOString(),
    })),
  });
}

/**
 * POST /api/hrd/positions
 * สร้างตำแหน่งใหม่
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const requestData = await request.json();
    const { name, positionSpId, id, active } = requestData;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณากรอกชื่อตำแหน่ง",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบ ID (required เพราะไม่ใช่ autoincrement)
    if (!id || typeof id !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "กรุณาระบุ ID ตำแหน่ง",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบ ID ซ้ำ
    const existingId = await prisma.hrd_position.findUnique({
      where: {
        HR_POSITION_ID: id,
      },
    });

    if (existingId) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_ID",
          message: "ID ตำแหน่งนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    // ตรวจสอบชื่อซ้ำ
    const existingName = await prisma.hrd_position.findFirst({
      where: {
        HR_POSITION_NAME: {
          equals: name.trim(),
        },
      },
    });

    if (existingName) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: "ชื่อตำแหน่งนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    // สร้างข้อมูลใหม่
    const newPosition = await prisma.hrd_position.create({
      data: {
        HR_POSITION_ID: id,
        HR_POSITION_NAME: name.trim(),
        POSITION_SP_ID: positionSpId || null,
      },
      select: {
        HR_POSITION_ID: true,
        HR_POSITION_NAME: true,
        POSITION_SP_ID: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newPosition.HR_POSITION_ID,
          name: newPosition.HR_POSITION_NAME ?? "",
          positionSpId: newPosition.POSITION_SP_ID ?? undefined,
          active: active !== undefined ? active : true, // Default to true if not provided
          createdAt: newPosition.created_at?.toISOString(),
          updatedAt: newPosition.updated_at?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating position:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างตำแหน่ง",
      },
      { status: 500 },
    );
  }
}
