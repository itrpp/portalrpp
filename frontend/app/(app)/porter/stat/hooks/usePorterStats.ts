import { useState, useEffect, useMemo } from "react";

import { PorterJobItem } from "@/types/porter";
import { formatLocationString } from "@/lib/porter";
import { getISODatePart, parseFullName, toISODateString } from "@/lib/utils";

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

  // ดึงข้อมูลทั้งหมดจาก API
  useEffect(() => {
    const fetchAllJobs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ดึงข้อมูลทั้งหมดโดยไม่ระบุ status filter
        const response = await fetch("/api/porter/requests?page_size=10000");

        if (!response.ok) {
          const errorData = await response.json();

          throw new Error(errorData.message || "ไม่สามารถโหลดข้อมูลสถิติได้");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setJobs(result.data as PorterJobItem[]);
        } else {
          throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAllJobs();
  }, []);

  // คำนวณสถิติทั้งหมด - Single Pass Optimization
  const stats = useMemo<PorterStats>(() => {
    // ใช้ข้อมูลทั้งหมด ไม่กรองตามวันที่
    const filteredJobs = jobs.filter((job) => job.createdAt !== undefined);
    const totalJobs = filteredJobs.length;

    // ถ้าไม่มีข้อมูลให้ return ค่าว่าง
    if (totalJobs === 0) {
      const today = new Date();
      const dailyJobsMap = new Map<
        string,
        { ปกติ: number; ด่วน: number; ฉุกเฉิน: number }
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
        totalJobs: 0,
        waitingJobs: 0,
        inProgressJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
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
      { ปกติ: number; ด่วน: number; ฉุกเฉิน: number }
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
      status === "WAITING_CENTER" || status === "WAITING_ACCEPT";
    const isInProgressStatus = (status: string | undefined | null) =>
      status === "IN_PROGRESS";
    const isCompletedStatus = (status: string | undefined | null) =>
      status === "COMPLETED";
    const isCancelledStatus = (status: string | undefined | null) =>
      status === "CANCELLED";

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
            const urgencyLevel = job.form.urgencyLevel || "ปกติ";

            if (urgencyLevel === "ปกติ") {
              dayData.ปกติ += 1;
            } else if (urgencyLevel === "ด่วน") {
              dayData.ด่วน += 1;
            } else if (urgencyLevel === "ฉุกเฉิน") {
              dayData.ฉุกเฉิน += 1;
            }
          }
        }
      }

      // 3. เหตุผลการเคลื่อนย้าย
      const reason = job.form.transportReason;

      if (reason) {
        transportReasonMap.set(
          reason,
          (transportReasonMap.get(reason) || 0) + 1,
        );
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
      const deliveryLocationKey = JSON.stringify(
        job.form.deliveryLocationDetail,
      );
      let deliveryLocationStr = locationStringCache.get(deliveryLocationKey);

      if (!deliveryLocationStr) {
        deliveryLocationStr = formatLocationString(
          job.form.deliveryLocationDetail,
        );
        locationStringCache.set(deliveryLocationKey, deliveryLocationStr);
      }

      if (deliveryLocationStr) {
        deliveryLocationMap.set(
          deliveryLocationStr,
          (deliveryLocationMap.get(deliveryLocationStr) || 0) + 1,
        );
      }

      // 6. ประสิทธิผลรายบุคคล
      if (job.assignedToName && job.acceptedAt) {
        const employeeName = job.assignedToName;

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
          acceptedAt: job.acceptedAt,
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
        const completedJobs = data.jobs.filter(
          (job) => job.acceptedAt && job.completedAt,
        );
        let averageDuration = 0;

        if (completedJobs.length > 0) {
          let totalDuration = 0;

          for (const job of completedJobs) {
            // Parse dates ครั้งเดียว
            const acceptedTime = new Date(job.acceptedAt!).getTime();
            const completedTime = new Date(job.completedAt!).getTime();
            const durationMinutes =
              (completedTime - acceptedTime) / (1000 * 60);

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

    return {
      totalJobs,
      waitingJobs,
      inProgressJobs,
      completedJobs,
      cancelledJobs,
      dailyJobs,
      transportReasons,
      popularPickupLocations,
      popularDeliveryLocations,
      employeePerformance,
    };
  }, [jobs]);

  return {
    stats,
    jobs, // ส่ง jobs ออกมาเพื่อให้ component สามารถ filter ตาม date range ได้
    isLoading,
    error,
  };
}
