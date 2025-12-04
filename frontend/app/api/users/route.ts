import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { profileSelect } from "@/lib/profile";

/**
 * GET /api/users
 * ดึงรายการ users พร้อม pagination, search, และ filter
 * ต้องเป็น admin เท่านั้น
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

    // ตรวจสอบสิทธิ์ admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") as "admin" | "user" | null;
    const departmentId = searchParams.get("departmentId");

    // สร้าง where clause สำหรับ Prisma
    const where: any = {};

    // Search filter (email หรือ displayName)
    // MySQL ไม่รองรับ mode: "insensitive" ใช้ contains แทน
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { displayName: { contains: search } },
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Department filter
    if (departmentId) {
      const deptId = Number.parseInt(departmentId, 10);

      if (!Number.isNaN(deptId)) {
        where.departmentId = deptId;
      }
    }

    // คำนวณ pagination
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // ดึงข้อมูลพร้อม pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: profileSelect,
        skip,
        take,
        orderBy: { displayName: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    // ดึงข้อมูล HRD (departmentSub และ departmentSubSub) สำหรับ users ที่มี ID
    const departmentSubIds = users
      .map((u) => u.departmentSubId)
      .filter((id): id is number => id !== null && id !== undefined);
    const departmentSubSubIds = users
      .map((u) => u.departmentSubSubId)
      .filter((id): id is number => id !== null && id !== undefined);

    const [departmentSubs, departmentSubSubs] = await Promise.all([
      departmentSubIds.length > 0
        ? prisma.hrd_department_sub.findMany({
            where: {
              HR_DEPARTMENT_SUB_ID: {
                in: departmentSubIds,
              },
            },
            select: {
              HR_DEPARTMENT_SUB_ID: true,
              HR_DEPARTMENT_SUB_NAME: true,
            },
          })
        : [],
      departmentSubSubIds.length > 0
        ? prisma.hrd_department_sub_sub.findMany({
            where: {
              HR_DEPARTMENT_SUB_SUB_ID: {
                in: departmentSubSubIds,
              },
            },
            select: {
              HR_DEPARTMENT_SUB_SUB_ID: true,
              HR_DEPARTMENT_SUB_SUB_NAME: true,
            },
          })
        : [],
    ]);

    // สร้าง map สำหรับ lookup
    const departmentSubMap = new Map(
      departmentSubs.map((d) => [
        d.HR_DEPARTMENT_SUB_ID,
        d.HR_DEPARTMENT_SUB_NAME ?? "",
      ]),
    );
    const departmentSubSubMap = new Map(
      departmentSubSubs.map((d) => [
        d.HR_DEPARTMENT_SUB_SUB_ID,
        d.HR_DEPARTMENT_SUB_SUB_NAME ?? "",
      ]),
    );

    // รวมข้อมูล HRD เข้ากับ users
    const usersWithHrd = users.map((user) => ({
      ...user,
      departmentSubName:
        user.departmentSubId !== null && user.departmentSubId !== undefined
          ? departmentSubMap.get(user.departmentSubId) || null
          : null,
      departmentSubSubName:
        user.departmentSubSubId !== null &&
        user.departmentSubSubId !== undefined
          ? departmentSubSubMap.get(user.departmentSubSubId) || null
          : null,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: usersWithHrd,
        total,
        page,
        pageSize,
        totalPages,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching users:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
      },
      { status: 500 },
    );
  }
}
