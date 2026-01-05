import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search
 * ค้นหา users สำหรับ autocomplete (ไม่ต้องเป็น admin)
 * ใช้สำหรับ autocomplete ในหน้าแก้ไขเจ้าหน้าที่เปล
 */
export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(
      authOptions as any,
    )) as import("@/types/ldap").ExtendedSession;

    // ตรวจสอบ authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const search = searchParams.get("search") || "";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    // สร้าง where clause สำหรับ Prisma
    const where: any = {};

    // ถ้ามี search query อย่างน้อย 2 ตัวอักษร ให้ filter
    if (search && search.trim().length >= 2) {
      where.OR = [
        { email: { contains: search.trim() } },
        { displayName: { contains: search.trim() } },
        { ldapDisplayName: { contains: search.trim() } },
      ];
    }

    // สร้าง query options
    const queryOptions: any = {
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        ldapDisplayName: true,
      },
      orderBy: { displayName: "asc" },
    };

    // เพิ่ม limit เฉพาะเมื่อมีการระบุ
    if (limit !== undefined && limit > 0) {
      queryOptions.take = limit;
    }

    // ดึงข้อมูล users (จำกัดเฉพาะ id, email, displayName, ldapDisplayName)
    const users = await prisma.user.findMany(queryOptions);

    return NextResponse.json(
      {
        success: true,
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          ldapDisplayName: u.ldapDisplayName,
        })),
        total: users.length,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error searching users:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการค้นหาผู้ใช้",
      },
      { status: 500 },
    );
  }
}

