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

type OnlinePorterUser = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  departmentId: number | null;
  departmentSubId: number | null;
  departmentSubSubId: number | null;
  loginAt: Date | null;
  lastActivityAt: Date | null;
  porterEmployee: { id: string };
};

/**
 * GET /api/auth/online-porter
 * ดึงจำนวนผู้ใช้ที่ Online และมี Porter Employee ID (porterResponse.data[0].id)
 * ต้อง login ก่อน
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
        console.info('Invalid bearer token for online-porter:', error);
      }
    }

    // 2) ถ้าไม่มี Bearer หรือ verify ไม่ผ่าน ให้ fallback ไปใช้ NextAuth session (เว็บ)
    if (!userIdFromToken) {
      const auth = await getAuthSession();

      if (!auth.ok) {
        return auth.response;
      }
    }

    // คำนวณเวลาที่ถือว่า offline (120 นาทีที่แล้ว)
    const OFFLINE_THRESHOLD_MINUTES = 120;
    const offlineThresholdTime = new Date(
      Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000,
    );

    // ดึง records จาก user_activity ที่ lastActivityAt ยังไม่เกิน 120 นาที
    // และยังไม่ถูก logout (logoutAt = null)
    const recentActivityRecords = await prisma.user_activity.findMany({
      where: {
        lastActivityAt: {
          gte: offlineThresholdTime,
        },
        logoutAt: null,
        deviceType: DeviceType.MOBILE_APP,
      },
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
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // สร้าง response data พร้อมดึง PorterEmployee ที่ผูกกับ user แต่ละคน
    // และกรองเฉพาะ user ที่มี porterResponse.data[0].id
    const usersWithPorterEmployee = await Promise.all(
      recentActivityRecords.map(async (activity: ActivityWithUser) => {
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

        // ถ้ามี porterEmployee ให้ return ข้อมูล user
        if (porterEmployee) {
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
            porterEmployee: porterEmployee,
          };
        }

        // ถ้าไม่มี porterEmployee ให้ return null เพื่อกรองออก
        return null;
      }),
    );

    // กรองเฉพาะ user ที่มี porterEmployee (ไม่เป็น null)
    const onlinePorterUsers = usersWithPorterEmployee.filter(
      (user: OnlinePorterUser | null): user is OnlinePorterUser => user !== null,
    );

    // นับจำนวนผู้ใช้ Online ที่มี Porter Employee ID
    const onlinePorterCount = onlinePorterUsers.length;

    return NextResponse.json(
      {
        success: true,
        count: onlinePorterCount,
        users: onlinePorterUsers,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Error fetching online porter users:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ Online ที่มี Porter Employee ID',
      },
      { status: 500 },
    );
  }
}
