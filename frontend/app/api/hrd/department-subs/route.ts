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
  const departmentIdParam = searchParams.get("departmentId");
  const query = searchParams.get("q")?.trim() ?? "";

  if (!departmentIdParam) {
    return NextResponse.json(
      { success: false, error: "DEPARTMENT_ID_REQUIRED" },
      { status: 400 },
    );
  }

  const departmentId = Number.parseInt(departmentIdParam, 10);

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return NextResponse.json(
      { success: false, error: "INVALID_ID_TYPE" },
      { status: 400 },
    );
  }

  const where: any = {
    HR_DEPARTMENT_ID: String(departmentId),
  };

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
    },
    orderBy: {
      HR_DEPARTMENT_SUB_NAME: "asc",
    },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_DEPARTMENT_SUB_ID,
      name: item.HR_DEPARTMENT_SUB_NAME ?? "",
    })),
  });
}
