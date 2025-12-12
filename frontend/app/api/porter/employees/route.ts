import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { callPorterService } from "@/lib/grpcClient";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/porter/employees
 * ดึงรายการ Employee ทั้งหมด
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

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const { employment_type_id, position_id, status, page, page_size } =
      Object.fromEntries(searchParams);

    // สร้าง request object สำหรับ gRPC
    const protoRequest: any = {};

    if (employment_type_id) {
      protoRequest.employment_type_id = employment_type_id;
    }
    if (position_id) {
      protoRequest.position_id = position_id;
    }
    if (status !== undefined && status !== null) {
      protoRequest.status = status === "true" || status === "1";
    }
    if (page) {
      protoRequest.page = parseInt(page, 10);
    }
    if (page_size) {
      protoRequest.page_size = parseInt(page_size, 10);
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "ListEmployees",
      protoRequest,
    );

    if (response.success) {
      // ดึงข้อมูล employment types และ positions จาก hrd tables
      const [personTypes, positions] = await Promise.all([
        prisma.hrd_person_type.findMany({
          select: {
            HR_PERSON_TYPE_ID: true,
            HR_PERSON_TYPE_NAME: true,
          },
        }),
        prisma.hrd_position.findMany({
          select: {
            HR_POSITION_ID: true,
            HR_POSITION_NAME: true,
          },
        }),
      ]);

      // สร้าง map สำหรับ lookup
      const personTypeMap = new Map(
        personTypes.map((pt) => [
          pt.HR_PERSON_TYPE_ID,
          pt.HR_PERSON_TYPE_NAME ?? "",
        ]),
      );
      const positionMap = new Map(
        positions.map((p) => [p.HR_POSITION_ID, p.HR_POSITION_NAME ?? ""]),
      );

      // แปลงข้อมูลจาก Proto format เป็น Frontend format และ populate names
      const frontendData = (response.data || []).map((item: any) => {
        const employmentTypeId = parseInt(item.employment_type_id, 10);
        const positionId = parseInt(item.position_id, 10);

        return {
          id: item.id,
          citizenId: item.citizen_id,
          firstName: item.first_name,
          lastName: item.last_name,
          nickname: item.nickname || undefined,
          profileImage: item.profile_image || undefined,
          employmentType: personTypeMap.get(employmentTypeId) || "",
          employmentTypeId: item.employment_type_id,
          position: positionMap.get(positionId) || "",
          positionId: item.position_id,
          status: item.status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      });

      return NextResponse.json(
        {
          success: true,
          data: frontendData,
          total: response.total || frontendData.length,
          page: response.page || 1,
          page_size: response.page_size || frontendData.length,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "FETCH_FAILED",
          message: response.error_message || "ไม่สามารถดึงข้อมูลได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/porter/employees
 * สร้าง Employee ใหม่
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

    // อ่านข้อมูลจาก request body
    const requestData = await request.json();

    // สร้าง proto request
    // แปลง employmentTypeId และ positionId จาก number (hrd) เป็น string (gRPC)
    const protoRequest: any = {
      citizen_id: requestData.citizenId,
      first_name: requestData.firstName,
      last_name: requestData.lastName,
      nickname: requestData.nickname || undefined,
      // ส่ง empty string ถ้า profileImage เป็น null เพื่อลบรูปภาพ (gRPC ไม่รองรับ null)
      profile_image:
        requestData.profileImage && requestData.profileImage.trim() !== ""
          ? requestData.profileImage
          : "",
      employment_type_id: String(requestData.employmentTypeId),
      position_id: String(requestData.positionId),
      status: requestData.status ?? true,
    };

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "CreateEmployee",
      protoRequest,
    );

    if (response.success) {
      // ดึงข้อมูล employment type และ position จาก hrd tables
      const employmentTypeId = parseInt(response.data.employment_type_id, 10);
      const positionId = parseInt(response.data.position_id, 10);

      const [personType, position] = await Promise.all([
        prisma.hrd_person_type.findUnique({
          where: { HR_PERSON_TYPE_ID: employmentTypeId },
          select: { HR_PERSON_TYPE_NAME: true },
        }),
        prisma.hrd_position.findUnique({
          where: { HR_POSITION_ID: positionId },
          select: { HR_POSITION_NAME: true },
        }),
      ]);

      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        citizenId: response.data.citizen_id,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        nickname: response.data.nickname || undefined,
        profileImage: response.data.profile_image || undefined,
        employmentType: personType?.HR_PERSON_TYPE_NAME || "",
        employmentTypeId: response.data.employment_type_id,
        position: position?.HR_POSITION_NAME || "",
        positionId: response.data.position_id,
        status: response.data.status,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
      };

      return NextResponse.json(
        {
          success: true,
          data: frontendData,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "CREATION_FAILED",
          message: response.error_message || "ไม่สามารถสร้างเจ้าหน้าที่ได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    // จัดการ gRPC errors
    if (error.code === 6) {
      // ALREADY_EXISTS
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_CITIZEN_ID",
          message: error.message || "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างเจ้าหน้าที่",
      },
      { status: 500 },
    );
  }
}
