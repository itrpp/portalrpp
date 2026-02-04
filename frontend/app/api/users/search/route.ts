import type { Prisma } from "@/generated/prisma/client";

import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSelect } from "@/lib/profile";

/**
 * GET /api/users/search
 * ค้นหา users สำหรับ map กับ employee (ไม่ต้องเป็น admin)
 * Query: search (อย่างน้อย 2 ตัวอักษร)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

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
