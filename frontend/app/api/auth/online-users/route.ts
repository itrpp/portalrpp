import type { Prisma } from '@/generated/prisma/client';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callPorterService } from '@/lib/grpcClient';
import { DeviceType } from '@/generated/prisma/enums';

type ActivityWithUser = Prisma.user_activityGetPayload<{
  include: { user: { select: { id: true; displayName: true; email: true; department: true; departmentId: true; departmentSubId: true; departmentSubSubId: true } } };
}>;

/** ระยะเวลาที่ถือว่า offline (มิลลิวินาที) — สอดคล้องกับ NextAuth session maxAge (1 ชม.) และ update-activity */
const OFFLINE_AFTER_MS = 60 * 60 * 1000; // 60 นาที

/**
 * GET /api/auth/online-users
 * ดึงจำนวนผู้ใช้ที่ Online (lastActivityAt ยังไม่เกินเกณฑ์ offline — 60 นาที / ตาม session)
 * ต้อง login ก่อน
 * Query: countOnly=true — ส่งกลับเฉพาะ { success, count } ไม่ดึง user หรือ ListEmployees (เหมาะกับหน้าแสดงแค่จำนวน)
 */
export async function GET(request: NextRequest) {
  try {
    // 1) รองรับ Bearer token จาก /api/auth/login
    let userIdFromToken: string | null = null;
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();

      try {
        const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';

        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

          if (decoded && typeof decoded === 'object' && decoded.sub) {
            userIdFromToken = String(decoded.sub);
          }
        }
      } catch (error) {
        console.info('Invalid bearer token for online-users:', error);
      }
    }

    // 2) ถ้าไม่มี Bearer หรือ verify ไม่ผ่าน ให้ fallback ไปใช้ NextAuth session (เว็บ)
    if (!userIdFromToken) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }
    }

    // คำนวณเวลาที่ถือว่า offline (ตาม OFFLINE_AFTER_MS — สอดคล้องกับ NextAuth session)
    const offlineBefore = new Date(Date.now() - OFFLINE_AFTER_MS);

    const whereOnline = {
      lastActivityAt: { gte: offlineBefore },
      logoutAt: null,
      deviceType: DeviceType.WEB_APP,
    };

    const countOnly = request.nextUrl.searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await prisma.user_activity.count({ where: whereOnline });

      return NextResponse.json({ success: true, count }, { status: 200 });
    }

    // ดึง records จาก user_activity พร้อม user (สำหรับ response แบบเต็ม)
    const onlineUsers = await prisma.user_activity.findMany({
      where: whereOnline,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            department: true,
            departmentId: true,
            departmentSubId: true,
            departmentSubSubId: true,
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    const count = onlineUsers.length;

    // สร้าง response data พร้อมดึง PorterEmployee ที่ผูกกับ user แต่ละคน (ถ้ามี)
    const users = await Promise.all(
      onlineUsers.map(async (activity: ActivityWithUser) => {
        let porterEmployee: { id: string } | null = null;

        try {
          const porterResponse = await callPorterService<{
            success: boolean;
            data?: Array<{ id: string }>;
          }>('ListEmployees', { user_id: activity.user.id });

          if (
            porterResponse?.success &&
            Array.isArray(porterResponse.data) &&
            porterResponse.data.length > 0
          ) {
            porterEmployee = { id: porterResponse.data[0].id };
          }
        } catch {
          // ไม่บล็อกการดึง online users ถ้า porter service ไม่พร้อม
        }

        return {
          id: activity.user.id,
          name: activity.user.displayName || activity.user.email || 'ไม่ระบุ',
          email: activity.user.email,
          department: activity.user.department,
          departmentId: activity.user.departmentId,
          departmentSubId: activity.user.departmentSubId,
          departmentSubSubId: activity.user.departmentSubSubId,
          loginAt: activity.loginAt,
          lastActivityAt: activity.lastActivityAt,
          porterEmployee: porterEmployee ?? undefined,
        };
      }),
    );

    return NextResponse.json(
      { success: true, count, users },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Error fetching online users:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ Online',
      },
      { status: 500 },
    );
  }
}
