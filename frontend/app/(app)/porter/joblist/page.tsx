"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Tabs,
  Tab,
  DatePicker,
  addToast,
} from "@heroui/react";
import { CalendarDate } from "@internationalized/date";

import { JobTable, JobDetailDrawer } from "../components";
import { usePagination } from "../hooks/usePagination";

import {
  ClockIcon,
  ClipboardListIcon,
  XMarkIcon,
  CheckCircleIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { formatDateTimeThai } from "@/lib/utils";
import {
  JobListTab,
  PorterJobItem,
  PorterRequestFormData,
  UrgencyLevel,
} from "@/types/porter";
import { sortJobs, playNotificationSound, playSirenSound } from "@/lib/porter";

export default function PorterJobListPage() {
  const [selectedTab, setSelectedTab] = useState<JobListTab>("waiting");
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [jobList, setJobList] = useState<PorterJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Date range filters สำหรับ completed และ cancelled tabs
  const [completedStartDate, setCompletedStartDate] =
    useState<CalendarDate | null>(null);
  const [completedEndDate, setCompletedEndDate] = useState<CalendarDate | null>(
    null,
  );
  const [cancelledStartDate, setCancelledStartDate] =
    useState<CalendarDate | null>(null);
  const [cancelledEndDate, setCancelledEndDate] = useState<CalendarDate | null>(
    null,
  );

  // อัพเดทเวลาแบบ real-time ทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // ดึงข้อมูลรายการคำขอจาก API
  const fetchPorterRequests = async (status?: JobListTab) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (status) {
        queryParams.append("status", status);
      }

      // ดึงข้อมูลจำนวนมากเพื่อรองรับการ filter ใน frontend
      queryParams.append("page_size", "10000");

      const response = await fetch(
        `/api/porter/requests?${queryParams.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.message || "ไม่สามารถโหลดข้อมูลรายการคำขอได้",
        );
      }

      const result = await response.json();

      if (result.success && result.data) {
        setJobList(result.data as PorterJobItem[]);
      } else {
        throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";

      setError(errorMessage);
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดข้อมูลเมื่อ component mount และเมื่อเปลี่ยน tab
  useEffect(() => {
    fetchPorterRequests();
  }, []);

  // เชื่อมต่อกับ SSE stream สำหรับ real-time updates
  useEffect(() => {
    let abortController: AbortController | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectSSE = async () => {
      if (!isMounted) {
        return;
      }

      try {
        // สร้าง query params สำหรับ filter (optional)
        const params = new URLSearchParams();
        // สามารถเพิ่ม filter ได้ตามต้องการ เช่น status, urgency_level

        // สร้าง AbortController สำหรับยกเลิก request
        abortController = new AbortController();

        // ใช้ fetch แทน EventSource เพื่อรองรับ authentication
        // eslint-disable-next-line no-console
        console.log("[SSE] Connecting to stream...");

        // ตัวเลือก: เชื่อมต่อโดยตรงกับ API Gateway (ไม่ผ่าน Next.js API route)
        // สำหรับทดสอบ: ตั้งค่า USE_DIRECT_CONNECTION=true ใน .env.local
        const useDirectConnection =
          process.env.NEXT_PUBLIC_USE_DIRECT_SSE === "true";
        const apiGatewayUrl =
          process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

        let streamUrl: string;
        let headers: HeadersInit = {};

        if (useDirectConnection) {
          // เชื่อมต่อโดยตรงกับ API Gateway
          // ต้องสร้าง JWT token สำหรับ authentication
          // eslint-disable-next-line no-console
          console.log("[SSE] Using DIRECT connection to API Gateway");

          // สร้าง JWT token โดยใช้ session
          // Note: ใน client-side เราไม่สามารถใช้ getServerSession ได้
          // ดังนั้นเราจะใช้วิธีอื่น เช่น ส่ง token ผ่าน API endpoint เพื่อสร้าง token
          try {
            const tokenResponse = await fetch("/api/porter/requests/token");
            const tokenData = await tokenResponse.json();

            if (!tokenData.token) {
              throw new Error("Failed to get stream token");
            }

            streamUrl = `${apiGatewayUrl}/api-gateway/porter/requests/stream?${params.toString()}`;
            headers = {
              Authorization: `Bearer ${tokenData.token}`,
            };

            // eslint-disable-next-line no-console
            console.log("[SSE] Direct connection URL:", streamUrl);
          } catch (error) {
            console.error(
              "[SSE] Failed to get token, falling back to Next.js API route:",
              error,
            );
            streamUrl = `/api/porter/requests/stream?${params.toString()}`;
          }
        } else {
          // ใช้ Next.js API route (default)
          streamUrl = `/api/porter/requests/stream?${params.toString()}`;
          // eslint-disable-next-line no-console
          console.log("[SSE] Using Next.js API route");
        }

        const response = await fetch(streamUrl, {
          signal: abortController.signal,
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // eslint-disable-next-line no-console
        console.log("[SSE] Stream connected successfully");

        // อ่าน stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No reader available");
        }

        let buffer = "";

        // อ่านข้อมูลจาก stream
        while (isMounted) {
          const { done, value } = await reader.read();

          if (done) {
            // eslint-disable-next-line no-console
            console.log("[SSE] Stream ended, will reconnect...");
            break;
          }

          // Decode และเพิ่มข้อมูลเข้า buffer
          const chunk = decoder.decode(value, { stream: true });

          buffer += chunk;

          // Log raw data สำหรับ debugging (เฉพาะใน development)
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[SSE] Received chunk:", chunk.substring(0, 100));
          }

          // ประมวลผล SSE messages
          const lines = buffer.split("\n");

          buffer = lines.pop() || ""; // เก็บส่วนที่เหลือไว้สำหรับรอบถัดไป

          for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) {
              continue;
            }

            // Log keep-alive messages
            if (line.startsWith(": ")) {
              // eslint-disable-next-line no-console
              console.log("[SSE] Received keep-alive");
              continue;
            }

            if (line.startsWith("data: ")) {
              try {
                const jsonData = line.slice(6); // ตัด "data: " ออก

                if (jsonData.trim()) {
                  const updateData = JSON.parse(jsonData);

                  // eslint-disable-next-line no-console
                  console.log("[SSE] Received update data:", {
                    type: updateData.type,
                    hasData: !!updateData.data,
                    dataId: updateData.data?.id,
                    dataStatus: updateData.data?.status,
                    fullData: updateData,
                  });

                  if (updateData.type && updateData.data) {
                    const { type, data } = updateData;

                    // eslint-disable-next-line no-console
                    console.log("[SSE] Processing update:", {
                      type,
                      requestId: data.id,
                      status: data.status,
                      requesterName: data.form?.requesterName,
                    });

                    // อัพเดท jobList ตาม type
                    if (type === "CREATED") {
                      // เพิ่มคำขอใหม่
                      // eslint-disable-next-line no-console
                      console.log("[SSE] Processing CREATED event:", data.id);

                      setJobList((prevList) => {
                        // ตรวจสอบว่ามีอยู่แล้วหรือไม่ (ป้องกัน duplicate)
                        const exists = prevList.some(
                          (job) => job.id === data.id,
                        );

                        if (exists) {
                          // eslint-disable-next-line no-console
                          console.log(
                            "[SSE] Request already exists in list, skipping:",
                            data.id,
                          );

                          return prevList;
                        }

                        // eslint-disable-next-line no-console
                        console.log(
                          "[SSE] Adding new request to list:",
                          data.id,
                        );

                        return [...prevList, data];
                      });

                      // แสดง toast notification และเล่นเสียงตาม UrgencyLevel
                      const urgencyLevel = data.form
                        ?.urgencyLevel as UrgencyLevel;

                      if (urgencyLevel === "ฉุกเฉิน") {
                        // UrgencyLevel ฉุกเฉิน - เล่นเสียงไซเรน
                        playSirenSound();
                        addToast({
                          title: "มีคำขอใหม่ - ฉุกเฉิน",
                          description: `คำขอฉุกเฉินจาก ${data.form?.requesterName || "ไม่ระบุ"} (HN: ${data.form?.patientHN || "ไม่ระบุ"})`,
                          color: "danger",
                        });
                      } else if (
                        urgencyLevel === "ด่วน" ||
                        urgencyLevel === "ปกติ"
                      ) {
                        // UrgencyLevel ปกติ, ด่วน - เล่นเสียงแจ้งเตือน
                        playNotificationSound();

                        const urgencyText =
                          urgencyLevel === "ด่วน" ? "ด่วน" : "ปกติ";

                        addToast({
                          title: `มีคำขอใหม่ - ${urgencyText}`,
                          description: `คำขอ${urgencyText}จาก ${data.form?.requesterName || "ไม่ระบุ"} (HN: ${data.form?.patientHN || "ไม่ระบุ"})`,
                          color:
                            urgencyLevel === "ด่วน" ? "warning" : "success",
                        });
                      } else {
                        // กรณีไม่มี UrgencyLevel หรือไม่ทราบค่า
                        playNotificationSound();
                        addToast({
                          title: "มีคำขอใหม่",
                          description: `คำขอจาก ${data.form?.requesterName || "ไม่ระบุ"} ได้รับการเพิ่มแล้ว`,
                          color: "success",
                        });
                      }
                    } else if (
                      type === "UPDATED" ||
                      type === "STATUS_CHANGED"
                    ) {
                      // eslint-disable-next-line no-console
                      console.log(
                        "[SSE] Processing UPDATED/STATUS_CHANGED event:",
                        data.id,
                      );

                      // อัพเดทคำขอที่มีอยู่
                      setJobList((prevList) =>
                        prevList.map((job) =>
                          job.id === data.id ? data : job,
                        ),
                      );

                      // อัพเดท selectedJob ถ้ายังเลือกอยู่
                      if (selectedJob?.id === data.id) {
                        setSelectedJob(data);
                      }

                      // แสดง toast notification สำหรับ status change
                      if (type === "STATUS_CHANGED") {
                        const urgencyLevel = data.form
                          ?.urgencyLevel as UrgencyLevel;
                        const statusText =
                          data.status === "WAITING_CENTER"
                            ? "รอศูนย์เปลรับงาน"
                            : data.status === "WAITING_ACCEPT"
                              ? "รอผู้ปฏิบัติรับงาน"
                              : data.status === "IN_PROGRESS"
                                ? "กำลังดำเนินการ"
                                : data.status === "COMPLETED"
                                  ? "เสร็จสิ้น"
                                  : "ยกเลิก";

                        if (urgencyLevel === "ฉุกเฉิน") {
                          addToast({
                            title: "สถานะเปลี่ยน - ฉุกเฉิน",
                            description: `สถานะของคำขอฉุกเฉิน (HN: ${data.form?.patientHN || "ไม่ระบุ"}) เปลี่ยนเป็น ${statusText}`,
                            color: "danger",
                          });
                        } else if (
                          urgencyLevel === "ด่วน" ||
                          urgencyLevel === "ปกติ"
                        ) {
                          const urgencyText =
                            urgencyLevel === "ด่วน" ? "ด่วน" : "ปกติ";

                          addToast({
                            title: `สถานะเปลี่ยน - ${urgencyText}`,
                            description: `สถานะของคำขอ${urgencyText} (HN: ${data.form?.patientHN || "ไม่ระบุ"}) เปลี่ยนเป็น ${statusText}`,
                            color:
                              urgencyLevel === "ด่วน" ? "warning" : "primary",
                          });
                        } else {
                          // กรณีไม่มี UrgencyLevel หรือไม่ทราบค่า
                          addToast({
                            title: "สถานะเปลี่ยน",
                            description: `สถานะของคำขอ ${data.form?.patientHN || "ไม่ระบุ"} เปลี่ยนเป็น ${statusText}`,
                            color: "primary",
                          });
                        }
                      }
                    } else if (type === "DELETED") {
                      // eslint-disable-next-line no-console
                      console.log("[SSE] Processing DELETED event:", data.id);

                      // ลบคำขอ
                      setJobList((prevList) =>
                        prevList.filter((job) => job.id !== data.id),
                      );

                      // ปิด drawer ถ้าคำขอที่ลบคือคำขอที่เลือกอยู่
                      if (selectedJob?.id === data.id) {
                        setIsDrawerOpen(false);
                        setSelectedJob(null);
                        setSelectedKeys(new Set());
                      }
                    } else {
                      console.warn("[SSE] Unknown update type:", type);
                    }
                  } else {
                    console.warn("[SSE] Missing type or data in update:", {
                      hasType: !!updateData.type,
                      hasData: !!updateData.data,
                      updateData,
                    });
                  }
                }
              } catch (error) {
                console.error("[SSE] Error parsing SSE message:", {
                  error: error instanceof Error ? error.message : String(error),
                  line: line.substring(0, 200), // จำกัดความยาวของ line
                });
              }
            }
          }
        }

        // เมื่อ stream end หรือ break ให้ reconnect
        if (isMounted) {
          // eslint-disable-next-line no-console
          console.log("[SSE] Reconnecting in 3 seconds...");
          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              connectSSE();
            }
          }, 3000);
        }
      } catch (error: any) {
        // ไม่แสดง error ถ้าเป็น abort (user ปิด connection)
        if (error.name === "AbortError") {
          return;
        }

        console.error("[SSE] Connection error:", error);

        // Reconnect หลัง 3 วินาที (หรือเมื่อ stream timeout)
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              connectSSE();
            }
          }, 3000);
        }
      }
    };

    // เชื่อมต่อ SSE
    connectSSE();

    // Cleanup เมื่อ component unmount
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [selectedJob]);

  // Helper สำหรับ map status จริง → กลุ่มของแท็บ
  const isWaitingStatus = (status: string | undefined | null) =>
    status === "WAITING_CENTER";
  const isInProgressStatus = (status: string | undefined | null) =>
    status === "IN_PROGRESS" || status === "WAITING_ACCEPT";
  const isCompletedStatus = (status: string | undefined | null) =>
    status === "COMPLETED";
  const isCancelledStatus = (status: string | undefined | null) =>
    status === "CANCELLED";

  // คำนวณจำนวนงานตามสถานะสำหรับแสดงบนแท็บ
  const waitingCount = useMemo(
    () => jobList.filter((job) => isWaitingStatus(job.status)).length,
    [jobList],
  );
  const inProgressCount = useMemo(
    () => jobList.filter((job) => isInProgressStatus(job.status)).length,
    [jobList],
  );
  const completedCount = useMemo(
    () => jobList.filter((job) => isCompletedStatus(job.status)).length,
    [jobList],
  );
  const cancelledCount = useMemo(
    () => jobList.filter((job) => isCancelledStatus(job.status)).length,
    [jobList],
  );

  // กรองข้อมูลตามแท็บที่เลือกและ date range (ถ้ามี)
  const filteredJobs = useMemo(() => {
    let filtered = jobList.filter((job) => {
      if (selectedTab === "waiting") {
        return isWaitingStatus(job.status);
      }
      if (selectedTab === "in-progress") {
        return isInProgressStatus(job.status);
      }
      if (selectedTab === "completed") {
        return isCompletedStatus(job.status);
      }
      if (selectedTab === "cancelled") {
        return isCancelledStatus(job.status);
      }

      return false;
    });

    // Filter ตาม date range สำหรับ completed tab
    if (selectedTab === "completed") {
      if (completedStartDate || completedEndDate) {
        filtered = filtered.filter((job) => {
          if (!job.completedAt) {
            return false;
          }

          const jobDate = new Date(job.completedAt);
          const jobDateOnly = new Date(
            jobDate.getFullYear(),
            jobDate.getMonth(),
            jobDate.getDate(),
          );

          // ตรวจสอบ startDate
          if (completedStartDate) {
            const startDateOnly = new Date(
              completedStartDate.year,
              completedStartDate.month - 1,
              completedStartDate.day,
            );

            if (jobDateOnly < startDateOnly) {
              return false;
            }
          }

          // ตรวจสอบ endDate
          if (completedEndDate) {
            const endDateOnly = new Date(
              completedEndDate.year,
              completedEndDate.month - 1,
              completedEndDate.day,
            );

            if (jobDateOnly > endDateOnly) {
              return false;
            }
          }

          return true;
        });
      }
    }

    // Filter ตาม date range สำหรับ cancelled tab
    if (selectedTab === "cancelled") {
      if (cancelledStartDate || cancelledEndDate) {
        filtered = filtered.filter((job) => {
          if (!job.cancelledAt) {
            return false;
          }

          const jobDate = new Date(job.cancelledAt);
          const jobDateOnly = new Date(
            jobDate.getFullYear(),
            jobDate.getMonth(),
            jobDate.getDate(),
          );

          // ตรวจสอบ startDate
          if (cancelledStartDate) {
            const startDateOnly = new Date(
              cancelledStartDate.year,
              cancelledStartDate.month - 1,
              cancelledStartDate.day,
            );

            if (jobDateOnly < startDateOnly) {
              return false;
            }
          }

          // ตรวจสอบ endDate
          if (cancelledEndDate) {
            const endDateOnly = new Date(
              cancelledEndDate.year,
              cancelledEndDate.month - 1,
              cancelledEndDate.day,
            );

            if (jobDateOnly > endDateOnly) {
              return false;
            }
          }

          return true;
        });
      }
    }

    return filtered;
  }, [
    jobList,
    selectedTab,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
  ]);

  // จัดเรียงตามกติกา: แท็บ 1-2 (emergency ก่อน + เวลา), แท็บ 3-4 (เวลาอย่างเดียว)
  const sortedJobs = useMemo(
    () => sortJobs(filteredJobs, selectedTab),
    [filteredJobs, selectedTab],
  );

  // Helper function สำหรับ clear date filters
  const clearCompletedDateFilter = () => {
    setCompletedStartDate(null);
    setCompletedEndDate(null);
  };

  const clearCancelledDateFilter = () => {
    setCancelledStartDate(null);
    setCancelledEndDate(null);
  };

  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setCurrentPage: updateCurrentPage,
    setRowsPerPage: updateRowsPerPage,
  } = usePagination(sortedJobs, { initialRowsPerPage: 5 });
  const paginatedJobs = paginatedItems;

  // รีเซ็ตหน้าไปที่ 1 เมื่อเปลี่ยนแท็บหรือ date filter
  useEffect(() => {
    updateCurrentPage(1);
    setSelectedKeys(new Set());
    setSelectedJob(null);
    setIsDrawerOpen(false);
  }, [
    selectedTab,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
    updateCurrentPage,
  ]);

  // Handler สำหรับ refresh ข้อมูล
  const handleRefresh = () => {
    fetchPorterRequests();
  };

  // Handler สำหรับการเลือก row
  const handleSelectionChange = (keys: any) => {
    if (keys === "all") {
      setSelectedKeys(new Set());
      setSelectedJob(null);
      setIsDrawerOpen(false);

      return;
    }

    const keysSet = keys as Set<string>;

    setSelectedKeys(keysSet);

    if (keysSet.size > 0) {
      // หา job ที่ถูกเลือกจาก sortedJobs (ทั้งหมดใน tab)
      const selectedKey = Array.from(keysSet)[0];
      const job = sortedJobs.find((item) => item.id === selectedKey);

      if (job) {
        setSelectedJob(job);
        setIsDrawerOpen(true);
      }
    } else {
      setSelectedJob(null);
      setIsDrawerOpen(false);
    }
  };

  // Handler สำหรับปิด Drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedKeys(new Set());
    setSelectedJob(null);
  };

  // Handler สำหรับมอบหมายงาน (เลือกผู้ปฏิบัติ) → สถานะ WAITING_ACCEPT
  const handleAssignJob = async (
    jobId: string,
    staffId: string,
    staffName: string,
  ) => {
    try {
      const response = await fetch(`/api/porter/requests/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "WAITING_ACCEPT",
          assignedToId: staffId,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setJobList((prevList) =>
          prevList.map((job) => (job.id === jobId ? result.data : job)),
        );

        if (selectedJob?.id === jobId) {
          setSelectedJob(result.data);
        }

        addToast({
          title: "มอบหมายสำเร็จ",
          description: `มอบหมายให้ ${staffName} แล้ว รอผู้ปฏิบัติรับงาน`,
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถมอบหมายงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถมอบหมายงานได้",
        color: "danger",
      });
    }
  };

  // Handler สำหรับรับงาน (ผู้ปฏิบัติกดรับ) → สถานะ IN_PROGRESS
  const handleAcceptJob = async (
    jobId: string,
    staffId: string,
    staffName: string,
  ) => {
    try {
      // เรียก API เพื่ออัปเดตสถานะเป็น in-progress
      const response = await fetch(`/api/porter/requests/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          assignedToId: staffId,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // อัปเดต jobList ด้วยข้อมูลที่ได้จาก API
        setJobList((prevList) =>
          prevList.map((job) => (job.id === jobId ? result.data : job)),
        );

        // อัปเดต selectedJob ถ้ายังเลือกอยู่
        if (selectedJob?.id === jobId) {
          setSelectedJob(result.data);
        }

        addToast({
          title: "รับงานสำเร็จ",
          description: `รับงานสำเร็จ ผู้ปฎิบัติงาน: ${staffName}`,
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถรับงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถรับงานได้",
        color: "danger",
      });
    }
  };

  // Handler สำหรับยกเลิกงาน
  const handleCancelJob = async (jobId: string, cancelledReason?: string) => {
    try {
      // เรียก API เพื่ออัปเดตสถานะเป็น cancelled
      const response = await fetch(`/api/porter/requests/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelledReason: cancelledReason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // อัปเดต jobList ด้วยข้อมูลที่ได้จาก API
        setJobList((prevList) =>
          prevList.map((job) => (job.id === jobId ? result.data : job)),
        );

        // อัปเดต selectedJob ถ้ายังเลือกอยู่
        if (selectedJob?.id === jobId) {
          setSelectedJob(result.data);
        }

        addToast({
          title: "ยกเลิกงานสำเร็จ",
          description: "ยกเลิกงานสำเร็จ",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถยกเลิกงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกงานได้",
        color: "danger",
      });
    }
  };

  // Handler สำหรับทำเสร็จสิ้นงาน
  const handleCompleteJob = async (jobId: string) => {
    try {
      // เรียก API เพื่ออัปเดตสถานะเป็น completed
      const response = await fetch(`/api/porter/requests/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // อัปเดต jobList ด้วยข้อมูลที่ได้จาก API
        setJobList((prevList) =>
          prevList.map((job) => (job.id === jobId ? result.data : job)),
        );

        // อัปเดต selectedJob ถ้ายังเลือกอยู่
        if (selectedJob?.id === jobId) {
          setSelectedJob(result.data);
        }

        addToast({
          title: "ทำเสร็จสิ้นงานสำเร็จ",
          description: "ทำเสร็จสิ้นงานสำเร็จ",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถทำเสร็จสิ้นงานได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถทำเสร็จสิ้นงานได้",
        color: "danger",
      });
    }
  };

  // Handler สำหรับอัปเดตข้อมูลงาน
  const handleUpdateJob = (
    jobId: string,
    updatedForm: PorterRequestFormData,
  ) => {
    setJobList((prevList) =>
      prevList.map((job) =>
        job.id === jobId ? { ...job, form: updatedForm } : job,
      ),
    );
    // อัปเดต selectedJob ถ้ายังเลือกอยู่
    if (selectedJob?.id === jobId) {
      setSelectedJob({
        ...selectedJob,
        form: updatedForm,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            รายการคำขอรับพนักงานเปล
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-default-600">
          <ClockIcon className="w-5 h-5" />
          <div className="text-sm">
            <div className="font-medium">
              {formatDateTimeThai(currentDateTime)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Card className="border-2 border-default-200">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <ClipboardListIcon className="w-6 h-6" />
                <h2 className="text-xl font-semibold text-foreground">
                  รายการคำขอ
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-default-600">
                  คำขอทั้งหมด {filteredJobs.length} รายการ
                </div>
                <Button
                  color="primary"
                  isLoading={isLoading}
                  size="sm"
                  title="รีเฟรชข้อมูล"
                  variant="flat"
                  onPress={handleRefresh}
                >
                  รีเฟรชข้อมูล
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* แสดง Loading หรือ Error */}
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="text-default-600">กำลังโหลดข้อมูล...</div>
              </div>
            )}
            {error && !isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="text-danger">{error}</div>
              </div>
            )}
            {/* Tab Navigation - HeroUI Tabs */}
            {!isLoading && !error && (
              <Tabs
                aria-label="รายการคำขอ"
                classNames={{
                  tabList: "w-full",
                  tab: "data-[selected=true]:bg-primary-500 data-[selected=true]:text-white data-[selected=true]:hover:bg-primary/80",
                }}
                color="primary"
                selectedKey={selectedTab}
                size="lg"
                variant="bordered"
                onSelectionChange={(key) => setSelectedTab(key as JobListTab)}
              >
                <Tab
                  key="waiting"
                  title={
                    <div className="flex items-center justify-center space-x-2">
                      <ClipboardListIcon className="w-4 h-4" />
                      <span>รอศูนย์เปลรับงาน</span>
                      <Chip
                        color="danger"
                        size="sm"
                        variant={
                          selectedTab === "waiting" ? "solid" : "bordered"
                        }
                      >
                        {waitingCount}
                      </Chip>
                    </div>
                  }
                >
                  <JobTable
                    currentPage={currentPage}
                    endIndex={endIndex}
                    items={paginatedJobs}
                    paginationId="rows-per-page"
                    rowsPerPage={rowsPerPage}
                    selectedKeys={selectedKeys}
                    sortedJobs={sortedJobs}
                    startIndex={startIndex}
                    totalPages={totalPages}
                    onPageChange={updateCurrentPage}
                    onRowsPerPageChange={updateRowsPerPage}
                    onSelectionChange={handleSelectionChange}
                  />
                </Tab>
                <Tab
                  key="in-progress"
                  title={
                    <div className="flex items-center justify-center space-x-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>กำลังดำเนินการ</span>
                      <Chip
                        color="warning"
                        size="sm"
                        variant={
                          selectedTab === "in-progress" ? "solid" : "bordered"
                        }
                      >
                        {inProgressCount}
                      </Chip>
                    </div>
                  }
                >
                  <JobTable
                    currentPage={currentPage}
                    endIndex={endIndex}
                    items={paginatedJobs}
                    paginationId="rows-per-page-2"
                    rowsPerPage={rowsPerPage}
                    sortedJobs={sortedJobs}
                    startIndex={startIndex}
                    totalPages={totalPages}
                    onPageChange={updateCurrentPage}
                    onRowsPerPageChange={updateRowsPerPage}
                    onSelectionChange={handleSelectionChange}
                  />
                </Tab>
                <Tab
                  key="completed"
                  title={
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>เสร็จสิ้น</span>
                      <Chip
                        color="success"
                        size="sm"
                        variant={
                          selectedTab === "completed" ? "solid" : "bordered"
                        }
                      >
                        {completedCount}
                      </Chip>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* Date Range Filter */}
                    <Card className="border border-default-200">
                      <CardBody>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DatePicker
                              label="วันที่เริ่มต้น"
                              maxValue={completedEndDate || undefined}
                              selectorIcon={
                                <CalendarIcon className="w-4 h-4" />
                              }
                              value={completedStartDate}
                              variant="bordered"
                              onChange={(date) => {
                                setCompletedStartDate(date);
                                // ถ้าวันที่เริ่มต้นมากกว่าวันที่สิ้นสุด ให้ล้างวันที่สิ้นสุด
                                if (
                                  date &&
                                  completedEndDate &&
                                  date.compare(completedEndDate) > 0
                                ) {
                                  setCompletedEndDate(null);
                                }
                              }}
                            />
                            <DatePicker
                              label="วันที่สิ้นสุด"
                              minValue={completedStartDate || undefined}
                              selectorIcon={
                                <CalendarIcon className="w-4 h-4" />
                              }
                              value={completedEndDate}
                              variant="bordered"
                              onChange={(date) => setCompletedEndDate(date)}
                            />
                          </div>
                          {(completedStartDate || completedEndDate) && (
                            <Button
                              color="default"
                              size="md"
                              variant="flat"
                              onPress={clearCompletedDateFilter}
                            >
                              ล้างตัวกรอง
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                    <JobTable
                      currentPage={currentPage}
                      endIndex={endIndex}
                      items={paginatedJobs}
                      paginationId="rows-per-page-3"
                      rowsPerPage={rowsPerPage}
                      sortedJobs={sortedJobs}
                      startIndex={startIndex}
                      totalPages={totalPages}
                      onPageChange={updateCurrentPage}
                      onRowsPerPageChange={updateRowsPerPage}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                </Tab>
                <Tab
                  key="cancelled"
                  title={
                    <div className="flex items-center justify-center space-x-2">
                      <XMarkIcon className="w-4 h-4" />
                      <span>ยกเลิก</span>
                      <Chip
                        color="danger"
                        size="sm"
                        variant={
                          selectedTab === "cancelled" ? "solid" : "bordered"
                        }
                      >
                        {cancelledCount}
                      </Chip>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* Date Range Filter */}
                    <Card className="border border-default-200">
                      <CardBody>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DatePicker
                              label="วันที่เริ่มต้น"
                              maxValue={cancelledEndDate || undefined}
                              selectorIcon={
                                <CalendarIcon className="w-4 h-4" />
                              }
                              value={cancelledStartDate}
                              variant="bordered"
                              onChange={(date) => {
                                setCancelledStartDate(date);
                                // ถ้าวันที่เริ่มต้นมากกว่าวันที่สิ้นสุด ให้ล้างวันที่สิ้นสุด
                                if (
                                  date &&
                                  cancelledEndDate &&
                                  date.compare(cancelledEndDate) > 0
                                ) {
                                  setCancelledEndDate(null);
                                }
                              }}
                            />
                            <DatePicker
                              label="วันที่สิ้นสุด"
                              minValue={cancelledStartDate || undefined}
                              selectorIcon={
                                <CalendarIcon className="w-4 h-4" />
                              }
                              value={cancelledEndDate}
                              variant="bordered"
                              onChange={(date) => setCancelledEndDate(date)}
                            />
                          </div>
                          {(cancelledStartDate || cancelledEndDate) && (
                            <Button
                              color="default"
                              size="md"
                              variant="flat"
                              onPress={clearCancelledDateFilter}
                            >
                              ล้างตัวกรอง
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                    <JobTable
                      currentPage={currentPage}
                      endIndex={endIndex}
                      items={paginatedJobs}
                      paginationId="rows-per-page-4"
                      rowsPerPage={rowsPerPage}
                      sortedJobs={sortedJobs}
                      startIndex={startIndex}
                      totalPages={totalPages}
                      onPageChange={updateCurrentPage}
                      onRowsPerPageChange={updateRowsPerPage}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                </Tab>
              </Tabs>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Job Detail Drawer */}
      <JobDetailDrawer
        isOpen={isDrawerOpen}
        job={selectedJob}
        onAcceptJob={handleAcceptJob}
        onAssignJob={handleAssignJob}
        onCancelJob={handleCancelJob}
        onClose={handleCloseDrawer}
        onCompleteJob={handleCompleteJob}
        onUpdateJob={handleUpdateJob}
      />
    </div>
  );
}
