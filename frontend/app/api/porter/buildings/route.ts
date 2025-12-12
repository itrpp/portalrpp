import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/buildings
 * ดึงรายการ Building ทั้งหมด
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
    const { page, page_size } = Object.fromEntries(searchParams);

    // สร้าง request object สำหรับ gRPC
    const protoRequest: any = {};

    if (page) {
      protoRequest.page = parseInt(page, 10);
    }
    if (page_size) {
      protoRequest.page_size = parseInt(page_size, 10);
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "ListBuildings",
      protoRequest,
    );

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          data: response.data || [],
          total: response.total || 0,
          page: response.page || 1,
          page_size: response.page_size || 100,
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
    console.error("Error fetching buildings:", error);

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
 * POST /api/porter/buildings
 * สร้าง Building ใหม่
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
    };

    // ถ้ามี id ที่ระบุมา (custom ID)
    if (requestData.id) {
      protoRequest.id = requestData.id;
    }

    // ถ้ามี floorCount ที่ระบุมา
    if (requestData.floorCount !== undefined) {
      protoRequest.floor_count = requestData.floorCount;
    }
    // ถ้ามี floorPlans ที่ระบุมา (เป็น array)
    if (requestData.floorPlans && Array.isArray(requestData.floorPlans)) {
      protoRequest.floor_plans = requestData.floorPlans;
    }
    // ถ้ามี status ที่ระบุมา
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "CreateBuilding",
      protoRequest,
    );

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          data: response.data,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "CREATION_FAILED",
          message: response.error_message || "ไม่สามารถสร้างอาคารได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error creating building:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างอาคาร",
      },
      { status: 500 },
    );
  }
}
