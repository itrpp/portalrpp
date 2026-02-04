import type { Session } from "next-auth";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/authOptions";

/**
 * ผลลัพธ์จากการตรวจสอบ session ใน API route
 * ใช้เฉพาะภายใน lib/auth (getAuthSession return type)
 */
type AuthSessionResult =
  | { ok: true; session: Session; userId: string }
  | { ok: false; response: NextResponse };

/**
 * ดึง session ของผู้ใช้ที่ล็อกอิน และตรวจสอบว่ามี userId
 * ถ้าไม่มี session หรือไม่มี user.id จะ return NextResponse 401 ให้ส่งกลับทันที
 *
 * @example
 * const auth = await getAuthSession();
 * if (!auth.ok) return auth.response;
 * const { session, userId } = auth;
 */
export async function getAuthSession(): Promise<AuthSessionResult> {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true,
    session,
    userId: session.user.id,
  };
}
