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
  addToast,
} from "@heroui/react";

import { JobTable, JobDetailDrawer } from "./components";

import {
  ClockIcon,
  ClipboardListIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";
import { formatDateTimeThai } from "@/lib/utils";
import {
  JobListTab,
  PorterJobItem,
  PorterRequestFormData,
} from "@/types/porter";
import { sortJobs } from "@/lib/porter";

// ========================================
// PORTER JOB LIST PAGE
// ========================================

export default function PorterJobListPage() {
  const [selectedTab, setSelectedTab] = useState<JobListTab>("waiting");
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [jobList, setJobList] = useState<PorterJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

      // เพิ่ม pagination params ถ้าต้องการ (ตอนนี้ดึงทั้งหมดก่อน)
      queryParams.append("page_size", "1000"); // ดึงข้อมูลจำนวนมากเพื่อรองรับการ filter ใน frontend

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
            const tokenResponse = await fetch("/api/porter/stream-token");
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
            // eslint-disable-next-line no-console
            console.error("[SSE] Failed to get token, falling back to Next.js API route:", error);
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
                          console.log("[SSE] Request already exists in list, skipping:", data.id);
                          return prevList;
                        }

                        // eslint-disable-next-line no-console
                        console.log("[SSE] Adding new request to list:", data.id);
                        return [...prevList, data];
                      });

                      // แสดง toast notification
                      addToast({
                        title: "มีคำขอใหม่",
                        description: `คำขอจาก ${data.form?.requesterName || "ไม่ระบุ"} ได้รับการเพิ่มแล้ว`,
                        color: "success",
                      });
                    } else if (
                      type === "UPDATED" || type === "STATUS_CHANGED"
                    ) {
                      // eslint-disable-next-line no-console
                      console.log("[SSE] Processing UPDATED/STATUS_CHANGED event:", data.id);
                      
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
                        addToast({
                          title: "สถานะเปลี่ยน",
                          description: `สถานะของคำขอ ${data.form?.patientHN || "ไม่ระบุ"} เปลี่ยนเป็น ${data.status === "waiting" ? "รอศูนย์เปลรับงาน" : data.status === "in-progress" ? "กำลังดำเนินการ" : data.status === "completed" ? "เสร็จสิ้น" : "ยกเลิก"}`,
                          color: "primary",
                        });
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
                      // eslint-disable-next-line no-console
                      console.warn("[SSE] Unknown update type:", type);
                    }
                  } else {
                    // eslint-disable-next-line no-console
                    console.warn("[SSE] Missing type or data in update:", {
                      hasType: !!updateData.type,
                      hasData: !!updateData.data,
                      updateData,
                    });
                  }
                }
              } catch (error) {
                // eslint-disable-next-line no-console
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

        // eslint-disable-next-line no-console
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

  // คำนวณจำนวนงานตามสถานะสำหรับแสดงบนแท็บ
  const waitingCount = useMemo(
    () => jobList.filter((job) => job.status === "waiting").length,
    [jobList],
  );
  const inProgressCount = useMemo(
    () => jobList.filter((job) => job.status === "in-progress").length,
    [jobList],
  );
  const completedCount = useMemo(
    () => jobList.filter((job) => job.status === "completed").length,
    [jobList],
  );
  const cancelledCount = useMemo(
    () => jobList.filter((job) => job.status === "cancelled").length,
    [jobList],
  );

  // กรองข้อมูลตามแท็บที่เลือก
  const filteredJobs = jobList.filter((job) => job.status === selectedTab);

  // จัดเรียงตามกติกา: แท็บ 1-2 (emergency ก่อน + เวลา), แท็บ 3-4 (เวลาอย่างเดียว)
  const sortedJobs = useMemo(
    () => sortJobs(filteredJobs, selectedTab),
    [filteredJobs, selectedTab],
  );

  // คำนวณข้อมูลสำหรับ pagination
  const totalPages = Math.ceil(sortedJobs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

  // รีเซ็ตหน้าไปที่ 1 เมื่อเปลี่ยนแท็บ
  useEffect(() => {
    setCurrentPage(1);
    setSelectedKeys(new Set());
    setSelectedJob(null);
    setIsDrawerOpen(false);
  }, [selectedTab]);

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

  // Handler สำหรับรับงาน
  const handleAcceptJob = async (
    jobId: string,
    staffId: string,
    staffName: string,
  ) => {
    // TODO: เรียก API เพื่ออัพเดทสถานะ
    // ตอนนี้อัพเดทเฉพาะ frontend state ก่อน
    setJobList((prevList) =>
      prevList.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "in-progress" as JobListTab,
              assignedTo: staffId,
              assignedToName: staffName,
            }
          : job,
      ),
    );
    // อัปเดต selectedJob ถ้ายังเลือกอยู่
    if (selectedJob?.id === jobId) {
      setSelectedJob({
        ...selectedJob,
        status: "in-progress" as JobListTab,
        assignedTo: staffId,
        assignedToName: staffName,
      });
    }
    // Refresh ข้อมูลหลังจากอัพเดท
    await fetchPorterRequests();
  };

  // Handler สำหรับยกเลิกงาน
  const handleCancelJob = async (jobId: string) => {
    // TODO: เรียก API เพื่ออัพเดทสถานะ
    // ตอนนี้อัพเดทเฉพาะ frontend state ก่อน
    setJobList((prevList) =>
      prevList.map((job) =>
        job.id === jobId ? { ...job, status: "cancelled" as JobListTab } : job,
      ),
    );
    // อัปเดต selectedJob ถ้ายังเลือกอยู่
    if (selectedJob?.id === jobId) {
      setSelectedJob({
        ...selectedJob,
        status: "cancelled" as JobListTab,
      });
    }
    // Refresh ข้อมูลหลังจากอัพเดท
    await fetchPorterRequests();
  };

  // Handler สำหรับทำเสร็จสิ้นงาน
  const handleCompleteJob = async (jobId: string) => {
    // TODO: เรียก API เพื่ออัพเดทสถานะ
    // ตอนนี้อัพเดทเฉพาะ frontend state ก่อน
    setJobList((prevList) =>
      prevList.map((job) =>
        job.id === jobId ? { ...job, status: "completed" as JobListTab } : job,
      ),
    );
    // อัปเดต selectedJob ถ้ายังเลือกอยู่
    if (selectedJob?.id === jobId) {
      setSelectedJob({
        ...selectedJob,
        status: "completed" as JobListTab,
      });
    }
    // Refresh ข้อมูลหลังจากอัพเดท
    await fetchPorterRequests();
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
                  size="sm"
                  isLoading={isLoading}
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
                      variant={selectedTab === "waiting" ? "solid" : "bordered"}
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
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={setRowsPerPage}
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
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={setRowsPerPage}
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
                <JobTable
                  currentPage={currentPage}
                  endIndex={endIndex}
                  items={paginatedJobs}
                  paginationId="rows-per-page-3"
                  rowsPerPage={rowsPerPage}
                  sortedJobs={sortedJobs}
                  startIndex={startIndex}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={setRowsPerPage}
                  onSelectionChange={handleSelectionChange}
                />
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
                <JobTable
                  currentPage={currentPage}
                  endIndex={endIndex}
                  items={paginatedJobs}
                  paginationId="rows-per-page-4"
                  rowsPerPage={rowsPerPage}
                  sortedJobs={sortedJobs}
                  startIndex={startIndex}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={setRowsPerPage}
                  onSelectionChange={handleSelectionChange}
                />
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
        onCancelJob={handleCancelJob}
        onClose={handleCloseDrawer}
        onCompleteJob={handleCompleteJob}
        onUpdateJob={handleUpdateJob}
      />
    </div>
  );
}
