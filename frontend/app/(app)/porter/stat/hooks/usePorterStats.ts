import { useState, useEffect, useMemo } from 'react';

import { PorterJobItem } from '@/types/porter';
import { formatLocationString } from '@/lib/porter';
import { getISODatePart, parseFullName, toISODateString } from '@/lib/utils';

type PorterRequestsApiSuccess = {
  success: true;
  data: PorterJobItem[];
  total: number;
  page: number;
  page_size: number;
};

type PorterRequestsApiError = {
  success: false;
  error: string;
  message: string;
};

type PorterRequestsApiResponse = PorterRequestsApiSuccess | PorterRequestsApiError;

interface PorterStats {
  totalJobs: number;
  waitingJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  dailyJobs: Array<{
    date: string;
    ปกติ: number;
    ด่วน: number;
    ฉุกเฉิน: number;
    ยอดรวม: number;
  }>;
  transportReasons: Array<{ reason: string; count: number }>;
  popularPickupLocations: Array<{ location: string; count: number }>;
  popularDeliveryLocations: Array<{ location: string; count: number }>;
  employeePerformance: Array<{
    employeeName: string;
    firstName: string;
    lastName: string;
    assignedJobCount: number;
    averageDuration: number; // ในหน่วยนาที
  }>;
}

export function usePorterStats() {
  const [jobs, setJobs] = useState<PorterJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryCounts, setSummaryCounts] = useState<{
    totalJobs: number;
    waitingJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    cancelledJobs: number;
  }>({
    totalJobs: 0,
    waitingJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
  });
  const [hasSummary, setHasSummary] = useState(false);

  // ดึง summary ด้วย Prisma count (ผ่าน total ใน API) + ดึง sample jobs สำหรับกราฟ
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const buildUrl = (params: Record<string, string | undefined>) => {
          const searchParams = new URLSearchParams();

          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
              searchParams.set(key, value);
            }
          });

          return `/api/porter/requests?${searchParams.toString()}`;
        };

        const fetchCount = async (status?: string): Promise<number> => {
          const url = buildUrl({
            page: '1',
            page_size: '1',
            status,
          });

          const response = await fetch(url);
          const result: PorterRequestsApiResponse = await response.json();

          if (!response.ok) {
            const message =
              !('success' in result) || result.success === true
                ? 'ไม่สามารถโหลดข้อมูลสถิติได้'
                : result.message;

            throw new Error(message);
          }

          if (!result.success) {
            throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลสถิติได้');
          }

          return typeof result.total === 'number' ? result.total : (result.data ?? []).length;
        };

        const [totalJobs, waitingJobs, inProgressJobs, completedJobs, cancelledJobs] =
          await Promise.all([
            fetchCount(), // ทั้งหมด
            fetchCount('WAITING'), // WAITING_CENTER + WAITING_ACCEPT
            fetchCount('IN_PROGRESS'),
            fetchCount('COMPLETED'),
            fetchCount('CANCELLED'),
          ]);

        setSummaryCounts({
          totalJobs,
          waitingJobs,
          inProgressJobs,
          completedJobs,
          cancelledJobs,
        });
        setHasSummary(true);

        // ดึงเฉพาะ jobs 30 วันล่าสุดสำหรับกราฟ/สถิติ (created_after) — ลด request และ payload มาก
        const PAGE_SIZE = 1000;
        const CONCURRENT_PAGES = 6;
        const today = new Date();
        const thirtyDaysAgo = new Date(today);

        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const createdAfter = toISODateString(thirtyDaysAgo); // YYYY-MM-DD

        const listParams = (page: number) => ({
          page: String(page),
          page_size: String(PAGE_SIZE),
          created_after: createdAfter,
        });

        // หน้าแรกเพื่อเอา total ของช่วง 30 วัน
        const firstRes = await fetch(buildUrl(listParams(1)));
        const firstResult: PorterRequestsApiResponse = await firstRes.json();

        if (!firstRes.ok || !firstResult.success) {
          throw new Error(
            'message' in firstResult && firstResult.message
              ? firstResult.message
              : 'ไม่สามารถโหลดข้อมูลสถิติได้',
          );
        }

        const firstChunk = (firstResult.data ?? []) as PorterJobItem[];
        const totalInRange =
          typeof firstResult.total === 'number' ? firstResult.total : firstChunk.length;
        const totalPages = Math.max(1, Math.ceil(totalInRange / PAGE_SIZE));
        const allJobs: PorterJobItem[] = [...firstChunk];

        if (totalPages > 1) {
          const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

          for (let i = 0; i < restPages.length; i += CONCURRENT_PAGES) {
            const batch = restPages.slice(i, i + CONCURRENT_PAGES);
            const results = await Promise.all(
              batch.map((page) =>
                fetch(buildUrl(listParams(page)))
                  .then((r) => r.json() as Promise<PorterRequestsApiResponse>)
                  .then((result) => result),
              ),
            );

            for (const result of results) {
              if (!result.success) {
                throw new Error(
                  'message' in result ? result.message : 'ไม่สามารถโหลดข้อมูลสถิติได้',
                );
              }
              allJobs.push(...((result.data ?? []) as PorterJobItem[]));
            }
          }
        }

        setJobs(allJobs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStats();
  }, []);

  // คำนวณสถิติทั้งหมด - Single Pass Optimization
  const stats = useMemo<PorterStats>(() => {
    // ใช้ข้อมูลทั้งหมด ไม่กรองตามวันที่
    const filteredJobs = jobs.filter((job) => job.createdAt !== undefined);
    const hasJobs = filteredJobs.length > 0;

    // ถ้าไม่มีข้อมูลให้ return ค่าว่าง
    if (!hasJobs) {
      const today = new Date();
      const dailyJobsMap = new Map<
        string,
        {
          ปกติ: number;
          ด่วน: number;
          ฉุกเฉิน: number;
        }
      >();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);

        date.setDate(date.getDate() - i);
        const dateStr = toISODateString(date);

        dailyJobsMap.set(dateStr, { ปกติ: 0, ด่วน: 0, ฉุกเฉิน: 0 });
      }

      const dailyJobs = Array.from(dailyJobsMap.entries())
        .map(([date, counts]) => ({
          date,
          ...counts,
          ยอดรวม: 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalJobs: summaryCounts.totalJobs,
        waitingJobs: summaryCounts.waitingJobs,
        inProgressJobs: summaryCounts.inProgressJobs,
        completedJobs: summaryCounts.completedJobs,
        cancelledJobs: summaryCounts.cancelledJobs,
        dailyJobs,
        transportReasons: [],
        popularPickupLocations: [],
        popularDeliveryLocations: [],
        employeePerformance: [],
      };
    }

    // Pre-compute date range สำหรับ 30 วันย้อนหลัง (ใช้ string comparison)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);

    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toISODateString(thirtyDaysAgo);

    // สร้าง Map สำหรับเก็บข้อมูลรายวัน (30 วันย้อนหลัง)
    const dailyJobsMap = new Map<
      string,
      {
        ปกติ: number;
        ด่วน: number;
        ฉุกเฉิน: number;
      }
    >();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);

      date.setDate(date.getDate() - i);
      const dateStr = toISODateString(date);

      dailyJobsMap.set(dateStr, { ปกติ: 0, ด่วน: 0, ฉุกเฉิน: 0 });
    }

    // Cache สำหรับ location strings
    const locationStringCache = new Map<string, string>();

    // Single Pass: คำนวณทุกอย่างใน loop เดียว
    let waitingJobs = 0;
    let inProgressJobs = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;

    const transportReasonMap = new Map<string, number>();
    const pickupLocationMap = new Map<string, number>();
    const deliveryLocationMap = new Map<string, number>();
    const employeeMap = new Map<
      string,
      {
        firstName: string;
        lastName: string;
        jobs: Array<{
          acceptedAt?: string;
          completedAt?: string;
        }>;
      }
    >();

    // Single loop ผ่าน jobs ทั้งหมด
    const isWaitingStatus = (status: string | undefined | null) =>
      status === 'WAITING_CENTER' || status === 'WAITING_ACCEPT';
    const isInProgressStatus = (status: string | undefined | null) => status === 'IN_PROGRESS';
    const isCompletedStatus = (status: string | undefined | null) => status === 'COMPLETED';
    const isCancelledStatus = (status: string | undefined | null) => status === 'CANCELLED';

    for (const job of filteredJobs) {
      // 1. นับจำนวนงานตาม status (ใช้สถานะจริงจาก DB)
      if (isWaitingStatus(job.status)) waitingJobs++;
      else if (isInProgressStatus(job.status)) inProgressJobs++;
      else if (isCompletedStatus(job.status)) completedJobs++;
      else if (isCancelledStatus(job.status)) cancelledJobs++;

      // 2. คำนวณ dailyJobs (ใช้ string comparison แทน Date object)
      if (job.createdAt) {
        const createdAtStr = getISODatePart(job.createdAt);

        if (createdAtStr >= thirtyDaysAgoStr) {
          const dayData = dailyJobsMap.get(createdAtStr);

          if (dayData) {
            const urgencyLevel = job.form.urgencyLevel || 'ปกติ';

            if (urgencyLevel === 'ปกติ') {
              dayData.ปกติ += 1;
            } else if (urgencyLevel === 'ด่วน') {
              dayData.ด่วน += 1;
            } else if (urgencyLevel === 'ฉุกเฉิน') {
              dayData.ฉุกเฉิน += 1;
            }
          }
        }
      }

      // 3. เหตุผลการเคลื่อนย้าย
      const reason = job.form.transportReason;

      if (reason) {
        transportReasonMap.set(reason, (transportReasonMap.get(reason) || 0) + 1);
      }

      // 4. จุดรับยอดนิยม (ใช้ cache)
      const pickupLocationKey = JSON.stringify(job.form.pickupLocationDetail);
      let pickupLocationStr = locationStringCache.get(pickupLocationKey);

      if (!pickupLocationStr) {
        pickupLocationStr = formatLocationString(job.form.pickupLocationDetail);
        locationStringCache.set(pickupLocationKey, pickupLocationStr);
      }

      if (pickupLocationStr) {
        pickupLocationMap.set(
          pickupLocationStr,
          (pickupLocationMap.get(pickupLocationStr) || 0) + 1,
        );
      }

      // 5. จุดส่งยอดนิยม (ใช้ cache)
      const deliveryLocationKey = JSON.stringify(job.form.deliveryLocationDetail);
      let deliveryLocationStr = locationStringCache.get(deliveryLocationKey);

      if (!deliveryLocationStr) {
        deliveryLocationStr = formatLocationString(job.form.deliveryLocationDetail);
        locationStringCache.set(deliveryLocationKey, deliveryLocationStr);
      }

      if (deliveryLocationStr) {
        deliveryLocationMap.set(
          deliveryLocationStr,
          (deliveryLocationMap.get(deliveryLocationStr) || 0) + 1,
        );
      }

      // 6. ประสิทธิผลรายบุคคล (assignedAt = เวลาที่เจ้าหน้าที่เปลกดรับงาน ตาม schema)
      if (job.assignedToName && (job.assignedAt ?? job.acceptedAt)) {
        const employeeName = job.assignedToName;
        const acceptedAt = job.assignedAt ?? job.acceptedAt;

        if (!employeeMap.has(employeeName)) {
          const { firstName, lastName } = parseFullName(employeeName);

          employeeMap.set(employeeName, {
            firstName,
            lastName,
            jobs: [],
          });
        }

        const employee = employeeMap.get(employeeName)!;

        employee.jobs.push({
          acceptedAt,
          completedAt: job.completedAt,
        });
      }
    }

    // แปลง dailyJobsMap เป็น array
    const dailyJobs = Array.from(dailyJobsMap.entries())
      .map(([date, counts]) => {
        const ยอดรวม = counts.ปกติ + counts.ด่วน + counts.ฉุกเฉิน;

        return {
          date,
          ...counts,
          ยอดรวม,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // แปลง transportReasons
    const transportReasons = Array.from(transportReasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // แปลง popularPickupLocations
    const popularPickupLocations = Array.from(pickupLocationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // แปลง popularDeliveryLocations
    const popularDeliveryLocations = Array.from(deliveryLocationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // คำนวณ employeePerformance (แยกออกมาเพื่อ optimize การคำนวณ duration)
    const employeePerformance = Array.from(employeeMap.entries())
      .map(([employeeName, data]) => {
        const assignedJobCount = data.jobs.length;

        // คำนวณระยะเวลาเฉลี่ยจาก jobs ที่มีทั้ง acceptedAt และ completedAt
        const completedJobs = data.jobs.filter((job) => job.acceptedAt && job.completedAt);
        let averageDuration = 0;

        if (completedJobs.length > 0) {
          let totalDuration = 0;

          for (const job of completedJobs) {
            // Parse dates ครั้งเดียว
            const acceptedTime = new Date(job.acceptedAt!).getTime();
            const completedTime = new Date(job.completedAt!).getTime();
            const durationMinutes = (completedTime - acceptedTime) / (1000 * 60);

            totalDuration += durationMinutes;
          }

          averageDuration = totalDuration / completedJobs.length;
        }

        return {
          employeeName,
          firstName: data.firstName,
          lastName: data.lastName,
          assignedJobCount,
          averageDuration: Math.round(averageDuration * 100) / 100, // ปัดเป็นทศนิยม 2 ตำแหน่ง
        };
      })
      .sort((a, b) => b.assignedJobCount - a.assignedJobCount);

    const totalJobsForSummary = hasSummary ? summaryCounts.totalJobs : filteredJobs.length;
    const waitingJobsForSummary = hasSummary ? summaryCounts.waitingJobs : waitingJobs;
    const inProgressJobsForSummary = hasSummary ? summaryCounts.inProgressJobs : inProgressJobs;
    const completedJobsForSummary = hasSummary ? summaryCounts.completedJobs : completedJobs;
    const cancelledJobsForSummary = hasSummary ? summaryCounts.cancelledJobs : cancelledJobs;

    return {
      totalJobs: totalJobsForSummary,
      waitingJobs: waitingJobsForSummary,
      inProgressJobs: inProgressJobsForSummary,
      completedJobs: completedJobsForSummary,
      cancelledJobs: cancelledJobsForSummary,
      dailyJobs,
      transportReasons,
      popularPickupLocations,
      popularDeliveryLocations,
      employeePerformance,
    };
  }, [jobs, hasSummary, summaryCounts]);

  return {
    stats,
    jobs, // ส่ง jobs ออกมาเพื่อให้ component สามารถ filter ตาม date range ได้
    isLoading,
    error,
  };
}
