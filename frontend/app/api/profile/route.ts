import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import {
  getUserProfile,
  parseAndValidateProfileUpdate,
  applyProfileUpdate,
} from "@/lib/profile";

/**
 * GET /api/profile
 * ดึงโปรไฟล์ผู้ใช้ที่ล็อกอิน
 */
export async function GET() {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  const user = await getUserProfile(auth.userId);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: user });
}

/**
 * PUT /api/profile
 * อัปเดตโปรไฟล์ (auth + เรียก service + ส่ง response)
 */
export async function PUT(request: Request) {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  let updateData: Awaited<ReturnType<typeof parseAndValidateProfileUpdate>>;

  try {
    updateData = await parseAndValidateProfileUpdate(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVALID_REQUEST";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, error: "NO_MUTATIONS" },
      { status: 400 },
    );
  }

  const user = await applyProfileUpdate(auth.userId, updateData);

  return NextResponse.json({
    success: true,
    data: user,
  });
}
