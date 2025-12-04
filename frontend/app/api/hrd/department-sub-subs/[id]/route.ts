import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const departmentSubSubId = Number.parseInt(id, 10);

  if (!Number.isInteger(departmentSubSubId) || departmentSubSubId <= 0) {
    return NextResponse.json(
      { success: false, error: "INVALID_ID_TYPE" },
      { status: 400 },
    );
  }

  const departmentSubSub = await prisma.hrd_department_sub_sub.findUnique({
    where: {
      HR_DEPARTMENT_SUB_SUB_ID: departmentSubSubId,
    },
    select: {
      HR_DEPARTMENT_SUB_SUB_ID: true,
      HR_DEPARTMENT_SUB_SUB_NAME: true,
    },
  });

  if (!departmentSubSub) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: departmentSubSub.HR_DEPARTMENT_SUB_SUB_ID,
      name: departmentSubSub.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
    },
  });
}
