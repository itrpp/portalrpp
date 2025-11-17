import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/floor-departments
 * ดึงรายการ FloorDepartment
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
    const { building_id, department_type, page, page_size } =
      Object.fromEntries(searchParams);

    // สร้าง request object สำหรับ gRPC
    const protoRequest: any = {};

    if (building_id) {
      protoRequest.building_id = building_id;
    }
    if (department_type) {
      protoRequest.department_type = department_type;
    }
    if (page) {
      protoRequest.page = parseInt(page, 10);
    }
    if (page_size) {
      protoRequest.page_size = parseInt(page_size, 10);
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "ListFloorDepartments",
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
    console.error("Error fetching floor departments:", error);

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
 * POST /api/porter/floor-departments
 * สร้าง FloorDepartment ใหม่
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
      building_id: requestData.buildingId,
      department_type: requestData.departmentType,
    };

    // Optional fields
    if (requestData.id) {
      protoRequest.id = requestData.id;
    }
    if (requestData.floorNumber !== undefined) {
      protoRequest.floor_number = requestData.floorNumber;
    }
    if (requestData.roomType !== undefined) {
      protoRequest.room_type = requestData.roomType;
    }
    if (requestData.roomCount !== undefined) {
      protoRequest.room_count = requestData.roomCount;
    }
    if (requestData.bedCount !== undefined) {
      protoRequest.bed_count = requestData.bedCount;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "CreateFloorDepartment",
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
          message:
            response.error_message || "ไม่สามารถสร้างคลีนิก/หอผู้ป่วยได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error creating floor department:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการสร้างคลีนิก/หอผู้ป่วย",
      },
      { status: 500 },
    );
  }
}
