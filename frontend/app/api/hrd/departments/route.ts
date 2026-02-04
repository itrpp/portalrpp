import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import {
  listDepartments,
  createDepartment,
  CreateDepartmentError,
} from "@/lib/hrd";

/**
 * GET /api/hrd/departments
 * ดึงรายการกลุ่มภารกิจ (auth + เรียก service + ส่ง response)
 */
export async function GET(request: Request) {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const data = await listDepartments(query);

  return NextResponse.json({ success: true, data });
}

/**
 * POST /api/hrd/departments
 * สร้างกลุ่มภารกิจใหม่ (auth + เรียก service + ส่ง response)
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const requestData = (await request.json()) as {
      name?: string;
      active?: boolean;
    };
    const name = requestData.name;
    const active = requestData.active !== undefined ? requestData.active : true;

    const data = await createDepartment(
      typeof name === "string" ? name : "",
      active,
    );

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof CreateDepartmentError) {
      if (error.code === "VALIDATION_ERROR") {
        return NextResponse.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: error.message,
          },
          { status: 400 },
        );
      }
      if (error.code === "DUPLICATE_NAME") {
        return NextResponse.json(
          {
            success: false,
            error: "DUPLICATE_NAME",
            message: error.message,
          },
          { status: 409 },
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาดในการสร้างกลุ่มภารกิจ";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message,
      },
      { status: 500 },
    );
  }
}
