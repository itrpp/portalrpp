import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/employment-types
 * ดึงรายการ EmploymentType ทั้งหมด
 */
export async function GET(_request: NextRequest) {
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

    // เรียก gRPC service
    const response = await callPorterService<any>("ListEmploymentTypes", {});

    if (response.success) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = (response.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        status: item.status ?? true,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

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
          error: "FETCH_FAILED",
          message: response.error_message || "ไม่สามารถดึงข้อมูลได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching employment types:", error);

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
 * POST /api/porter/employment-types
 * สร้าง EmploymentType ใหม่
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
    const protoRequest: any = {
      name: requestData.name,
      status: requestData.status !== undefined ? requestData.status : true,
    };

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "CreateEmploymentType",
      protoRequest,
    );

    if (response.success) {
      // แปลงข้อมูลจาก Proto format เป็น Frontend format
      const frontendData = {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status ?? true,
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
          message: response.error_message || "ไม่สามารถสร้างประเภทการจ้างได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error creating employment type:", error);

    // จัดการ gRPC errors
    if (error.code === 6) {
      // ALREADY_EXISTS
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_NAME",
          message: error.message || "ชื่อประเภทการจ้างนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างประเภทการจ้าง",
      },
      { status: 500 },
    );
  }
}
