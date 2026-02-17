import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DeviceType } from '@/generated/prisma/enums';

// ดึง IP ของ client จาก header ที่ Nginx / Proxy ส่งมา
function getClientIp(request: NextRequest): string | null {
  // 1) ให้ความสำคัญกับ X-Real-IP ก่อน (Nginx set จาก $remote_addr)
  const xRealIp = request.headers.get('x-real-ip') ?? request.headers.get('X-Real-IP');

  if (xRealIp && xRealIp !== '127.0.0.1' && xRealIp !== '::1') {
    return xRealIp;
  }

  // 2) ถัดมาค่อยดู X-Forwarded-For (อาจมีหลายชั้น: client, proxy1, proxy2, ...)
  const xForwardedFor =
    request.headers.get('x-forwarded-for') ?? request.headers.get('X-Forwarded-For');

  if (xForwardedFor) {
    const ips = xForwardedFor
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (ips.length > 0) {
      // หา IP แรกที่ไม่ใช่ loopback (::1, 127.0.0.1)
      const nonLoopback = ips.find((ip) => ip !== '127.0.0.1' && ip !== '::1');

      if (nonLoopback) {
        return nonLoopback;
      }

      // ถ้าไม่เจอเลยก็คืนตัวสุดท้ายเป็น fallback
      return ips[ips.length - 1];
    }
  }

  return null;
}

/** ระยะเวลา idle สูงสุด (มิลลิวินาที) — เกินนี้ถือว่า session หมดอายุ ต้อง auth ใหม่ */
const INACTIVITY_MAX_MS = 60 * 60 * 1000; // 60 นาที

/**
 * POST /api/auth/update-activity
 * อัปเดต lastActivityAt ของผู้ใช้ที่กำลังใช้งาน
 * - เรียกจาก client-side ทุก 30 วินาที (เก็บสถานะด้วย NextAuth session/cookie)
 * - ถ้าไม่ใช้งานเกิน 60 นาที จะคืน 401 SESSION_EXPIRED (ไม่ลบ record — เก็บประวัติ)
 */
export async function POST(request: NextRequest) {
  try {
    // 1) ลองตรวจสอบจาก Bearer token (เช่น มาจาก /api/auth/login)
    let userId: string | null = null;
    let isMobileApp = false;
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();

      try {
        const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';

        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

          if (decoded && typeof decoded === 'object' && decoded.sub) {
            userId = String(decoded.sub);
            isMobileApp = true; // ถ้า verify token ได้ แสดงว่าเป็น Mobile-App
          }
        }
      } catch {
        // token ใช้ไม่ได้ — fallback ไปใช้ NextAuth session
      }
    }

    // 2) ถ้าไม่มีหรือ verify ไม่ผ่าน ให้ fallback ไปใช้ NextAuth session (เว็บ)
    if (!userId) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }

      userId = auth.userId;
      isMobileApp = false; // ใช้ NextAuth session แสดงว่าเป็น Web-App
    }

    const now = new Date();
    const clientIp = getClientIp(request) || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // หา session ปัจจุบันของ user: record ล่าสุดที่ยังไม่ถูก logout
    const currentSession = await prisma.user_activity.findFirst({
      where: {
        userId,
        logoutAt: null,
      },
      orderBy: {
        loginAt: 'desc',
      },
      select: {
        id: true,
        lastActivityAt: true,
      },
    });

    if (!currentSession) {
      // กรณีไม่พบ session ปัจจุบัน (เช่น schema เพิ่งเปลี่ยน หรือข้อมูลเก่า)
      // ให้สร้าง record ใหม่แทนการคืน 401 เพื่อไม่ให้ user หลุด flow
      // กำหนด deviceType ตามที่ตรวจสอบได้จาก authentication method
      await prisma.user_activity.create({
        data: {
          userId,
          loginAt: now,
          lastActivityAt: now,
          ipAddress: clientIp,
          userAgent,
          deviceType: isMobileApp ? DeviceType.MOBILE_APP : DeviceType.WEB_APP,
        },
      });
    } else {
      const lastAt = currentSession.lastActivityAt.getTime();

      // ถ้า idle เกินเวลาที่กำหนด ให้ถือว่า session หมดอายุ
      if (now.getTime() - lastAt > INACTIVITY_MAX_MS) {
        return NextResponse.json(
          {
            success: false,
            error: 'SESSION_EXPIRED',
            message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
          },
          { status: 401 },
        );
      }

      // อัปเดต lastActivityAt ของ session ปัจจุบันเท่านั้น
      await prisma.user_activity.update({
        where: { id: currentSession.id },
        data: {
          lastActivityAt: now,
          ipAddress: clientIp,
          userAgent,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Activity updated successfully',
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดต activity';

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message,
      },
      { status: 500 },
    );
  }
}
