"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Textarea,
  Chip,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Form,
  DatePicker,
  useDisclosure,
  addToast,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Tooltip,
  Alert,
} from "@heroui/react";
import { CalendarDate, parseDate } from "@internationalized/date";

import { useEMRCRequestForm } from "../hooks/useEMRCRequestForm";

import {
  EMRCRequestFormData,
  EMRCRequestItem,
  BookingPurpose,
} from "@/types/emrc";
import {
  BOOKING_PURPOSE_OPTIONS,
  REQUIRED_EQUIPMENT_OPTIONS,
  INFECTION_STATUS_OPTIONS,
  CONDITION_TYPE_OPTIONS,
} from "@/lib/emrc";
import {
  AmbulanceIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardListIcon,
  XMarkIcon,
  PencilIcon,
  RefreshIcon,
  EyeIcon,
} from "@/components/ui/icons";

export default function EMRCRequestPage() {
  const [selectedTab, setSelectedTab] = useState<string>("form");

  const {
    formData,
    validationErrors,
    editingRequestId,
    isSubmitting,
    setIsSubmitting,
    setFormField,
    clearFieldError,
    runValidation,
    resetForm,
    loadRequestForEdit,
    cancelEditing,
  } = useEMRCRequestForm({
    // หน้านี้เป็น UI อย่างเดียว ยังไม่ผูกกับ session หรือ backend
    requesterName: undefined,
    requesterPhone: undefined,
    requesterDepartment: undefined,
  });

  // ข้อมูล mock สำหรับแสดง UI ในแท็บประวัติคำขอ (ไม่โหลดจาก backend)
  const [userRequests, setUserRequests] = useState<EMRCRequestItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // State สำหรับเก็บชื่อหน่วยงาน
  const [requesterDepartmentName, setRequesterDepartmentName] = useState<
    string | null
  >(null);

  // State สำหรับ modal และ drawer
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedJob, setSelectedJob] = useState<EMRCRequestItem | null>(null);

  const {
    isOpen: isCancelModalOpen,
    onOpen: onCancelModalOpen,
    onClose: onCancelModalClose,
  } = useDisclosure();

  // ตรวจสอบว่าเลือก "ส่งกลับบ้าน" หรือไม่
  const isSendHome = formData.bookingPurpose === "ส่งกลับบ้าน";

  // Handler สำหรับแก้ไขคำขอ
  const handleEditRequest = (requestId: string) => {
    const request = userRequests.find((r) => r.id === requestId);

    if (!request) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลคำขอ",
        color: "danger",
      });

      return;
    }

    // ตรวจสอบ status ก่อนโหลดข้อมูลแก้ไข
    if (request.status !== "WAITING") {
      addToast({
        title: "ไม่สามารถแก้ไขได้",
        description: "สามารถแก้ไขได้เฉพาะงานที่ยังไม่รับงานเท่านั้น",
        color: "warning",
      });

      return;
    }

    loadRequestForEdit(request);
    setSelectedTab("form");
    addToast({
      title: "โหลดข้อมูลสำเร็จ",
      description: "ข้อมูลคำขอได้ถูกโหลดลงในฟอร์มแล้ว",
      color: "success",
    });
  };

  const handleCancelEdit = () => {
    cancelEditing();
  };

  // Handler สำหรับดูรายละเอียดคำขอ
  const handleViewRequest = (requestId: string) => {
    const request = userRequests.find((r) => r.id === requestId);

    if (!request) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลคำขอ",
        color: "danger",
      });

      return;
    }

    setSelectedJob(request);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = runValidation();

    if (!validation.isValid) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง",
        color: "danger",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      // โหมด UI เท่านั้น: แสดง toast ตามสถานะ โดยไม่เรียก API จริง
      if (editingRequestId) {
        addToast({
          title: "แก้ไขคำขอ (โหมด UI เท่านั้น)",
          description: "ในโหมดนี้จะยังไม่ส่งข้อมูลไปยังระบบจริง",
          color: "success",
        });
      } else {
        addToast({
          title: "ส่งคำขอ (โหมด UI เท่านั้น)",
          description: "ในโหมดนี้จะยังไม่ส่งข้อมูลไปยังระบบจริง",
          color: "success",
        });
      }

      resetForm();
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดภายในโหมด UI ทดสอบ",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert string to CalendarDate
  const stringToCalendarDate = (dateString: string): CalendarDate | null => {
    try {
      // Parse string in format "MM/DD/YYYY"
      const [month, day, year] = dateString.split("/").map(Number);

      if (!month || !day || !year) {
        return null;
      }

      return new CalendarDate(year, month, day);
    } catch {
      return null;
    }
  };

  // Helper function to convert CalendarDate to string
  const calendarDateToString = (date: CalendarDate | null): string => {
    if (!date) {
      return "";
    }

    const month = date.month.toString().padStart(2, "0");
    const day = date.day.toString().padStart(2, "0");
    const year = date.year.toString().padStart(4, "0");

    return `${month}/${day}/${year}`;
  };

  // Get CalendarDate value for DatePicker
  const getDateValue = (): CalendarDate | null => {
    return stringToCalendarDate(formData.requestDate);
  };

  // Handle DatePicker change
  const handleDateChange = (value: CalendarDate | null) => {
    if (value) {
      setFormField("requestDate", calendarDateToString(value));
      clearFieldError("requestDate");
    }
  };

  // Handle input change
  const handleInputChange = (
    field: keyof EMRCRequestFormData,
    value: any,
  ) => {
    setFormField(field, value);
    clearFieldError(field);
  };

  // Handler สำหรับเปิด Modal ยกเลิกงาน
  const handleOpenCancelModal = (requestId: string) => {
    setSelectedRequestId(requestId);
    setCancelReason("");
    setCancelReasonError("");
    onCancelModalOpen();
  };

  // Handler สำหรับยกเลิกงาน
  const handleCancelJob = async () => {
    if (!selectedRequestId) {
      return;
    }

    // Validate cancelReason
    if (!cancelReason.trim()) {
      setCancelReasonError("กรุณาระบุเหตุผลการยกเลิกงาน");

      return;
    }

    setCancelReasonError("");
    setIsCancelling(true);

    try {
      // โหมด UI เท่านั้น: อัปเดตสถานะใน state ภายในโดยไม่เรียก API
      setUserRequests((prev) =>
        prev.map((item) =>
          item.id === selectedRequestId
            ? {
                ...item,
                status: "CANCELLED",
                cancelledReason: cancelReason.trim() || undefined,
              }
            : item,
        ),
      );

      addToast({
        title: "ยกเลิกงาน (โหมด UI เท่านั้น)",
        description: "ในโหมดนี้จะยังไม่ส่งข้อมูลยกเลิกไปยังระบบจริง",
        color: "success",
      });

      onCancelModalClose();
      setSelectedRequestId(null);
      setCancelReason("");
      setCancelReasonError("");
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดภายในโหมด UI ทดสอบ",
        color: "danger",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AmbulanceIcon className="w-8 h-8 text-primary" />
            จองรถพยาบาล
          </h1>
          <p className="text-sm text-default-500 mt-1">
            กรุณาเขียนใบขอใช้รถพยาบาล ทั้งไปและกลับ และเซ็นให้ครบ ก่อนออกเดินทางทุกครั้ง
            ติดต่อสอบถาม โทร 161
          </p>
        </div>
      </div>

      <Tabs
        aria-label="EMRC Request Options"
        color="primary"
        selectedKey={selectedTab}
        variant="underlined"
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tab
          key="form"
          title={
            <div className="flex items-center space-x-2">
              <AmbulanceIcon className="w-4 h-4" />
              <span>กรอกข้อมูลคำขอ</span>
            </div>
          }
        >
          <Form
            className=""
            validationBehavior="aria"
            validationErrors={validationErrors}
            onSubmit={handleSubmit}
          >
            {/* การ์ดที่ 1: ข้อมูลหน่วยงานผู้แจ้ง */}
            <Card className="shadow-lg border border-default-200 w-full">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    ข้อมูลหน่วยงานผู้แจ้ง
                  </h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    readOnly
                    label="หน่วยงานที่ขอใช้รถ"
                    name="requesterDepartment"
                    placeholder="หน่วยงานจากโปรไฟล์"
                    startContent={
                      <BuildingOfficeIcon className="w-4 h-4 text-default-400" />
                    }
                    value={requesterDepartmentName || "-"}
                    variant="bordered"
                  />

                  <Input
                    isRequired
                    label="ชื่อผู้แจ้ง"
                    name="requesterName"
                    placeholder="กรอกชื่อผู้แจ้ง"
                    startContent={
                      <UserIcon className="w-4 h-4 text-default-400" />
                    }
                    value={formData.requesterName}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("requesterName", e.target.value);
                    }}
                  />

                  <Input
                    isRequired
                    classNames={{
                      input:
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    }}
                    label="โทรศัพท์ภายใน"
                    name="requesterPhone"
                    placeholder="IP-Phone / เบอร์ 4 ตัว"
                    startContent={
                      <PhoneIcon className="w-4 h-4 text-default-400" />
                    }
                    type="number"
                    value={formData.requesterPhone}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("requesterPhone", e.target.value);
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            {/* การ์ดที่ 2: ข้อมูลผู้ป่วย (แสดงเมื่อเลือก "ส่งกลับบ้าน") */}
            {isSendHome && (
              <Card className="shadow-lg border border-default-200 w-full">
                <CardHeader className="pb-0">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      ข้อมูลผู้ป่วย
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      isRequired
                      label="ชื่อ - นามสกุล ผู้ป่วย"
                      name="patientName"
                      placeholder="กรอกชื่อ - นามสกุล ผู้ป่วย"
                      value={formData.patientName || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("patientName", e.target.value);
                      }}
                    />

                    <DatePicker
                      isRequired
                      label="วัน-เดือน-ปีเกิด ผู้ป่วย"
                      name="patientBirthDate"
                      selectorIcon={<CalendarIcon className="w-4 h-4" />}
                      value={
                        formData.patientBirthDate
                          ? parseDate(
                              formData.patientBirthDate
                                .split("/")
                                .reverse()
                                .join("-"),
                            )
                          : null
                      }
                      variant="bordered"
                      onChange={(value) => {
                        if (value) {
                          const day = value.day.toString().padStart(2, "0");
                          const month = value.month.toString().padStart(2, "0");
                          const year = value.year;
                          handleInputChange(
                            "patientBirthDate",
                            `${day}/${month}/${year}`,
                          );
                        }
                      }}
                    />

                    <Input
                      isRequired
                      label="HN"
                      name="patientHN"
                      placeholder="กรอก HN"
                      value={formData.patientHN || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("patientHN", e.target.value);
                      }}
                    />

                    <Input
                      isRequired
                      classNames={{
                        input:
                          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      }}
                      label="เลขบัตรประชาชน 13 หลัก"
                      name="patientCitizenId"
                      placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
                      type="number"
                      maxLength={13}
                      value={formData.patientCitizenId || ""}
                      variant="bordered"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 13);
                        handleInputChange("patientCitizenId", value);
                      }}
                    />

                    <Input
                      isRequired
                      label="เบอร์โทรญาติผู้ป่วยหรือผู้ป่วย"
                      name="patientPhone"
                      placeholder="กรอกเบอร์โทรศัพท์"
                      startContent={
                        <PhoneIcon className="w-4 h-4 text-default-400" />
                      }
                      value={formData.patientPhone || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("patientPhone", e.target.value);
                      }}
                    />

                    <Input
                      isRequired
                      label="สิทธิ์รักษาผู้ป่วย"
                      name="patientRights"
                      placeholder="กรอกสิทธิ์รักษาผู้ป่วย"
                      value={formData.patientRights || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("patientRights", e.target.value);
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            )}

            {/* การ์ดที่ 3: ข้อมูลการจองรถพยาบาล */}
            <Card className="shadow-lg border border-default-200 w-full">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <AmbulanceIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    ข้อมูลการจองรถพยาบาล
                  </h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    isRequired
                    label="ใช้รถพยาบาลวันที่"
                    name="requestDate"
                    selectorIcon={<CalendarIcon className="w-4 h-4" />}
                    value={getDateValue()}
                    variant="bordered"
                    onChange={handleDateChange}
                  />

                  <Input
                    isRequired
                    label="เวลาที่ขอใช้รถพยาบาล (เวลาออกจากรพ.)"
                    name="requestTime"
                    placeholder="HH:mm (เช่น 14:30)"
                    value={formData.requestTime}
                    variant="bordered"
                    onChange={(e) => {
                      // อนุญาตเฉพาะตัวเลขและ : เท่านั้น และ format เป็น HH:mm
                      const value = e.target.value.replace(/[^0-9:]/g, "");
                      const parts = value.split(":");
                      let formatted = "";
                      
                      if (parts.length === 1) {
                        // ถ้ายังไม่มี : ให้ format เป็น HH
                        formatted = parts[0].slice(0, 2);
                      } else {
                        // ถ้ามี : แล้ว ให้ format เป็น HH:mm
                        formatted = parts[0].slice(0, 2) + ":" + parts[1].slice(0, 2);
                      }
                      
                      handleInputChange("requestTime", formatted);
                    }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground mb-2 block">
                    จองรถสำหรับ
                    <span className="text-danger ml-1">*</span>
                  </div>
                  {validationErrors.bookingPurpose && (
                    <div className="text-sm text-danger mb-2">
                      {validationErrors.bookingPurpose}
                    </div>
                  )}
                  <RadioGroup
                    isRequired
                    className="gap-3"
                    name="bookingPurpose"
                    orientation="vertical"
                    value={formData.bookingPurpose}
                    onValueChange={(val) => {
                      handleInputChange("bookingPurpose", val as BookingPurpose);
                      // ล้างข้อมูลรายละเอียดเพิ่มเติมเมื่อเปลี่ยน bookingPurpose
                      if (val !== "ส่งกลับบ้าน") {
                        setFormField("patientName", "");
                        setFormField("patientBirthDate", "");
                        setFormField("destinationAddress", "");
                        setFormField("patientRights", "");
                        setFormField("patientHN", "");
                        setFormField("patientCitizenId", "");
                        setFormField("patientPhone", "");
                        setFormField("requiredEquipment", []);
                        setFormField("infectionStatus", "");
                        setFormField("infectionStatusOther", "");
                        setFormField("departmentPhone", "");
                        setFormField("requesterNameDetail", "");
                        setFormField("conditionType", "");
                        setFormField("acknowledged", false);
                      }
                    }}
                  >
                    {BOOKING_PURPOSE_OPTIONS.map((purpose) => (
                      <Radio key={purpose} size="sm" value={purpose}>
                        {purpose}
                      </Radio>
                    ))}
                  </RadioGroup>
                  {formData.bookingPurpose === "อื่นๆ" && (
                    <Input
                      className="mt-2"
                      label="ระบุวัตถุประสงค์อื่นๆ"
                      placeholder="กรุณาระบุวัตถุประสงค์"
                      value={formData.bookingPurposeOther || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("bookingPurposeOther", e.target.value);
                      }}
                    />
                  )}
                </div>

                {isSendHome && (
                  <>
                    <Alert className="mb-4" color="default" variant="flat">
                      <p className="text-sm">
                        กรณีส่งภายใน รพ. ให้ระบุหอผู้ป่วยให้ชัดเจน // กรณีส่งกลับบ้านกรุณาระบุที่อยู่
                        ถนน ซอย ให้ครบถ้วนชัดเจน หรือหากมี location สามารถแอดไลน์ ems.rpp
                        และส่งข้อมูลมาได้ ขอบคุณครับ
                      </p>
                    </Alert>

                    <Textarea
                      isRequired
                      classNames={{ input: "resize-y min-h-[40px]" }}
                      label="ที่อยู่ปัจจุบัน // สถานที่ปลายทางที่ต้องการไป"
                      name="destinationAddress"
                      placeholder="กรุณาระบุที่อยู่ ถนน ซอย ให้ครบถ้วนชัดเจน"
                      minRows={3}
                      value={formData.destinationAddress || ""}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("destinationAddress", e.target.value);
                      }}
                    />

                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        อุปกรณ์ที่จำเป็น
                        <span className="text-danger ml-1">*</span>
                      </div>
                      {validationErrors.requiredEquipment && (
                        <div className="text-sm text-danger mb-2">
                          {validationErrors.requiredEquipment}
                        </div>
                      )}
                      <CheckboxGroup
                        value={
                          Array.isArray(formData.requiredEquipment)
                            ? formData.requiredEquipment
                            : []
                        }
                        onValueChange={(values) => {
                          handleInputChange(
                            "requiredEquipment",
                            values as string[],
                          );
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {REQUIRED_EQUIPMENT_OPTIONS.map((equipment) => (
                            <Checkbox key={equipment} size="sm" value={equipment}>
                              {equipment}
                            </Checkbox>
                          ))}
                        </div>
                      </CheckboxGroup>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        การติดเชื้อ
                        <span className="text-danger ml-1">*</span>
                      </div>
                      {validationErrors.infectionStatus && (
                        <div className="text-sm text-danger mb-2">
                          {validationErrors.infectionStatus}
                        </div>
                      )}
                      <RadioGroup
                        isRequired
                        className="gap-3"
                        name="infectionStatus"
                        orientation="vertical"
                        value={formData.infectionStatus}
                        onValueChange={(val) => {
                          handleInputChange("infectionStatus", val);
                          if (val !== "อื่นๆ") {
                            handleInputChange("infectionStatusOther", "");
                          }
                        }}
                      >
                        {INFECTION_STATUS_OPTIONS.map((status) => (
                          <Radio key={status} size="sm" value={status}>
                            {status}
                          </Radio>
                        ))}
                      </RadioGroup>
                      {formData.infectionStatus === "อื่นๆ" && (
                        <Input
                          className="mt-2"
                          label="ระบุการติดเชื้ออื่นๆ"
                          placeholder="กรุณาระบุการติดเชื้อ"
                          value={formData.infectionStatusOther || ""}
                          variant="bordered"
                          onChange={(e) => {
                            handleInputChange("infectionStatusOther", e.target.value);
                          }}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        isRequired
                        label="เบอร์โทรหน่วยงาน IP phone เท่านั้น"
                        name="departmentPhone"
                        placeholder="กรอกเบอร์โทรหน่วยงาน"
                        startContent={
                          <PhoneIcon className="w-4 h-4 text-default-400" />
                        }
                        value={formData.departmentPhone || ""}
                        variant="bordered"
                        onChange={(e) => {
                          handleInputChange("departmentPhone", e.target.value);
                        }}
                      />

                      <Input
                        isRequired
                        label="ชื่อผู้ขอใช้รถ"
                        name="requesterNameDetail"
                        placeholder="กรอกชื่อผู้ขอใช้รถ"
                        value={formData.requesterNameDetail || ""}
                        variant="bordered"
                        onChange={(e) => {
                          handleInputChange("requesterNameDetail", e.target.value);
                        }}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        เงื่อนไขการขอใช้รถพยาบาล
                        <span className="text-danger ml-1">*</span>
                      </div>
                      {validationErrors.conditionType && (
                        <div className="text-sm text-danger mb-2">
                          {validationErrors.conditionType}
                        </div>
                      )}
                      <RadioGroup
                        isRequired
                        className="gap-3"
                        name="conditionType"
                        orientation="horizontal"
                        value={formData.conditionType}
                        onValueChange={(val) => {
                          handleInputChange("conditionType", val);
                        }}
                      >
                        {CONDITION_TYPE_OPTIONS.map((type) => (
                          <Radio key={type} size="sm" value={type}>
                            {type}
                          </Radio>
                        ))}
                      </RadioGroup>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            {/* การ์ดที่ 4: รายละเอียดเพิ่มเติม / หมายเหตุ */}
            {isSendHome && (
              <Card className="shadow-lg border border-default-200 w-full">
                <CardHeader className="pb-0">
                  <div className="flex items-center gap-2">
                    <ClipboardListIcon className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      รายละเอียดเพิ่มเติม
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-4">
                  <Alert className="mb-4" color="warning" variant="flat">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">
                        ข้อกำหนดพื้นที่ให้บริการขอรถกลับบ้าน
                      </p>
                      <p className="text-sm">
                        เฉพาะในพื้นที่ Health Zone หรือ โซนบริการสุขภาพ เขตบางแค
                        เขตหนองแขม เขตทวีวัฒนา เขตภาษีเจริญ เขตตลิ่งชัน เขตบางบอน
                        เวลา 08.00 น. ถึง 20.00 น.
                      </p>
                      <p className="text-sm font-semibold mt-2">
                        กรณีขอรถกลับบ้าน นอกเขตพื้นที่ Health zone ที่ห่างไกล
                        รบกวนติดต่อกลับ EMS IP Phone 161 เพื่อพิจารณาเป็นรายเคส
                        <span className="text-danger"> **ย้ำโทรสอบถามทุกครั้ง**</span>
                      </p>
                    </div>
                  </Alert>

                  <Checkbox
                    isRequired
                    isSelected={formData.acknowledged}
                    onValueChange={(checked) => {
                      handleInputChange("acknowledged", checked);
                    }}
                  >
                    รับทราบ
                  </Checkbox>
                </CardBody>
              </Card>
            )}

            {/* การ์ดปุ่มคำสั่ง */}
            <Card className="shadow-lg border border-default-200 w-full">
              <CardFooter className="p-3 flex justify-end gap-4">
                {editingRequestId && (
                  <Button
                    size="md"
                    type="button"
                    variant="flat"
                    onPress={handleCancelEdit}
                  >
                    ยกเลิกการแก้ไข
                  </Button>
                )}
                {!editingRequestId && (
                  <Button
                    size="md"
                    type="button"
                    variant="flat"
                    onPress={resetForm}
                  >
                    ล้างข้อมูล
                  </Button>
                )}
                <Button
                  color="primary"
                  isLoading={isSubmitting}
                  size="md"
                  startContent={
                    !isSubmitting && <AmbulanceIcon className="w-5 h-5" />
                  }
                  type="submit"
                >
                  {isSubmitting
                    ? editingRequestId
                      ? "กำลังแก้ไขคำขอ..."
                      : "กำลังส่งคำขอ..."
                    : editingRequestId
                      ? "แก้ไขคำขอ"
                      : "ส่งคำขอ"}
                </Button>
              </CardFooter>
            </Card>
          </Form>
        </Tab>
        <Tab
          key="history"
          title={
            <div className="flex items-center space-x-2">
              <ClipboardListIcon className="w-4 h-4" />
              <span>ประวัติคำขอ</span>
              {userRequests.length > 0 && (
                <Chip size="sm" variant="flat">
                  {userRequests.length}
                </Chip>
              )}
            </div>
          }
        >
          <div className="mt-4">
            <Card className="shadow-lg border border-default-200">
              <CardHeader className="flex gap-3 justify-between">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-foreground">
                    รายการคำขอทั้งหมด
                  </h2>
                  <p className="text-small text-default-500">
                    ประวัติการจองรถพยาบาลทั้งหมดของคุณ
                  </p>
                </div>
                <Button
                  isIconOnly
                  color="primary"
                  isLoading={isLoadingRequests}
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    // โหมด UI เท่านั้น: กดแล้วไม่โหลดข้อมูลจาก backend แต่อาจใช้ในอนาคต
                    setIsLoadingRequests(true);
                    setTimeout(() => setIsLoadingRequests(false), 500);
                  }}
                >
                  <RefreshIcon className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardBody>
                {isLoadingRequests ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-default-500">
                    <ClipboardListIcon className="w-12 h-12 mb-2 opacity-50" />
                    <p>ยังไม่มีประวัติคำขอ</p>
                  </div>
                ) : (
                  <Table
                    aria-label="Request History Table"
                    classNames={{
                      wrapper: "min-h-[222px]",
                    }}
                  >
                    <TableHeader>
                      <TableColumn>สถานะ</TableColumn>
                      <TableColumn>วัตถุประสงค์</TableColumn>
                      <TableColumn>วันที่</TableColumn>
                      <TableColumn>เวลา</TableColumn>
                      <TableColumn>ผู้ป่วย</TableColumn>
                      <TableColumn align="center">จัดการ</TableColumn>
                    </TableHeader>
                    <TableBody items={userRequests}>
                      {(item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Chip
                              color={
                                item.status === "WAITING"
                                  ? "secondary"
                                  : item.status === "IN_PROGRESS"
                                    ? "primary"
                                    : item.status === "COMPLETED"
                                      ? "success"
                                      : "default"
                              }
                              size="sm"
                              variant="flat"
                            >
                              {item.status === "WAITING"
                                ? "รอรับ"
                                : item.status === "IN_PROGRESS"
                                  ? "กำลังดำเนินการ"
                                  : item.status === "COMPLETED"
                                    ? "เสร็จสิ้น"
                                    : item.status === "CANCELLED"
                                      ? "ยกเลิก"
                                      : item.status}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <span className="text-small">
                              {item.form.bookingPurpose}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-small">
                              {item.form.requestDate || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-small">
                              {item.form.requestTime || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-bold text-small">
                                {item.form.patientName || "-"}
                              </span>
                              {item.form.patientHN && (
                                <span className="text-tiny text-default-500">
                                  HN: {item.form.patientHN}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Tooltip content="ดูรายละเอียด">
                                <Button
                                  isIconOnly
                                  color="success"
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleViewRequest(item.id)}
                                >
                                  <EyeIcon className="w-5 h-5" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="แก้ไข">
                                <Button
                                  isIconOnly
                                  color="primary"
                                  isDisabled={item.status !== "WAITING"}
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleEditRequest(item.id)}
                                >
                                  <PencilIcon className="w-5 h-5" />
                                </Button>
                              </Tooltip>
                              <Tooltip
                                color="danger"
                                content={
                                  item.status === "WAITING" ||
                                  item.status === "IN_PROGRESS"
                                    ? "ยกเลิก"
                                    : "ไม่สามารถยกเลิกได้"
                                }
                              >
                                <Button
                                  isIconOnly
                                  color="danger"
                                  isDisabled={
                                    item.status !== "WAITING" &&
                                    item.status !== "IN_PROGRESS"
                                  }
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    handleOpenCancelModal(item.id)
                                  }
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </Button>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">ยกเลิกคำขอ</h3>
            </CardHeader>
            <CardBody>
              <Textarea
                label="เหตุผลการยกเลิก"
                placeholder="กรุณาระบุเหตุผลการยกเลิก"
                value={cancelReason}
                variant="bordered"
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelReasonError) {
                    setCancelReasonError("");
                  }
                }}
              />
              {cancelReasonError && (
                <p className="text-sm text-danger mt-2">{cancelReasonError}</p>
              )}
            </CardBody>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="flat"
                onPress={onCancelModalClose}
                isDisabled={isCancelling}
              >
                ยกเลิก
              </Button>
              <Button
                color="danger"
                isLoading={isCancelling}
                onPress={handleCancelJob}
              >
                ยืนยัน
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
