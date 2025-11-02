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
import {
  generateMockPorterJobs,
  generateSingleDummyJob,
  generateSingleEmergencyJob,
  sortJobs,
  playNotificationSound,
  playSirenSound,
} from "@/lib/porter";

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

  // อัพเดทเวลาแบบ real-time ทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // ตัวอย่างข้อมูลรายการคำขอจำลอง (สุ่มข้อมูล 1 วัน)
  const [jobList, setJobList] = useState<PorterJobItem[]>(() =>
    generateMockPorterJobs(100),
  );

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
  const handleAcceptJob = (
    jobId: string,
    staffId: string,
    staffName: string,
  ) => {
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
  };

  // Handler สำหรับยกเลิกงาน
  const handleCancelJob = (jobId: string) => {
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
  };

  // Handler สำหรับทำเสร็จสิ้นงาน
  const handleCompleteJob = (jobId: string) => {
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
                  color="danger"
                  size="sm"
                  title="สร้าง Job ฉุกเฉิน"
                  variant="flat"
                  onPress={() => {
                    const newJob = generateSingleEmergencyJob();

                    setJobList((prevList) => [newJob, ...prevList]);
                    playSirenSound();
                    addToast({
                      title: "⚠️ สร้าง Job ฉุกเฉิน",
                      description: `เพิ่มงานฉุกเฉิน: ${newJob.form.patientName} (${newJob.id})`,
                      color: "danger",
                    });
                  }}
                >
                  สร้าง Job ฉุกเฉิน
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  title="สร้าง Job Dummy"
                  variant="flat"
                  onPress={() => {
                    const newJob = generateSingleDummyJob();

                    setJobList((prevList) => [newJob, ...prevList]);
                    playNotificationSound();
                    addToast({
                      title: "สร้าง Job Dummy สำเร็จ",
                      description: `เพิ่มงานใหม่: ${newJob.form.urgencyLevel} - ${newJob.form.patientName} (${newJob.id})`,
                      color:
                        newJob.form.urgencyLevel === "ด่วน"
                          ? "warning"
                          : "success",
                    });
                  }}
                >
                  สร้าง Job Dummy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* Tab Navigation - HeroUI Tabs */}
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
