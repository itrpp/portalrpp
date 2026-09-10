import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth';
import { callPorterService } from '@/lib/grpcClient';
import { handleGrpcError } from '@/lib/grpcErrorHandler';
import { logger } from '@/lib/logger';
import { formatZodError } from '@/lib/schemas/porterRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
};

const STAT_MAX_RANGE_DAYS = 90;

const GetPorterStatsQuerySchema = z.object({
  created_after: z.string().min(1),
  created_before: z.string().min(1),
});

function daysInclusive(startStr: string, endStr: string): number {
  const start = new Date(`${startStr.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endStr.slice(0, 10)}T00:00:00`);
  const ms = end.getTime() - start.getTime();

  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function clampCreatedAfter(startStr: string, endStr: string): string {
  const span = daysInclusive(startStr, endStr);

  if (span <= STAT_MAX_RANGE_DAYS) return startStr.slice(0, 10);

  const end = new Date(`${endStr.slice(0, 10)}T00:00:00`);

  end.setDate(end.getDate() - (STAT_MAX_RANGE_DAYS - 1));

  return end.toISOString().slice(0, 10);
}

/**
 * GET /api/porter/stats
 * สรุปสถิติจาก gRPC GetPorterRequestStats — ไม่ดึงรายการงานเต็ม
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthSession();

    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsed = GetPorterStatsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const created_before = parsed.data.created_before.slice(0, 10);
    const created_after = clampCreatedAfter(
      parsed.data.created_after,
      created_before,
    );

    logger.info('GET /api/porter/stats', {
      user: auth.userId,
      created_after,
      created_before,
    });

    const response = await callPorterService<{
      success: boolean;
      error_message?: string;
      total_jobs?: number;
      waiting_jobs?: number;
      in_progress_jobs?: number;
      completed_jobs?: number;
      cancelled_jobs?: number;
      daily_jobs?: Array<{
        date: string;
        normal: number;
        rush: number;
        emergency: number;
        total: number;
      }>;
      transport_reasons?: Array<{ label: string; count: number }>;
      popular_pickup_locations?: Array<{ label: string; count: number }>;
      popular_delivery_locations?: Array<{ label: string; count: number }>;
      employee_performance?: Array<{
        employee_id: string;
        employee_name: string;
        first_name: string;
        last_name: string;
        assigned_job_count: number;
        average_duration: number;
      }>;
      heatmap_cells?: Array<{
        day_of_week: number;
        hour: number;
        count: number;
      }>;
    }>('GetPorterRequestStats', { created_after, created_before });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'FETCH_FAILED',
          message: response.error_message ?? 'ไม่สามารถโหลดสถิติได้',
        },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          totalJobs: response.total_jobs ?? 0,
          waitingJobs: response.waiting_jobs ?? 0,
          inProgressJobs: response.in_progress_jobs ?? 0,
          completedJobs: response.completed_jobs ?? 0,
          cancelledJobs: response.cancelled_jobs ?? 0,
          dailyJobs: (response.daily_jobs ?? []).map((d) => ({
            date: d.date,
            ปกติ: d.normal ?? 0,
            ด่วน: d.rush ?? 0,
            ฉุกเฉิน: d.emergency ?? 0,
            ยอดรวม: d.total ?? 0,
          })),
          transportReasons: (response.transport_reasons ?? []).map((r) => ({
            reason: r.label,
            count: r.count,
          })),
          popularPickupLocations: (response.popular_pickup_locations ?? []).map(
            (r) => ({
              location: r.label,
              count: r.count,
            }),
          ),
          popularDeliveryLocations: (
            response.popular_delivery_locations ?? []
          ).map((r) => ({
            location: r.label,
            count: r.count,
          })),
          employeePerformance: (response.employee_performance ?? []).map(
            (e) => ({
              employeeName: e.employee_name,
              firstName: e.first_name,
              lastName: e.last_name,
              assignedJobCount: e.assigned_job_count,
              averageDuration: e.average_duration,
            }),
          ),
          heatmapCells: (response.heatmap_cells ?? []).map((c) => ({
            dayOfWeek: c.day_of_week,
            hour: c.hour,
            count: c.count,
          })),
        },
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error: unknown) {
    return handleGrpcError(error, { context: 'GET /api/porter/stats' });
  }
}
