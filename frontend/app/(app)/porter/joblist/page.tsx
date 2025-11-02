"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  PorterRequestFormData,
  UrgencyLevel,
  VehicleType,
  EquipmentType,
} from "@/types";
import { JobListTab, PorterJobItem } from "@/types/porter";

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
  const [jobList, setJobList] = useState<PorterJobItem[]>(() => {
    const statuses: JobListTab[] = [
      "waiting",
      "in-progress",
      "completed",
      "cancelled",
    ];

    const departments = [
      "แผนกอายุรกรรม",
      "แผนกศัลยกรรม",
      "แผนกฉุกเฉิน",
      "แผนกเภสัชกรรม",
      "แผนกไอซียู",
    ];

    const requesterNames = [
      "พยาบาล สมใจ",
      "พยาบาล สุดา",
      "พยาบาล วิชัย",
      "แพทย์ วิไล",
      "แพทย์ กนก",
      "เภสัชกร มาลี",
    ];

    const pickupPoints = [
      "ห้อง 101",
      "ห้อง 205",
      "ห้อง 302",
      "วอร์ด 4A",
      "ICU",
      "ER",
      "แผนกเภสัช",
      "คลังเวชภัณฑ์",
    ];

    const deliveryPoints = [
      "[188] [อาคารเฉลิมพระเกียรติ] X-ray",
      "[191] [อาคารเมตตาธรรม] X-ray",
      "OR-3",
      "OPD",
      "ICU",
      "ER",
      "ห้องตรวจ 2",
      "คลังเวชภัณฑ์",
    ];

    const vehicleTypes: VehicleType[] = ["รถนั่ง", "รถนอน", "รถกอล์ฟ"];
    const equipmentOptions: EquipmentType[] = [
      "Oxygen",
      "Tube",
      "IV Pump",
      "Ventilator",
      "Monitor",
      "Suction",
    ];

    const transportReasons = [
      "ผ่าตัด",
      "ตรวจพิเศษ (CT/MRI/X-Ray)",
      "รับการรักษา",
      "ย้ายห้อง/ตึก",
      "จำหน่ายผู้ป่วย",
      "ฉุกเฉิน",
      "อื่นๆ",
    ];

    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const choice = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

    const toDateTimeLocal = (d: Date) => {
      const dd = new Date(d);

      dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());

      return dd.toISOString().slice(0, 16);
    };

    const total = 100;

    // ตัวนับสำหรับจำกัดจำนวน urgencyLevel
    let urgentCount = 0; // "ฉุกเฉิน" ไม่เกิน 5
    let rushCount = 0; // "ด่วน" ไม่เกิน 10

    const items: PorterJobItem[] = Array.from({ length: total }, (_, i) => {
      const idx = i + 1;
      const pickup = choice(pickupPoints);
      let delivery = choice(deliveryPoints);

      if (delivery === pickup) delivery = choice(deliveryPoints);

      const now = new Date();

      now.setHours(randInt(6, 21), randInt(0, 59), 0, 0);

      // เลือก urgencyLevel โดยจำกัดจำนวน
      let urgencyLevel: UrgencyLevel;
      const availableOptions: UrgencyLevel[] = [];

      if (urgentCount < 5) {
        availableOptions.push("ฉุกเฉิน");
      }
      if (rushCount < 10) {
        availableOptions.push("ด่วน");
      }
      availableOptions.push("ปกติ"); // "ปกติ" ไม่มีจำกัด

      urgencyLevel = choice(availableOptions);

      // อัพเดทตัวนับ
      if (urgencyLevel === "ฉุกเฉิน") {
        urgentCount++;
      } else if (urgencyLevel === "ด่วน") {
        rushCount++;
      }
      const equipmentCount = randInt(0, 3);
      const equipment: EquipmentType[] = Array.from(
        { length: equipmentCount },
        () => choice(equipmentOptions),
      ).filter((v, idx2, arr) => arr.indexOf(v) === idx2);

      const form: PorterRequestFormData = {
        requesterDepartment: choice(departments),
        requesterName: choice(requesterNames),
        requesterPhone: `08${randInt(10000000, 99999999)}`,

        patientName: `ผู้ป่วย ${idx}`,
        patientHN: `${String(randInt(100000, 999999))}/${String(
          randInt(10, 99),
        )}`,
        patientAge: randInt(1, 99),
        patientGender: choice(["ชาย", "หญิง", "ไม่ระบุ"] as const),
        patientWeight: randInt(30, 95),

        pickupLocation: pickup,
        deliveryLocation: delivery,
        requestedDateTime: toDateTimeLocal(now),
        urgencyLevel,
        vehicleType: choice(vehicleTypes),
        equipment,
        assistanceCount: randInt(0, 3),
        hasVehicle: choice(["มี", "ไม่มี", ""] as const),
        returnTrip: choice([
          "ไปส่งอย่างเดียว",
          "รับกลับด้วย",
          "",
        ] as const),

        transportReason: choice(transportReasons),
        medicalAllergies: Math.random() < 0.2 ? "Penicillin" : "",
        specialNotes: Math.random() < 0.2 ? "เฝ้าระวัง O2 sat" : "",
        patientCondition:
          Math.random() < 0.5 ? "เดินไม่ได้ ต้องใช้รถนอน" : "รู้สึกตัวดี",
      };

      return {
        id: String(idx),
        status: choice(statuses),
        form,
      };
    });

    return items;
  });

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
  const sortedJobs = useMemo(() => {
    const toTime = (s: string) => new Date(s).getTime();
    const urgencyRank = (u: UrgencyLevel) =>
      u === "ฉุกเฉิน" ? 0 : u === "ด่วน" ? 1 : 2;

    return [...filteredJobs].sort((a, b) => {
      const rankA = urgencyRank(a.form.urgencyLevel);
      const rankB = urgencyRank(b.form.urgencyLevel);

      if (rankA !== rankB) return rankA - rankB;

      return (
        toTime(a.form.requestedDateTime) - toTime(b.form.requestedDateTime)
      );
    });
  }, [filteredJobs, selectedTab]);

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

  // ฟังก์ชันสำหรับเล่นเสียงแจ้งเตือน (เสียงกลิ่ง)
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // สร้างเสียงกลิ่งด้วย multiple oscillators (harmonic tones)
      const createBellTone = (
        baseFreq: number,
        time: number,
        duration: number,
      ) => {
        const frequencies = [baseFreq, baseFreq * 2.76, baseFreq * 5.4]; // Harmonic overtones
        const amplitudes = [0.5, 0.25, 0.15];

        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(freq, time);

          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(amplitudes[index], time + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start(time);
          oscillator.stop(time + duration);
        });
      };

      const now = audioContext.currentTime;
      const intervalBetweenRounds = 0.2; // เวลาระหว่างรอบ (วินาที)

      // เล่นเสียง 2 รอบ
      for (let round = 0; round < 2; round++) {
        const roundStartTime = now + round * (0.1 + intervalBetweenRounds);

        // เสียงกลิ่งครั้งแรก
        createBellTone(800, roundStartTime, 0.1);
        // เสียงกลิ่งครั้งที่สอง (ตามหลัง)
        createBellTone(1000, roundStartTime + 0.15, 0.25);
      }
    } catch {
      // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
      // จะไม่แสดง error
    }
  }, []);

  // ฟังก์ชันสำหรับเล่นเสียงไซเรน (สำหรับเคสเร่งด่วนฉุกเฉิน)
  const playSirenSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      const now = audioContext.currentTime;
      const duration = 1.5; // ความยาวแต่ละรอบ (วินาที)
      const cycles = 3; // จำนวนรอบไซเรน

      for (let cycle = 0; cycle < cycles; cycle++) {
        const cycleStartTime = now + cycle * (duration + 0.2);

        // สร้างเสียงไซเรนด้วยการปรับความถี่ขึ้น-ลง (sweep)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sawtooth"; // ใช้ sawtooth เพื่อให้เสียงคมชัดเหมือนไซเรน
        oscillator.frequency.setValueAtTime(600, cycleStartTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          1400,
          cycleStartTime + duration / 2,
        );
        oscillator.frequency.exponentialRampToValueAtTime(
          600,
          cycleStartTime + duration,
        );

        gainNode.gain.setValueAtTime(0, cycleStartTime);
        gainNode.gain.linearRampToValueAtTime(0.6, cycleStartTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(
          0.6,
          cycleStartTime + duration - 0.05,
        );
        gainNode.gain.linearRampToValueAtTime(0, cycleStartTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(cycleStartTime);
        oscillator.stop(cycleStartTime + duration);
      }
    } catch {
      // ถ้าไม่สามารถเล่นเสียงได้ (เช่น user ยังไม่ได้ interact กับหน้า)
      // จะไม่แสดง error
    }
  }, []);

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
                  color="secondary"
                  size="sm"
                  title="ทดสอบ Alert"
                  variant="flat"
                  onPress={() => {
                    playSirenSound();
                    alert(
                      `ทดสอบ Alert:\nจำนวนคำขอทั้งหมด: ${filteredJobs.length} รายการ`,
                    );
                  }}
                >
                  ทดสอบ Alert
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  title="ทดสอบ Toast"
                  variant="flat"
                  onPress={() => {
                    playNotificationSound();
                    addToast({
                      title: "ทดสอบ Toast Notification",
                      description: `จำนวนคำขอทั้งหมด: ${filteredJobs.length} รายการ`,
                      color: "success",
                    });
                  }}
                >
                  ทดสอบ Toast
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
        onUpdateJob={handleUpdateJob}
      />
    </div>
  );
}
