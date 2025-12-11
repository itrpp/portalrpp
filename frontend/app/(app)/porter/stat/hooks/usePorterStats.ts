"use client";

import { useState, useEffect, useMemo } from "react";

import { PorterJobItem } from "@/types/porter";
import { formatLocationString } from "@/types/porter";

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

  // คำนวณสถิติทั้งหมด
  const stats = useMemo<PorterStats>(() => {
    // ใช้ข้อมูลทั้งหมด ไม่กรองตามวันที่
    const filteredJobs = jobs.filter((job) => job.createdAt !== undefined);

    // 1. จำนวนงานทั้งหมด
    const totalJobs = filteredJobs.length;
    const waitingJobs = filteredJobs.filter(
      (job) => job.status === "waiting",
    ).length;
    const inProgressJobs = filteredJobs.filter(
      (job) => job.status === "in-progress",
    ).length;
    const completedJobs = filteredJobs.filter(
      (job) => job.status === "completed",
    ).length;
    const cancelledJobs = filteredJobs.filter(
      (job) => job.status === "cancelled",
    ).length;

    // 2. ปริมาณงานรายวัน (ย้อนหลัง 30 วัน) แยกตามระดับความเร่งด่วน
    const thirtyDaysAgo = new Date();

    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // กรองข้อมูลย้อนหลัง 30 วัน
    const jobsLast30Days = filteredJobs.filter((job) => {
      if (!job.createdAt) return false;

      const jobDate = new Date(job.createdAt);

      return jobDate >= thirtyDaysAgo;
    });

    // สร้าง Map สำหรับเก็บข้อมูลรายวัน
    const dailyJobsMap = new Map<
      string,
      { ปกติ: number; ด่วน: number; ฉุกเฉิน: number }
    >();

    // สร้าง array ของ 30 วันย้อนหลัง
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);

      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      dailyJobsMap.set(dateStr, { ปกติ: 0, ด่วน: 0, ฉุกเฉิน: 0 });
    }

    // นับจำนวนงานในแต่ละวันแยกตาม urgency level
    jobsLast30Days.forEach((job) => {
      if (job.createdAt) {
        const jobDate = new Date(job.createdAt);
        const dateStr = jobDate.toISOString().split("T")[0];
        const urgencyLevel = job.form.urgencyLevel || "ปกติ";

        if (dailyJobsMap.has(dateStr)) {
          const dayData = dailyJobsMap.get(dateStr)!;

          if (urgencyLevel === "ปกติ") {
            dayData.ปกติ += 1;
          } else if (urgencyLevel === "ด่วน") {
            dayData.ด่วน += 1;
          } else if (urgencyLevel === "ฉุกเฉิน") {
            dayData.ฉุกเฉิน += 1;
          }
        }
      }
    });

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

    // 3. เหตุผลการเคลื่อนย้าย (Top 5)
    const transportReasonMap = new Map<string, number>();

    filteredJobs.forEach((job) => {
      const reason = job.form.transportReason;

      if (reason) {
        transportReasonMap.set(
          reason,
          (transportReasonMap.get(reason) || 0) + 1,
        );
      }
    });

    const transportReasons = Array.from(transportReasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. จุดรับยอดนิยม (Top 10)
    const pickupLocationMap = new Map<string, number>();

    filteredJobs.forEach((job) => {
      const locationStr = formatLocationString(job.form.pickupLocationDetail);

      if (locationStr) {
        pickupLocationMap.set(
          locationStr,
          (pickupLocationMap.get(locationStr) || 0) + 1,
        );
      }
    });

    const popularPickupLocations = Array.from(pickupLocationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. จุดส่งยอดนิยม (Top 10)
    const deliveryLocationMap = new Map<string, number>();

    filteredJobs.forEach((job) => {
      const locationStr = formatLocationString(job.form.deliveryLocationDetail);

      if (locationStr) {
        deliveryLocationMap.set(
          locationStr,
          (deliveryLocationMap.get(locationStr) || 0) + 1,
        );
      }
    });

    const popularDeliveryLocations = Array.from(deliveryLocationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 6. ประสิทธิผลรายบุคคล
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

    filteredJobs.forEach((job) => {
      if (job.assignedToName) {
        const employeeName = job.assignedToName;
        const nameParts = employeeName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        if (!employeeMap.has(employeeName)) {
          employeeMap.set(employeeName, {
            firstName,
            lastName,
            jobs: [],
          });
        }

        const employee = employeeMap.get(employeeName)!;

        // นับงานที่ได้รับมอบหมาย (ทุก status ที่มี assignedToName)
        if (job.acceptedAt) {
          employee.jobs.push({
            acceptedAt: job.acceptedAt,
            completedAt: job.completedAt,
          });
        }
      }
    });

    const employeePerformance = Array.from(employeeMap.entries())
      .map(([employeeName, data]) => {
        const assignedJobCount = data.jobs.length;

        // คำนวณระยะเวลาเฉลี่ยจาก jobs ที่มีทั้ง acceptedAt และ completedAt
        const completedJobs = data.jobs.filter(
          (job) => job.acceptedAt && job.completedAt,
        );
        let averageDuration = 0;

        if (completedJobs.length > 0) {
          const totalDuration = completedJobs.reduce((sum, job) => {
            const acceptedTime = new Date(job.acceptedAt!).getTime();
            const completedTime = new Date(job.completedAt!).getTime();
            const durationMinutes =
              (completedTime - acceptedTime) / (1000 * 60);

            return sum + durationMinutes;
          }, 0);

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
    isLoading,
    error,
  };
}
