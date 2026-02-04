import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { callPorterService } from "@/lib/grpcClient";

/**
 * GET /api/porter/floor-departments/[id]
 * ดึงข้อมูล FloorDepartment โดย ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    // เรียก gRPC service
    const response = await callPorterService<any>("GetFloorDepartment", {
      id,
    });

    if (response.success && response.data) {
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
          error: "NOT_FOUND",
          message: "ไม่พบข้อมูลคลีนิก/หอผู้ป่วย",
        },
        { status: 404 },
      );
    }
  } catch (error: any) {
    console.error("Error fetching floor department:", error);

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
 * PUT /api/porter/floor-departments/[id]
 * อัปเดตข้อมูล FloorDepartment
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const requestData = await request.json();

    // สร้าง proto request
    const protoRequest: any = { id };

    if (requestData.name !== undefined) {
      protoRequest.name = requestData.name;
    }
    if (requestData.floorNumber !== undefined) {
      protoRequest.floor_number = requestData.floorNumber;
    }
    if (requestData.departmentType !== undefined) {
      protoRequest.department_type = requestData.departmentType;
    }
    if (requestData.roomType !== undefined) {
      protoRequest.room_type = requestData.roomType;
    }
    // ส่ง roomCount ถ้ามีค่า (รวมถึง null เพื่อลบข้อมูล - ส่ง 0 เพื่อให้ backend แปลงเป็น null)
    if (requestData.roomCount !== undefined) {
      protoRequest.room_count =
        requestData.roomCount === null ? 0 : requestData.roomCount;
    }
    // ส่ง bedCount ถ้ามีค่า (รวมถึง null เพื่อลบข้อมูล - ส่ง 0 เพื่อให้ backend แปลงเป็น null)
    if (requestData.bedCount !== undefined) {
      protoRequest.bed_count =
        requestData.bedCount === null ? 0 : requestData.bedCount;
    }
    // ส่ง status ถ้ามีค่า
    if (requestData.status !== undefined) {
      protoRequest.status = requestData.status;
    }

    // เรียก gRPC service
    const response = await callPorterService<any>(
      "UpdateFloorDepartment",
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
          error: "UPDATE_FAILED",
          message:
            response.error_message || "ไม่สามารถอัปเดตคลีนิก/หอผู้ป่วยได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating floor department:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการอัปเดตคลีนิก/หอผู้ป่วย",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/porter/floor-departments/[id]
 * ลบ FloorDepartment
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    // เรียก gRPC service
    const response = await callPorterService<any>("DeleteFloorDepartment", {
      id,
    });

    if (response.success) {
      return NextResponse.json(
        {
          success: true,
          message: response.message || "ลบคลีนิก/หอผู้ป่วยสำเร็จ",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "DELETE_FAILED",
          message: response.error_message || "ไม่สามารถลบคลีนิก/หอผู้ป่วยได้",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error deleting floor department:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error.message || "เกิดข้อผิดพลาดในการลบคลีนิก/หอผู้ป่วย",
      },
      { status: 500 },
    );
  }
}
