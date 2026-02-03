import type { Prisma } from "@prisma/client";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/authOptions";
import { prisma } from "@/lib/prisma";
import { profileSelect } from "@/lib/profile";

/**
 * GET /api/users/search
 * ค้นหา users สำหรับ map กับ employee (ไม่ต้องเป็น admin)
 * Query: search (อย่างน้อย 2 ตัวอักษร)
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();

    const where: Prisma.userWhereInput = {};

    if (search.length >= 2) {
      where.OR = [
        { email: { contains: search } },
        { displayName: { contains: search } },
        { ldapDisplayName: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: profileSelect,
      take: 50,
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
