"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Pagination,
  Button,
  addToast,
} from "@heroui/react";

import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardListIcon,
  EyeIcon,
  HandStopIcon,
  PlayIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { formatDateTimeThai, formatThaiDateTimeShort } from "@/lib/utils";

// ========================================
// PORTER JOB LIST PAGE
// ========================================

type JobListTab = "new" | "in-progress" | "completed" | "waiting" | "cancelled";

interface JobItem {
  id: string;
  jobNumber: string;
  description: string;
  requestDate: string;
  requester: string;
  status: JobListTab;
}

export default function PorterJobListPage() {
  const [selectedTab, setSelectedTab] = useState<JobListTab>("new");
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);

  // อัพเดทเวลาแบบ real-time ทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // ตัวอย่างข้อมูลรายการคำขอจำลองการใช้งาน 1 วัน (จะเชื่อมต่อ API ในอนาคต)
  const [jobList] = useState<JobItem[]>(() => {
    const pad = (n: number) => String(n).padStart(2, "0");

    const base: JobItem[] = [
      // คำขอใหม่ (เช้า)
      {
        id: "1",
        jobNumber: "REQ-001",
        description: "รับผู้ป่วยจากห้อง 101 ไป OR-3",
        requestDate: `2024-01-15 ${pad(6)}:${pad(30)}`,
        requester: "พยาบาล สมใจ",
        status: "new",
      },
      {
        id: "2",
        jobNumber: "REQ-002",
        description: "ส่งเวชระเบียนไปแผนกฉุกเฉิน (ER)",
        requestDate: `2024-01-15 ${pad(7)}:${pad(15)}`,
        requester: "แพทย์ วิไล",
        status: "new",
      },
      {
        id: "3",
        jobNumber: "REQ-003",
        description: "ส่งยาฉุกเฉินจากเภสัชไป ICU",
        requestDate: `2024-01-15 ${pad(8)}:${pad(0)}`,
        requester: "เภสัชกร มาลี",
        status: "new",
      },
      // กำลังดำเนินการ
      {
        id: "4",
        jobNumber: "REQ-004",
        description: "ขนย้ายอุปกรณ์การแพทย์จากคลังไป OPD",
        requestDate: `2024-01-15 ${pad(6)}:${pad(0)}`,
        requester: "หัวหน้าแผนกคลัง",
        status: "in-progress",
      },
      {
        id: "5",
        jobNumber: "REQ-005",
        description: "ย้ายเตียงผู้ป่วยจาก 205 ไป 310",
        requestDate: `2024-01-15 ${pad(7)}:${pad(20)}`,
        requester: "พยาบาล วิชัย",
        status: "in-progress",
      },
      // เสร็จสิ้น
      {
        id: "6",
        jobNumber: "REQ-006",
        description: "ส่งเวชระเบียนไป OPD",
        requestDate: `2024-01-15 ${pad(5)}:${pad(0)}`,
        requester: "แพทย์ กนก",
        status: "completed",
      },
      // รอรับเรื่อง
      {
        id: "7",
        jobNumber: "REQ-007",
        description: "ย้ายผู้ป่วยจาก 302 ไป 401",
        requestDate: `2024-01-15 ${pad(10)}:${pad(30)}`,
        requester: "พยาบาล สุดา",
        status: "waiting",
      },
      // ยกเลิก
      {
        id: "8",
        jobNumber: "REQ-008",
        description: "ย้ายผู้ป่วยจากห้อง A ไป B (ยกเลิก)",
        requestDate: `2024-01-15 ${pad(6)}:${pad(45)}`,
        requester: "พยาบาล กะกลางคืน",
        status: "cancelled",
      },
    ];

    // ข้อมูลจำลองเพิ่มเติมเพื่อทดสอบการเลื่อนสกอร์ของตาราง
    const extraCount = 200;
    const statuses: JobListTab[] = [
      "new",
      "in-progress",
      "completed",
      "waiting",
      "cancelled",
    ];

    const extra: JobItem[] = Array.from({ length: extraCount }, (_, i) => {
      const idx = i + 1;
      const hour = 6 + (idx % 12);
      const minute = idx % 60;
      const status = statuses[idx % statuses.length];

      return {
        id: `E${idx}`,
        jobNumber: `REQ-${pad(100 + idx)}`,
        description: `คำขอรับเปล ลำดับที่ ${idx} จากวอร์ด ${100 + (idx % 50)}`,
        requestDate: `2024-01-15 ${pad(hour)}:${pad(minute)}`,
        requester: `หน่วยงาน ${1 + (idx % 20)}`,
        status,
      };
    });

    return base.concat(extra);
  });

  // กรองข้อมูลตามแท็บที่เลือก
  const filteredJobs = jobList.filter((job) => job.status === selectedTab);

  // คำนวณข้อมูลสำหรับ pagination
  const totalPages = Math.ceil(filteredJobs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // รีเซ็ตหน้าไปที่ 1 เมื่อเปลี่ยนแท็บ
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);

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
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-default-100 p-1 rounded-lg w-full overflow-x-auto">
                <button
                  className={`flex-1 px-4 py-2 rounded-md transition-all text-sm ${
                    selectedTab === "new"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("new")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4" />
                    <span>คำขอใหม่</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-md transition-all text-sm ${
                    selectedTab === "in-progress"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("in-progress")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>กำลังดำเนินการ</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-md transition-all text-sm ${
                    selectedTab === "completed"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("completed")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>เสร็จสิ้น</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-md transition-all text-sm ${
                    selectedTab === "waiting"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("waiting")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ClipboardListIcon className="w-4 h-4" />
                    <span>รอรับเรื่อง</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-md transition-all text-sm ${
                    selectedTab === "cancelled"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("cancelled")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <XMarkIcon className="w-4 h-4" />
                    <span>ยกเลิก</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {filteredJobs.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8 space-y-2">
                <div className="text-default-600">ไม่พบรายการคำขอในหมวดนี้</div>
              </div>
            ) : (
              <Table aria-label="รายการคำขอ" className="w-full">
                <TableHeader>
                  <TableColumn>เลขที่คำขอ</TableColumn>
                  <TableColumn>รายละเอียดคำขอ</TableColumn>
                  <TableColumn>วันที่ขอ</TableColumn>
                  <TableColumn>ผู้ขอ</TableColumn>
                  <TableColumn align="center">สถานะ</TableColumn>
                  <TableColumn align="center">การจัดการ</TableColumn>
                </TableHeader>
                <TableBody emptyContent="ไม่มีรายการคำขอในหมวดนี้">
                  {paginatedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {job.jobNumber}
                      </TableCell>
                      <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {job.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatThaiDateTimeShort(
                          new Date(job.requestDate.replace(" ", "T")),
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {job.requester}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {job.status === "new" && (
                          <Chip color="primary" size="sm" variant="flat">
                            คำขอใหม่
                          </Chip>
                        )}
                        {job.status === "in-progress" && (
                          <Chip color="warning" size="sm" variant="flat">
                            กำลังดำเนินการ
                          </Chip>
                        )}
                        {job.status === "completed" && (
                          <Chip color="success" size="sm" variant="flat">
                            เสร็จสิ้น
                          </Chip>
                        )}
                        {job.status === "waiting" && (
                          <Chip color="default" size="sm" variant="flat">
                            รอรับเรื่อง
                          </Chip>
                        )}
                        {job.status === "cancelled" && (
                          <Chip color="danger" size="sm" variant="flat">
                            ยกเลิก
                          </Chip>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-2 justify-center">
                          <Button
                            color="primary"
                            size="sm"
                            startContent={<EyeIcon className="w-4 h-4" />}
                            title="ดูรายละเอียด"
                            variant="ghost"
                            onPress={() => {
                              // TODO: เปิด modal หรือหน้าแสดงรายละเอียด
                            }}
                          >
                            ดู
                          </Button>

                          {job.status === "new" && (
                            <Button
                              color="success"
                              size="sm"
                              startContent={
                                <HandStopIcon className="w-4 h-4" />
                              }
                              title="รับงาน"
                              variant="ghost"
                              onPress={() => {
                                // TODO: รับงาน
                              }}
                            >
                              รับ
                            </Button>
                          )}

                          {job.status === "waiting" && (
                            <Button
                              color="warning"
                              size="sm"
                              startContent={<PlayIcon className="w-4 h-4" />}
                              title="เริ่มดำเนินการ"
                              variant="ghost"
                              onPress={() => {
                                // TODO: เริ่มดำเนินการ
                              }}
                            >
                              เริ่ม
                            </Button>
                          )}

                          {job.status === "in-progress" && (
                            <Button
                              color="success"
                              size="sm"
                              startContent={<CheckIcon className="w-4 h-4" />}
                              title="เสร็จสิ้น"
                              variant="ghost"
                              onPress={() => {
                                // TODO: เสร็จสิ้น
                              }}
                            >
                              เสร็จ
                            </Button>
                          )}

                          {(job.status === "new" ||
                            job.status === "waiting" ||
                            job.status === "in-progress") && (
                            <Button
                              color="danger"
                              size="sm"
                              startContent={<XMarkIcon className="w-4 h-4" />}
                              title="ยกเลิก"
                              variant="ghost"
                              onPress={() => {
                                // TODO: ยกเลิกงาน
                              }}
                            >
                              ยกเลิก
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {filteredJobs.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-default-600">
                  แสดง {startIndex + 1} -{" "}
                  {Math.min(endIndex, filteredJobs.length)} จาก{" "}
                  {filteredJobs.length} รายการ
                </div>
                <Pagination
                  showControls
                  color="primary"
                  initialPage={1}
                  page={currentPage}
                  size="sm"
                  total={totalPages}
                  onChange={setCurrentPage}
                />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      className="text-sm text-default-600"
                      htmlFor="rows-per-page"
                    >
                      แสดงต่อหน้า:
                    </label>
                    <select
                      className="px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      id="rows-per-page"
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
