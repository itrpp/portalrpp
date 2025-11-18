"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  useDisclosure,
} from "@heroui/react";
import {
  Button,
  Chip,
  Divider,
  Input,
  Textarea,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  addToast,
} from "@heroui/react";

import { LocationSelector } from "./LocationSelector";
import CancelJobModal from "./CancelJobModal";

import { PorterJobItem } from "@/types/porter";
import {
  PorterRequestFormData,
  VehicleType,
  EquipmentType,
  formatLocationString,
} from "@/types/porter";
import {
  URGENCY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  EQUIPMENT_OPTIONS,
  TRANSPORT_REASON_OPTIONS,
} from "@/lib/porter";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  AmbulanceIcon,
  ClipboardListIcon,
  DocumentTextIcon,
  InfoCircleIcon,
  CarIcon,
  MedicalBagIcon,
  ToolsIcon,
  StretcherIcon,
  BedIcon,
} from "@/components/ui/icons";

interface JobDetailDrawerProps {
  isOpen: boolean;
  job: PorterJobItem | null;
  onClose: () => void;
  onAcceptJob?: (jobId: string, staffId: string, staffName: string) => void;
  onCancelJob?: (jobId: string, cancelledReason?: string) => void;
  onCompleteJob?: (jobId: string) => void;
  onUpdateJob?: (jobId: string, updatedForm: PorterRequestFormData) => void;
}

/**
 * Interface สำหรับข้อมูลเจ้าหน้าที่เปล
 */
interface PorterEmployee {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  employmentType: string;
  employmentTypeId: string;
  position: string;
  positionId: string;
  status: boolean;
}

export default function JobDetailDrawer({
  isOpen,
  job,
  onClose,
  onAcceptJob,
  onCancelJob,
  onCompleteJob,
  onUpdateJob,
}: JobDetailDrawerProps) {
  const [formData, setFormData] = useState<PorterRequestFormData | null>(null);
  const [employees, setEmployees] = useState<PorterEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const {
    isOpen: isCancelModalOpen,
    onOpen: onCancelModalOpen,
    onClose: onCancelModalClose,
  } = useDisclosure();

  // โหลดข้อมูล employees จาก API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoadingEmployees(true);
        const response = await fetch("/api/porter/employees?status=true");
        const result = await response.json();

        if (result.success && result.data) {
          // Filter เฉพาะ employees ที่มี status = true
          const activeEmployees = result.data.filter(
            (emp: PorterEmployee) => emp.status === true,
          );

          setEmployees(activeEmployees);
        }
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้",
          color: "danger",
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  // Sync form data with job when it changes
  useEffect(() => {
    if (job) {
      setFormData({ ...job.form });
      setSelectedStaffId(job.assignedTo || "");
    }
  }, [job]);

  if (!job || !formData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleInputChange = (
    field: keyof PorterRequestFormData,
    value: any,
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleAcceptJob = async () => {
    if (!selectedStaffId) {
      addToast({
        title: "กรุณาเลือกผู้ดำเนินการ",
        description: "กรุณาเลือกเจ้าหน้าที่ผู้ดำเนินการก่อน",
        color: "warning",
      });

      return;
    }

    const selectedEmployee = employees.find(
      (emp) => emp.id === selectedStaffId,
    );

    if (!selectedEmployee) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลเจ้าหน้าที่ที่เลือก",
        color: "danger",
      });

      return;
    }

    const staffName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;

    if (onAcceptJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onAcceptJob(job.id, selectedEmployee.id, staffName);
        addToast({
          title: "รับงานสำเร็จ",
          description: `รับงานสำเร็จ ผู้ดำเนินการ: ${staffName}`,
          color: "success",
        });
        setSelectedStaffId("");
        onClose();
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถรับงานได้",
          color: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancelJob = () => {
    // เปิด Modal confirm
    setCancelReason("");
    onCancelModalOpen();
  };

  const handleConfirmCancel = async () => {
    if (onCancelJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onCancelJob(job.id, cancelReason.trim() || undefined);
        addToast({
          title: "ยกเลิกงานสำเร็จ",
          description: "งานนี้ได้ถูกยกเลิกเรียบร้อยแล้ว",
          color: "warning",
        });
        onCancelModalClose();
        setCancelReason("");
        onClose();
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถยกเลิกงานได้",
          color: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCompleteJob = async () => {
    if (onCompleteJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onCompleteJob(job.id);
        addToast({
          title: "ดำเนินการเสร็จสิ้น",
          description: "งานนี้ได้ถูกทำเสร็จสิ้นเรียบร้อยแล้ว",
          color: "success",
        });
        onClose();
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถทำเสร็จสิ้นงานได้",
          color: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (onUpdateJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdateJob(job.id, formData);
        addToast({
          title: "บันทึกสำเร็จ",
          description: "ข้อมูลถูกอัปเดตเรียบร้อยแล้ว",
          color: "success",
        });
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกข้อมูลได้",
          color: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusChip = () => {
    switch (job.status) {
      case "waiting":
        return <Chip color="default">รอศูนย์เปลรับงาน</Chip>;
      case "in-progress":
        return <Chip color="warning">กำลังดำเนินการ</Chip>;
      case "completed":
        return <Chip color="success">เสร็จสิ้น</Chip>;
      case "cancelled":
        return <Chip color="danger">ยกเลิก</Chip>;
    }
  };

  const canAcceptJob = job.status === "waiting";
  const canCancelJob = job.status === "waiting" || job.status === "in-progress";
  const canCompleteJob = job.status === "in-progress";
  const canEdit = job.status === "waiting" || job.status === "in-progress";

  return (
    <Drawer isOpen={isOpen} placement="right" size="5xl" onClose={onClose}>
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1 border-b border-divider">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-2xl font-bold text-foreground">
              รายละเอียดคำขอรับพนักงานเปล
            </h2>
            {getStatusChip()}
          </div>
          <div className="flex items-center gap-2">
            <Chip color="default" size="sm" variant="flat">
              ID: {job.id}
            </Chip>
            <ClockIcon className="w-4 h-4 text-default-500" />
            <span className="text-sm text-default-500">
              {formatDate(job.form.requestedDateTime)}
            </span>
          </div>
        </DrawerHeader>
        <DrawerBody className="overflow-y-auto">
          <div className="space-y-6">
            {/* ข้อมูลหน่วยงานและผู้แจ้ง */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                ข้อมูลหน่วยงานผู้แจ้ง
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-default-600 block mb-1">
                    หน่วยงาน
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip variant="flat">{formData.requesterDepartment}</Chip>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-default-600 block mb-1">
                    ชื่อผู้แจ้ง
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-default-400" />
                    <span className="text-foreground">
                      {formData.requesterName}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-default-600 block mb-1">
                    เบอร์โทรศัพท์
                  </div>
                  <span className="text-foreground">
                    {formData.requesterPhone}
                  </span>
                </div>
              </div>
            </section>

            <Divider />

            {/* ข้อมูลผู้ป่วย */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                ข้อมูลผู้ป่วย
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-default-600 block mb-1">
                    HN / AN
                  </div>
                  <span className="text-foreground">{formData.patientHN}</span>
                </div>
                <div>
                  <div className="text-sm text-default-600 block mb-1">
                    ชื่อผู้ป่วย
                  </div>
                  <span className="text-foreground">
                    {formData.patientName}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-default-600 block mb-1">
                  สภาพผู้ป่วย
                </div>
                {Array.isArray(formData.patientCondition) &&
                formData.patientCondition.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {formData.patientCondition.map((condition) => (
                      <Chip
                        key={condition}
                        color="primary"
                        size="sm"
                        variant="bordered"
                      >
                        {condition}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground">-</p>
                )}
              </div>
            </section>

            <Divider />

            {/* Timeline Section - แสดงเมื่อ canAcceptJob = true */}
            {canAcceptJob == false ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <section>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-primary" />
                      Timeline รายละเอียดงาน
                    </h3>
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-default-200" />

                      {/* Timeline Items */}
                      <div className="space-y-6">
                        {/* Item 1: งานถูกสร้าง */}
                        <div className="relative flex gap-4">
                          <div className="relative z-10 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <DocumentTextIcon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-foreground">
                                คำขอถูกสร้าง
                              </h4>
                            </div>
                            <p className="text-xs text-default-500 mb-2">
                              {job.createdAt
                                ? formatDate(job.createdAt)
                                : formatDate(job.form.requestedDateTime)}
                            </p>
                            <div className="text-sm text-default-600 space-y-1">
                              <p>
                                <span className="font-medium">ผู้แจ้ง:</span>{" "}
                                {formData.requesterName}
                              </p>
                              <p>
                                <span className="font-medium">หน่วยงาน:</span>{" "}
                                {formData.requesterDepartment}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Item 2: รับงาน (แสดงเมื่อมี acceptedAt) */}
                        {job.acceptedAt && (
                          <div className="relative flex gap-4">
                            <div className="relative z-10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-warning flex items-center justify-center">
                                <CheckCircleIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-foreground">
                                  รับงาน
                                </h4>
                              </div>
                              <p className="text-xs text-default-500 mb-2">
                                {formatDate(job.acceptedAt)}
                              </p>
                              <div className="text-sm text-default-600 space-y-1">
                                {job.assignedTo && (
                                  <p>
                                    <span className="font-medium">
                                      ผู้ปฎิบัติงาน ID:
                                    </span>{" "}
                                    {job.assignedTo}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Item 3: รอรับงาน (แสดงเมื่อยังไม่รับงาน) */}
                        {!job.acceptedAt && job.status === "waiting" && (
                          <div className="relative flex gap-4">
                            <div className="relative z-10 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-default-300 flex items-center justify-center">
                                <ClockIcon className="w-4 h-4 text-default-600" />
                              </div>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-foreground">
                                  รอศูนย์เปลรับงาน
                                </h4>
                              </div>
                              <p className="text-xs text-default-500 mb-2">
                                กำลังรอการรับงาน
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Timeline การเคลื่อนย้าย (ถ้ามีข้อมูลการเคลื่อนย้าย) */}
                        {formData.transportReason &&
                          formData.pickupLocation &&
                          formData.deliveryLocation && (
                            <>
                              {/* จุดรับ - เริ่มต้น */}
                              <div className="relative flex gap-4">
                                <div className="relative z-10 flex-shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                    <MapPinIcon className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 pb-6">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      จุดรับ
                                    </h4>
                                  </div>
                                  <p className="text-xs text-default-500 mb-2">
                                    {job.acceptedAt
                                      ? formatDate(job.acceptedAt)
                                      : formatDate(job.form.requestedDateTime)}
                                  </p>
                                  <div className="text-sm text-default-600">
                                    <p className="font-medium text-foreground">
                                      {formData.pickupLocation}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* จุดส่ง */}
                              <div className="relative flex gap-4">
                                <div className="relative z-10 flex-shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                                    <MapPinIcon className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 pb-6">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      จุดส่ง
                                    </h4>
                                  </div>
                                  <p className="text-xs text-default-500 mb-2">
                                    {job.completedAt
                                      ? formatDate(job.completedAt)
                                      : job.acceptedAt
                                        ? formatDate(job.acceptedAt)
                                        : formatDate(
                                            job.form.requestedDateTime,
                                          )}
                                  </p>
                                  <div className="text-sm text-default-600">
                                    <p className="font-medium text-foreground">
                                      {formData.deliveryLocation}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* จุดส่งกลับ - แสดงเมื่อ returnTrip === "รับกลับด้วย" */}
                              {formData.returnTrip === "รับกลับด้วย" && (
                                <div className="relative flex gap-4">
                                  <div className="relative z-10 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-default-300 flex items-center justify-center">
                                      <MapPinIcon className="w-4 h-4 text-default-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 pb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-semibold text-foreground">
                                        ส่งกลับ
                                      </h4>
                                    </div>
                                    <p className="text-xs text-default-500 mb-2">
                                      {job.completedAt
                                        ? formatDate(job.completedAt)
                                        : formatDate(
                                            job.form.requestedDateTime,
                                          )}
                                    </p>
                                    <div className="text-sm text-default-600">
                                      <p className="font-medium text-foreground">
                                        {formData.pickupLocation}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* เสร็จสิ้นงาน (แสดงเมื่อมี completedAt) */}
                              {job.completedAt && (
                                <div className="relative flex gap-4">
                                  <div className="relative z-10 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                                      <CheckCircleIcon className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 pb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-semibold text-foreground">
                                        เสร็จสิ้นงาน
                                      </h4>
                                    </div>
                                    <p className="text-xs text-default-500 mb-2">
                                      {formatDate(job.completedAt)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* ยกเลิกงาน (แสดงเมื่อมี cancelledAt) */}
                              {job.cancelledAt && (
                                <div className="relative flex gap-4">
                                  <div className="relative z-10 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-danger flex items-center justify-center">
                                      <XMarkIcon className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 pb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-semibold text-foreground">
                                        ยกเลิกงาน
                                      </h4>
                                    </div>
                                    <p className="text-xs text-default-500 mb-2">
                                      {formatDate(job.cancelledAt)}
                                    </p>
                                    {job.cancelledReason && (
                                      <div className="text-sm text-default-600">
                                        <p>
                                          <span className="font-medium">
                                            เหตุผล:
                                          </span>{" "}
                                          {job.cancelledReason}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                      </div>
                    </div>
                  </section>
                  {/* ข้อมูลเพิ่มเติม - ออกแบบใหม่แบบ Visual Cards */}
                  <section className="border-l border-divider pl-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <ClipboardListIcon className="w-5 h-5 text-primary" />
                      รายละเอียด
                    </h3>
                    <div className="space-y-3">
                      {/* Card: ความเร่งด่วน */}
                      {formData.urgencyLevel && (
                        <div
                          className={`rounded-lg p-4 border ${
                            formData.urgencyLevel === "ฉุกเฉิน"
                              ? "bg-danger-50 dark:bg-danger-50/20 border-danger-200"
                              : formData.urgencyLevel === "ด่วน"
                                ? "bg-warning-50 dark:bg-warning-50/20 border-warning-200"
                                : "bg-success-50 dark:bg-success-50/20 border-success-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                formData.urgencyLevel === "ฉุกเฉิน"
                                  ? "bg-danger-100 dark:bg-danger-500/30"
                                  : formData.urgencyLevel === "ด่วน"
                                    ? "bg-warning-100 dark:bg-warning-500/30"
                                    : "bg-success-100 dark:bg-success-500/30"
                              }`}
                            >
                              {formData.urgencyLevel === "ฉุกเฉิน" ||
                              formData.urgencyLevel === "ด่วน" ? (
                                <AmbulanceIcon
                                  className={`w-5 h-5 ${
                                    formData.urgencyLevel === "ฉุกเฉิน"
                                      ? "text-danger-600 dark:text-danger-400"
                                      : "text-warning-600 dark:text-warning-400"
                                  }`}
                                />
                              ) : (
                                <ClockIcon className="w-5 h-5 text-success-600 dark:text-success-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-default-500 uppercase tracking-wide mb-2">
                                ความเร่งด่วน
                              </div>
                              <Chip
                                color={
                                  formData.urgencyLevel === "ฉุกเฉิน"
                                    ? "danger"
                                    : formData.urgencyLevel === "ด่วน"
                                      ? "warning"
                                      : "success"
                                }
                                size="sm"
                                startContent={
                                  formData.urgencyLevel === "ฉุกเฉิน" ||
                                  formData.urgencyLevel === "ด่วน" ? (
                                    <AmbulanceIcon className="w-3 h-3" />
                                  ) : null
                                }
                                variant="flat"
                              >
                                {formData.urgencyLevel}
                              </Chip>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Card: เหตุผล */}
                      {formData.transportReason && (
                        <div className="bg-default-50 dark:bg-default-100 rounded-lg p-4 border border-default-200">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <InfoCircleIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-default-500 uppercase tracking-wide mb-1">
                                เหตุผลการเคลื่อนย้าย
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {formData.transportReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card: ประเภทรถ */}
                      {formData.vehicleType && (
                        <div className="bg-default-50 dark:bg-default-100 rounded-lg p-4 border border-default-200">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <CarIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-medium text-default-500 uppercase tracking-wide mb-1">
                                  ประเภทรถ
                                </div>
                                <div className="flex items-center gap-2">
                                  {formData.vehicleType === "รถนั่ง" && (
                                    <StretcherIcon className="w-4 h-4 text-default-400" />
                                  )}
                                  {formData.vehicleType === "รถนอน" && (
                                    <BedIcon className="w-4 h-4 text-default-400" />
                                  )}
                                  {formData.vehicleType === "รถกอล์ฟ" && (
                                    <CarIcon className="w-4 h-4 text-default-400" />
                                  )}
                                  <p className="text-sm font-medium text-foreground">
                                    {formData.vehicleType}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-medium text-default-500 uppercase tracking-wide mb-1">
                                  มีรถแล้วหรือไม่
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-foreground">
                                    {formData.hasVehicle}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card: อุปกรณ์ */}
                      {formData.equipment.length > 0 && (
                        <div className="bg-default-50 dark:bg-default-100 rounded-lg p-4 border border-default-200">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-default-200 dark:bg-default-300 flex items-center justify-center">
                              <ToolsIcon className="w-5 h-5 text-default-600 dark:text-default-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-default-500 uppercase tracking-wide mb-2">
                                อุปกรณ์ที่ต้องการ
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {formData.equipment.map((eq, index) => (
                                  <Chip
                                    key={index}
                                    color="default"
                                    size="sm"
                                    startContent={
                                      <MedicalBagIcon className="w-3 h-3" />
                                    }
                                    variant="flat"
                                  >
                                    {eq}
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <>
                {/* ข้อมูลการเคลื่อนย้าย */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5 text-primary" />
                    ข้อมูลการเคลื่อนย้าย
                  </h3>
                  <div className="space-y-4">
                    <Select
                      defaultSelectedKeys={[formData.transportReason]}
                      isDisabled={!canEdit}
                      label="เหตุผลการเคลื่อนย้าย"
                      selectedKeys={[formData.transportReason]}
                      variant="bordered"
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;

                        handleInputChange("transportReason", selected || "");
                      }}
                    >
                      {TRANSPORT_REASON_OPTIONS.map((reason) => (
                        <SelectItem key={reason}>{reason}</SelectItem>
                      ))}
                    </Select>
                    <div className="space-y-4">
                      <LocationSelector
                        isDisabled={!canEdit}
                        isRequired={canEdit}
                        label="สถานที่รับ"
                        value={formData.pickupLocationDetail}
                        onChange={(location) => {
                          setFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  pickupLocationDetail: location,
                                  pickupLocation: location
                                    ? formatLocationString(location)
                                    : "",
                                }
                              : null,
                          );
                        }}
                      />
                      <LocationSelector
                        isDisabled={!canEdit}
                        isRequired={canEdit}
                        label="สถานที่ส่ง"
                        value={formData.deliveryLocationDetail}
                        onChange={(location) => {
                          setFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  deliveryLocationDetail: location,
                                  deliveryLocation: location
                                    ? formatLocationString(location)
                                    : "",
                                }
                              : null,
                          );
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-foreground mb-2 block">
                          ประเภทรถ
                        </div>
                        <Select
                          disallowEmptySelection
                          isDisabled={!canEdit}
                          selectedKeys={[formData.vehicleType]}
                          variant="bordered"
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as VehicleType;

                            handleInputChange("vehicleType", selected);
                          }}
                        >
                          {VEHICLE_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type}>{type}</SelectItem>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground mb-2 block">
                          มีรถแล้วหรือยัง
                        </div>
                        <RadioGroup
                          isDisabled={!canEdit}
                          orientation="horizontal"
                          value={formData.hasVehicle || "ไม่มี"}
                          onValueChange={(value) =>
                            handleInputChange(
                              "hasVehicle",
                              value as "มี" | "ไม่มี" | "",
                            )
                          }
                        >
                          <Radio size="sm" value="มี">
                            มี
                          </Radio>
                          <Radio size="sm" value="ไม่มี">
                            ไม่มี
                          </Radio>
                        </RadioGroup>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground mb-2 block">
                          ส่งกลับหรือไม่
                        </div>
                        <RadioGroup
                          className="gap-3"
                          isDisabled={!canEdit}
                          orientation="horizontal"
                          value={formData.returnTrip || ""}
                          onValueChange={(val) =>
                            handleInputChange(
                              "returnTrip",
                              val as "ไปส่งอย่างเดียว" | "รับกลับด้วย" | "",
                            )
                          }
                        >
                          <Radio size="sm" value="ไปส่งอย่างเดียว">
                            ไปส่งอย่างเดียว
                          </Radio>
                          <Radio size="sm" value="รับกลับด้วย">
                            รับกลับด้วย
                          </Radio>
                        </RadioGroup>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        ความเร่งด่วน
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {URGENCY_OPTIONS.map((option) => (
                          <Chip
                            key={option.value}
                            className={canEdit ? "cursor-pointer" : ""}
                            color={option.color}
                            isDisabled={!canEdit}
                            startContent={
                              option.value === "ฉุกเฉิน" ||
                              option.value === "ด่วน" ? (
                                <AmbulanceIcon className="w-4 h-4" />
                              ) : (
                                <ClipboardListIcon className="w-4 h-4" />
                              )
                            }
                            variant={
                              formData.urgencyLevel === option.value
                                ? "solid"
                                : "bordered"
                            }
                            onClick={() => {
                              if (canEdit) {
                                handleInputChange("urgencyLevel", option.value);
                              }
                            }}
                          >
                            {option.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <CheckboxGroup
                        isDisabled={!canEdit}
                        label="อุปกรณ์ที่ต้องการ"
                        orientation="horizontal"
                        value={formData.equipment}
                        onValueChange={(values) => {
                          handleInputChange(
                            "equipment",
                            values as EquipmentType[],
                          );
                          // ถ้าไม่ได้เลือก "อื่นๆ ระบุ" ให้ล้าง equipmentOther
                          if (!values.includes("อื่นๆ ระบุ")) {
                            handleInputChange("equipmentOther", "");
                          }
                        }}
                      >
                        {EQUIPMENT_OPTIONS.map((eq) => (
                          <Checkbox key={eq} value={eq}>
                            {eq}
                          </Checkbox>
                        ))}
                      </CheckboxGroup>
                    </div>
                    {formData.equipment.includes("อื่นๆ ระบุ") && (
                      <Input
                        className="mt-3"
                        isDisabled={!canEdit}
                        label="ระบุอุปกรณ์อื่นๆ"
                        placeholder="กรุณาระบุอุปกรณ์ที่ต้องการ"
                        value={formData.equipmentOther || ""}
                        variant="bordered"
                        onChange={(e) => {
                          handleInputChange("equipmentOther", e.target.value);
                        }}
                      />
                    )}
                    <Textarea
                      isDisabled={!canEdit}
                      label="หมายเหตุพิเศษ"
                      placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)"
                      value={formData.specialNotes}
                      variant="bordered"
                      onChange={(e) =>
                        handleInputChange("specialNotes", e.target.value)
                      }
                    />
                    {canAcceptJob && (
                      <Autocomplete
                        isRequired
                        defaultSelectedKey={job.assignedTo || undefined}
                        isDisabled={isLoadingEmployees}
                        label="ผู้ดำเนินการ"
                        placeholder={
                          isLoadingEmployees
                            ? "กำลังโหลดข้อมูลเจ้าหน้าที่..."
                            : "เลือกเจ้าหน้าที่ผู้ดำเนินการ"
                        }
                        selectedKey={selectedStaffId || job.assignedTo || ""}
                        variant="bordered"
                        onSelectionChange={(key) => {
                          setSelectedStaffId((key as string) || "");
                        }}
                      >
                        {employees.map((employee) => {
                          const fullName = `${employee.firstName} ${employee.lastName}`;

                          return (
                            <AutocompleteItem
                              key={employee.id}
                              textValue={fullName}
                            >
                              <div className="flex flex-col">
                                <span className="text-foreground font-medium">
                                  {fullName}
                                </span>
                                <span className="text-default-500 text-sm">
                                  {employee.position}
                                  {employee.employmentType
                                    ? ` • ${employee.employmentType}`
                                    : ""}
                                </span>
                              </div>
                            </AutocompleteItem>
                          );
                        })}
                      </Autocomplete>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </DrawerBody>
        <DrawerFooter className="border-t border-divider">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2">
              {canAcceptJob && (
                <Button
                  color="success"
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                  startContent={<CheckCircleIcon className="w-4 h-4" />}
                  onPress={handleAcceptJob}
                >
                  รับงาน
                </Button>
              )}
              {canCompleteJob && (
                <Button
                  color="success"
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                  startContent={<CheckCircleIcon className="w-4 h-4" />}
                  onPress={handleCompleteJob}
                >
                  ดำเนินการเสร็จสิ้น
                </Button>
              )}
              {canCancelJob && (
                <Button
                  color="danger"
                  isDisabled={isSubmitting}
                  startContent={<XMarkIcon className="w-4 h-4" />}
                  variant="flat"
                  onPress={handleCancelJob}
                >
                  ยกเลิกงาน
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  color="primary"
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                  variant="flat"
                  onPress={handleSaveChanges}
                >
                  บันทึกการแก้ไข
                </Button>
              )}
              <Button
                isDisabled={isSubmitting}
                variant="light"
                onPress={onClose}
              >
                ปิด
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>

      {/* Cancel Confirmation Modal */}
      <CancelJobModal
        cancelReason={cancelReason}
        isOpen={isCancelModalOpen}
        isSubmitting={isSubmitting}
        onCancelReasonChange={setCancelReason}
        onClose={onCancelModalClose}
        onConfirm={handleConfirmCancel}
      />
    </Drawer>
  );
}
