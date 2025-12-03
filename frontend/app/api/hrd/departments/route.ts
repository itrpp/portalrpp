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
          HR_DEPARTMENT_NAME: {
            contains: query,
          },
        }
      : {};

  const items = await prisma.hrd_department.findMany({
    where,
    select: {
      HR_DEPARTMENT_ID: true,
      HR_DEPARTMENT_NAME: true,
    },
    orderBy: {
      HR_DEPARTMENT_NAME: "asc",
    },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.HR_DEPARTMENT_ID,
      name: item.HR_DEPARTMENT_NAME ?? "",
    })),
  });
}
