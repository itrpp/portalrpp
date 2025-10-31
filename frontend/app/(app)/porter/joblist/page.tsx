"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
} from "@heroui/react";

import {
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";
import { formatDateTimeThai } from "@/lib/utils";

// ========================================
// PORTER JOB LIST PAGE
// ========================================

type JobListTab = "waiting" | "in-progress" | "completed" | "cancelled";

interface JobItem {
  id: string;
  jobNumber: string;
  description: string;
  requestDate: string;
  requester: string;
  emergency: boolean;
  pickup: string;
  delivery: string;
  status: JobListTab;
}

export default function PorterJobListPage() {
  const [selectedTab, setSelectedTab] = useState<JobListTab>("waiting");
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

  // ตัวอย่างข้อมูลรายการคำขอจำลอง (สุ่มข้อมูล 1 วัน)
  const [jobList] = useState<JobItem[]>(() => {
    const pad = (n: number) => String(n).padStart(2, "0");

    const statuses: JobListTab[] = [
      "waiting",
      "in-progress",
      "completed",
      "cancelled",
    ];

    const requesters = [
      "พยาบาล สมใจ",
      "พยาบาล สุดา",
      "พยาบาล วิชัย",
      "แพทย์ วิไล",
      "แพทย์ กนก",
      "เภสัชกร มาลี",
      "หัวหน้าแผนกคลัง",
      "เจ้าหน้าที่ ER",
    ];

    const pickupPoints = [
      "ห้อง 101",
      "ห้อง 205",
      "ห้อง 302",
      "ห้อง 310",
      "วอร์ด 4A",
      "ICU",
      "ER",
      "แผนกเภสัช",
      "คลังเวชภัณฑ์",
    ];

    const deliveryPoints = [
      "X-ray",
      "OR-3",
      "OPD",
      "ICU",
      "ER",
      "ห้องตรวจ 2",
      "คลังเวชภัณฑ์",
    ];

    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const choice = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

    const total = 220; // ปริมาณข้อมูลเพื่อทดสอบการเลื่อนตาราง

    const items: JobItem[] = Array.from({ length: total }, (_, i) => {
      const idx = i + 1;
      const hour = randInt(6, 21);
      const minute = randInt(0, 59);
      const pickup = choice(pickupPoints);
      let delivery = choice(deliveryPoints);
      // หลีกเลี่ยง pickup == delivery ที่ซ้ำกันแบบไม่สมเหตุสมผล

      if (delivery === pickup) {
        delivery = choice(deliveryPoints);
      }
      const emergency = Math.random() < 0.2; // 20% เป็นเคสเร่งด่วน
      const status = choice(statuses);

      return {
        id: String(idx),
        jobNumber: `REQ-${pad(idx)}`,
        description: `รับผู้ป่วยจาก${pickup}`,
        requestDate: `2024-01-15 ${pad(hour)}:${pad(minute)}`,
        requester: choice(requesters),
        emergency,
        pickup,
        delivery,
        status,
      };
    });

    return items;
  });

  // กรองข้อมูลตามแท็บที่เลือก
  const filteredJobs = jobList.filter((job) => job.status === selectedTab);

  // จัดเรียงตามกติกา: แท็บ 1-2 (emergency ก่อน + เวลา), แท็บ 3-4 (เวลาอย่างเดียว)
  const sortedJobs = useMemo(() => {
    const toTime = (s: string) => new Date(s.replace(" ", "T")).getTime();

    if (selectedTab === "waiting" || selectedTab === "in-progress") {
      return [...filteredJobs].sort((a, b) => {
        if (a.emergency !== b.emergency) return a.emergency ? -1 : 1;

        return toTime(a.requestDate) - toTime(b.requestDate);
      });
    }

    return [...filteredJobs].sort(
      (a, b) => toTime(a.requestDate) - toTime(b.requestDate),
    );
  }, [filteredJobs, selectedTab]);

  // นับจำนวนงานตามสถานะสำหรับแสดงบนแท็บ
  const waitingCount = useMemo(
    () => jobList.filter((job) => job.status === "waiting").length,
    [jobList],
  );
  const inProgressCount = useMemo(
    () => jobList.filter((job) => job.status === "in-progress").length,
    [jobList],
  );

  // คำนวณข้อมูลสำหรับ pagination
  const totalPages = Math.ceil(sortedJobs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

  // columns สำหรับ HeroUI Table use-case (ซ่อน header ใช้เซลล์เดียว render layout ทั้งแถว)
  const columns = useMemo(() => [{ key: "job", label: "รายการ" }], []);

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
                    selectedTab === "waiting"
                      ? "bg-white shadow text-primary font-medium"
                      : "text-default-600 hover:text-default-900"
                  }`}
                  onClick={() => setSelectedTab("waiting")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <ClipboardListIcon className="w-4 h-4" />
                    <span>รอศูนย์เปลรับงาน</span>
                    <Chip color="danger" size="sm" variant="flat">
                      {waitingCount}
                    </Chip>
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
                    <Chip color="warning" size="sm" variant="flat">
                      {inProgressCount}
                    </Chip>
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

            {/* Tab Content - HeroUI use-case: ซ่อนหัวตาราง เรนเดอร์เซลล์เดียวแบบ custom */}
            <Table removeWrapper aria-label="รายการคำขอ" className="w-full">
              <TableHeader columns={columns}>
                {(column) => (
                  <TableColumn key={column.key} hideHeader>
                    {column.label}
                  </TableColumn>
                )}
              </TableHeader>
              <TableBody
                emptyContent="ไม่มีรายการคำขอในหมวดนี้"
                items={paginatedJobs}
              >
                {(item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div
                        className={`w-full rounded-md border ${
                          item.status === "waiting"
                            ? "bg-success-50/30 border-success-100"
                            : "bg-content1 border-default-200"
                        } p-3`}
                      >
                        {/* แถวบน: เวลาและแถบ tags หลัก */}
                        <div className="flex items-center gap-2 text-sm">
                          <Chip color="default" size="sm" variant="flat">
                            {new Date(
                              item.requestDate.replace(" ", "T"),
                            ).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </Chip>
                          {item.emergency && (
                            <Chip color="danger" size="sm" variant="flat">
                              ด่วน
                            </Chip>
                          )}
                          <span className="text-default-700 font-medium">
                            {item.description}
                          </span>
                          <span className="text-default-500">
                            ➜ {item.delivery}
                          </span>

                          {/* ตัวอย่างแท็กหน่วยงาน/ความเร่งด่วน (dummy) */}
                          <Chip color="secondary" size="sm" variant="flat">
                            {item.requester}
                          </Chip>
                        </div>

                        {/* แถวล่าง: สถานะ + ปุ่มการจัดการตามข้อกำหนดแท็บที่ 1 */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            {item.status === "waiting" && (
                              <Chip color="default" size="sm" variant="flat">
                                {"รอศูนย์เปลรับงาน ผู้รับงาน "}
                                {"[นายอริญชย์ ศรีชูเปี่ยม]"}
                              </Chip>
                            )}
                            {item.status === "in-progress" && (
                              <Chip color="warning" size="sm" variant="flat">
                                {"กำลังดำเนินการ ผู้ดำเนินการ "}
                                {"[นายอริญชย์ ศรีชูเปี่ยม]"}
                              </Chip>
                            )}
                            {item.status === "completed" && (
                              <Chip color="success" size="sm" variant="flat">
                                เสร็จสิ้น
                              </Chip>
                            )}
                            {item.status === "cancelled" && (
                              <Chip color="danger" size="sm" variant="flat">
                                ยกเลิก ผู้ยกเลิก [นายอริญชย์ ศรีชูเปี่ยม]
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {sortedJobs.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-default-600">
                  แสดง {startIndex + 1} - {""}
                  {Math.min(endIndex, sortedJobs.length)} จาก {""}
                  {sortedJobs.length} รายการ
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
