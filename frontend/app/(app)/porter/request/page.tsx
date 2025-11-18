"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Select,
  SelectItem,
  Textarea,
  Chip,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Form,
  DatePicker,
  addToast,
} from "@heroui/react";
import { CalendarDateTime } from "@internationalized/date";

import { LocationSelector } from "../components";

import {
  PorterRequestFormData,
  VehicleType,
  EquipmentType,
  formatLocationString,
} from "@/types/porter";
import { formatThaiDateTimeShort, getDateTimeLocal } from "@/lib/utils";
import {
  URGENCY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  EQUIPMENT_OPTIONS,
  TRANSPORT_REASON_OPTIONS,
  DEPARTMENT_OPTIONS,
  PATIENT_CONDITION_OPTIONS,
  validateForm,
} from "@/lib/porter";
import {
  AmbulanceIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

// ========================================
// PORTER REQUEST PAGE
// ========================================

export default function PorterRequestPage() {
  const { data: session } = useSession();

  const [formData, setFormData] = useState<PorterRequestFormData>({
    requesterDepartment: session?.user?.department || "",
    requesterName: session?.user?.name || "",
    requesterPhone: "",

    patientName: "",
    patientHN: "",

    pickupLocation: "",
    pickupLocationDetail: null,
    deliveryLocation: "",
    deliveryLocationDetail: null,
    requestedDateTime: getDateTimeLocal(),
    urgencyLevel: "ปกติ",
    vehicleType: "",
    equipment: [],
    hasVehicle: "",
    returnTrip: "",

    transportReason: "",
    equipmentOther: "",
    specialNotes: "",
    patientCondition: [],
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldScrollToError, setShouldScrollToError] = useState(false);
  const prevErrorsCountRef = React.useRef(0);

  // Scroll to first error field after validation fails (only when submit)
  useEffect(() => {
    const currentErrorsCount = Object.keys(validationErrors).length;

    // Only scroll if:
    // 1. There are errors
    // 2. Errors count increased (not decreased - which means user is fixing)
    // 3. shouldScrollToError flag is true (set when submit fails)
    if (
      currentErrorsCount > 0 &&
      currentErrorsCount > prevErrorsCountRef.current &&
      shouldScrollToError
    ) {
      // Small delay to ensure React has updated the DOM
      const timer = setTimeout(() => {
        // Find first field with error from validationErrors
        const requiredFields: Array<keyof PorterRequestFormData> = [
          "requesterDepartment",
          "requesterName",
          "requesterPhone",
          "patientName",
          "patientHN",
          "pickupLocation",
          "deliveryLocation",
          "requestedDateTime",
          "transportReason",
          "urgencyLevel",
          "vehicleType",
          "hasVehicle",
          "returnTrip",
        ];

        // Find first field with error
        const firstErrorKey = requiredFields.find(
          (field) => validationErrors[field],
        );

        if (firstErrorKey) {
          // Map field names to label text
          const fieldLabels: Partial<
            Record<keyof PorterRequestFormData, string>
          > = {
            requesterDepartment: "หน่วยงานผู้แจ้ง",
            requesterName: "ชื่อผู้แจ้ง",
            requesterPhone: "เบอร์โทรติดต่อ",
            patientHN: "หมายเลข HN",
            patientName: "ชื่อผู้ป่วย",
            pickupLocation: "สถานที่รับ",
            deliveryLocation: "สถานที่ส่ง",
            requestedDateTime: "วันที่และเวลา",
            transportReason: "รายการเหตุผล",
            urgencyLevel: "ความเร่งด่วน",
            vehicleType: "ประเภทรถ",
            hasVehicle: "มีรถแล้วหรือยัง",
            returnTrip: "ส่งกลับหรือไม่",
          };

          const labelText = fieldLabels[firstErrorKey];

          if (!labelText) {
            return;
          }

          // Find the label and scroll to its input
          const labels = Array.from(document.querySelectorAll("label"));

          for (const label of labels) {
            if (label.textContent?.includes(labelText)) {
              const input = label
                .closest("div")
                ?.querySelector(
                  "input, select, [role='combobox'], textarea",
                ) as HTMLElement | null;

              if (input) {
                input.scrollIntoView({ behavior: "smooth", block: "center" });
                // Focus to ensure error is visible
                setTimeout(() => input.focus(), 100);
                break;
              }
            }
          }
        }
      }, 100);

      // Reset scroll flag after scrolling
      setShouldScrollToError(false);

      return () => clearTimeout(timer);
    }

    // Update previous errors count
    prevErrorsCountRef.current = currentErrorsCount;
  }, [validationErrors, shouldScrollToError]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form first to get errors
    const validation = validateForm(formData);

    if (!validation.isValid) {
      // Set validationErrors - HeroUI Form will automatically display them
      setValidationErrors(validation.errors);

      // Set flag to scroll to error (only on submit failure)
      setShouldScrollToError(true);

      // Show toast notification
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง",
        color: "danger",
      });

      return;
    }

    // Clear errors if form is valid
    setValidationErrors({});

    setIsSubmitting(true);

    try {
      // ส่งข้อมูลไปยัง API
      const response = await fetch("/api/porter/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage =
          result.error === "UNAUTHORIZED"
            ? "กรุณาเข้าสู่ระบบก่อนส่งคำขอ"
            : result.error === "PORTER_SERVICE_UNAVAILABLE"
              ? "บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้"
              : result.message || "ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง";

        addToast({
          title: "เกิดข้อผิดพลาด",
          description: errorMessage,
          color: "danger",
        });

        return;
      }

      addToast({
        title: "ส่งคำขอสำเร็จ",
        description: "คำขอของคุณได้รับการส่งเรียบร้อยแล้ว",
        color: "success",
      });

      // Reset form
      setFormData({
        requesterDepartment: session?.user?.department || "",
        requesterName: session?.user?.name || "",
        requesterPhone: "",

        patientName: "",
        patientHN: "",

        pickupLocation: "",
        pickupLocationDetail: null,
        deliveryLocation: "",
        deliveryLocationDetail: null,
        requestedDateTime: getDateTimeLocal(),
        urgencyLevel: "ปกติ",
        vehicleType: "",
        equipment: [],
        hasVehicle: "",
        returnTrip: "",

        transportReason: "",
        equipmentOther: "",
        specialNotes: "",
        patientCondition: [],
      });

      setValidationErrors({});
    } catch (error: unknown) {
      // Log error for debugging (in production, use proper logging service)
      if (error instanceof Error) {
        console.error("Error submitting porter request:", error.message);
      } else {
        console.error("Error submitting porter request:", error);
      }

      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert string to CalendarDateTime
  const stringToCalendarDateTime = (dateString: string): CalendarDateTime => {
    try {
      // Parse string in format "YYYY-MM-DDTHH:mm"
      const [datePart, timePart] = dateString.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = (timePart || "00:00").split(":").map(Number);

      return new CalendarDateTime(year, month, day, hour || 0, minute || 0);
    } catch {
      // Fallback to current date/time
      const now = new Date();

      return new CalendarDateTime(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
      );
    }
  };

  // Helper function to convert CalendarDateTime to string
  const calendarDateTimeToString = (date: CalendarDateTime): string => {
    const year = date.year.toString().padStart(4, "0");
    const month = date.month.toString().padStart(2, "0");
    const day = date.day.toString().padStart(2, "0");
    const hour = date.hour.toString().padStart(2, "0");
    const minute = date.minute.toString().padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  // Handle input change
  const handleInputChange = (
    field: keyof PorterRequestFormData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user modifies it (HeroUI behavior)
    // This matches HeroUI's automatic error clearing behavior
    // Don't scroll when user is fixing errors
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };

        delete newErrors[field];

        return newErrors;
      });
      // Reset scroll flag to prevent scrolling when user fixes errors
      setShouldScrollToError(false);
    }
  };

  // Get CalendarDateTime value for DatePicker
  const getDateTimeValue = (): CalendarDateTime => {
    return stringToCalendarDateTime(formData.requestedDateTime);
  };

  // Handle DatePicker change
  const handleDateTimeChange = (value: CalendarDateTime | null) => {
    if (value) {
      handleInputChange("requestedDateTime", calendarDateTimeToString(value));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AmbulanceIcon className="w-8 h-8 text-primary" />
            ขอเปลรับ - ส่งผู้ป่วย
          </h1>
          <p className="text-default-600 mt-2">
            กรอกข้อมูลเพื่อส่งคำขอรับบริการเปลเคลื่อนย้ายผู้ป่วย
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Form
          className="space-y-6 md:col-span-2"
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
                <Select
                  isRequired
                  label="หน่วยงานผู้แจ้ง"
                  name="requesterDepartment"
                  placeholder="เลือกหน่วยงาน"
                  selectedKeys={
                    formData.requesterDepartment
                      ? [formData.requesterDepartment]
                      : []
                  }
                  startContent={<BuildingOfficeIcon className="w-4 h-4" />}
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;

                    handleInputChange("requesterDepartment", selected);
                  }}
                >
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <SelectItem key={dept}>{dept}</SelectItem>
                  ))}
                </Select>

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
                  label="เบอร์โทรติดต่อ"
                  name="requesterPhone"
                  placeholder="เช่น 0812345678"
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

          {/* การ์ดที่ 2: ข้อมูลผู้ป่วย */}
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
                  label="หมายเลข HN / AN"
                  name="patientHN"
                  placeholder="เช่น 123456/68"
                  value={formData.patientHN}
                  variant="bordered"
                  onChange={(e) => {
                    handleInputChange("patientHN", e.target.value);
                  }}
                />

                <Input
                  isRequired
                  label="ชื่อผู้ป่วย"
                  name="patientName"
                  placeholder="กรอกชื่อผู้ป่วย"
                  value={formData.patientName}
                  variant="bordered"
                  onChange={(e) => {
                    handleInputChange("patientName", e.target.value);
                  }}
                />
              </div>
              <div className="mt-4">
                <label
                  className="text-sm font-medium text-foreground mb-2 block"
                  htmlFor="patient-condition-group"
                >
                  อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล
                </label>
                <CheckboxGroup
                  id="patient-condition-group"
                  value={formData.patientCondition}
                  onValueChange={(values) => {
                    handleInputChange("patientCondition", values as string[]);
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PATIENT_CONDITION_OPTIONS.map((condition) => (
                      <Checkbox key={condition} size="sm" value={condition}>
                        {condition}
                      </Checkbox>
                    ))}
                  </div>
                </CheckboxGroup>
              </div>
            </CardBody>
          </Card>

          {/* การ์ดที่ 3: ข้อมูลการเคลื่อนย้าย */}
          <Card className="shadow-lg border border-default-200 w-full">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  ข้อมูลการเคลื่อนย้าย
                </h3>
              </div>
            </CardHeader>
            <CardBody className="pt-4 space-y-4">
              <Select
                isRequired
                label="รายการเหตุผลการเคลื่อนย้าย"
                name="transportReason"
                placeholder="เลือกเหตุผล"
                selectedKeys={
                  formData.transportReason ? [formData.transportReason] : []
                }
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  handleInputChange("transportReason", selected);
                }}
              >
                {TRANSPORT_REASON_OPTIONS.map((r) => (
                  <SelectItem key={r}>{r}</SelectItem>
                ))}
              </Select>

              <div className="space-y-4">
                <LocationSelector
                  isRequired
                  errorMessage={validationErrors.pickupLocation}
                  label="สถานที่รับ"
                  value={formData.pickupLocationDetail}
                  onChange={(location) => {
                    setFormData((prev) => ({
                      ...prev,
                      pickupLocationDetail: location,
                      pickupLocation: location
                        ? formatLocationString(location)
                        : "",
                    }));

                    // Clear error when user modifies
                    if (validationErrors.pickupLocation) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };

                        delete newErrors.pickupLocation;

                        return newErrors;
                      });
                    }
                  }}
                />

                <LocationSelector
                  isRequired
                  errorMessage={validationErrors.deliveryLocation}
                  label="สถานที่ส่ง"
                  value={formData.deliveryLocationDetail}
                  onChange={(location) => {
                    setFormData((prev) => ({
                      ...prev,
                      deliveryLocationDetail: location,
                      deliveryLocation: location
                        ? formatLocationString(location)
                        : "",
                    }));

                    // Clear error when user modifies
                    if (validationErrors.deliveryLocation) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };

                        delete newErrors.deliveryLocation;

                        return newErrors;
                      });
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <DatePicker
                    isRequired
                    granularity="minute"
                    label="วันที่และเวลาที่ต้องการเคลื่อนย้าย"
                    selectorIcon={<CalendarIcon className="w-4 h-4" />}
                    value={getDateTimeValue()}
                    variant="bordered"
                    onChange={handleDateTimeChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() =>
                        handleInputChange(
                          "requestedDateTime",
                          getDateTimeLocal(),
                        )
                      }
                    >
                      ตอนนี้
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => {
                        const d = new Date();

                        d.setMinutes(d.getMinutes() + 30);
                        handleInputChange(
                          "requestedDateTime",
                          getDateTimeLocal(d),
                        );
                      }}
                    >
                      +30 นาที
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => {
                        const d = new Date();

                        d.setHours(d.getHours() + 2);
                        handleInputChange(
                          "requestedDateTime",
                          getDateTimeLocal(d),
                        );
                      }}
                    >
                      +2 ชั่วโมง
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground mb-2 block">
                    ความเร่งด่วน
                    <span className="text-danger ml-1">*</span>
                  </div>
                  {validationErrors.urgencyLevel && (
                    <div className="text-sm text-danger mb-2">
                      {validationErrors.urgencyLevel}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {URGENCY_OPTIONS.map((option) => (
                      <Chip
                        key={option.value}
                        className="cursor-pointer"
                        color={option.color}
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
                        onClick={() =>
                          handleInputChange("urgencyLevel", option.value)
                        }
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground mb-2 block">
                    ประเภทรถ
                    <span className="text-danger ml-1">*</span>
                  </div>
                  {validationErrors.vehicleType && (
                    <div className="text-sm text-danger mb-2">
                      {validationErrors.vehicleType}
                    </div>
                  )}
                  <RadioGroup
                    isRequired
                    className="gap-3"
                    name="vehicleType"
                    orientation="horizontal"
                    value={formData.vehicleType}
                    onValueChange={(val) =>
                      handleInputChange("vehicleType", val as VehicleType)
                    }
                  >
                    {VEHICLE_TYPE_OPTIONS.map((type) => (
                      <Radio key={type} size="sm" value={type}>
                        {type}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground mb-2 block">
                    มีรถแล้วหรือยัง
                    <span className="text-danger ml-1">*</span>
                  </div>
                  {validationErrors.hasVehicle && (
                    <div className="text-sm text-danger mb-2">
                      {validationErrors.hasVehicle}
                    </div>
                  )}
                  <RadioGroup
                    isRequired
                    className="gap-3"
                    name="hasVehicle"
                    orientation="horizontal"
                    value={formData.hasVehicle}
                    onValueChange={(val) =>
                      handleInputChange("hasVehicle", val as "มี" | "ไม่มี")
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
                    <span className="text-danger ml-1">*</span>
                  </div>
                  {validationErrors.returnTrip && (
                    <div className="text-sm text-danger mb-2">
                      {validationErrors.returnTrip}
                    </div>
                  )}
                  <RadioGroup
                    isRequired
                    className="gap-3"
                    name="returnTrip"
                    orientation="horizontal"
                    value={formData.returnTrip}
                    onValueChange={(val) =>
                      handleInputChange(
                        "returnTrip",
                        val as "ไปส่งอย่างเดียว" | "รับกลับด้วย",
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
              <div className="mt-4">
                <label
                  className="text-sm font-medium text-foreground mb-2 block"
                  htmlFor="equipment-group"
                >
                  อุปกรณ์ที่ต้องการ
                </label>
                <CheckboxGroup
                  id="equipment-group"
                  value={formData.equipment}
                  onValueChange={(values) => {
                    handleInputChange("equipment", values as EquipmentType[]);
                    // ถ้าไม่ได้เลือก "อื่นๆ ระบุ" ให้ล้าง equipmentOther
                    if (!values.includes("อื่นๆ ระบุ")) {
                      handleInputChange("equipmentOther", "");
                    }
                  }}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {EQUIPMENT_OPTIONS.map((equipment) => (
                      <Checkbox key={equipment} size="sm" value={equipment}>
                        {equipment}
                      </Checkbox>
                    ))}
                  </div>
                </CheckboxGroup>
                {formData.equipment.includes("อื่นๆ ระบุ") && (
                  <Input
                    className="mt-3"
                    label="ระบุอุปกรณ์อื่นๆ"
                    placeholder="กรุณาระบุอุปกรณ์ที่ต้องการ"
                    value={formData.equipmentOther || ""}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("equipmentOther", e.target.value);
                    }}
                  />
                )}
              </div>
            </CardBody>
          </Card>

          {/* การ์ดที่ 4: รายละเอียดเพิ่มเติม */}
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
              <Textarea
                classNames={{ input: "resize-y min-h-[40px]" }}
                label="หมายเหตุ / ข้อมูลเพิ่มเติม"
                minRows={3}
                placeholder="ระบุข้อมูลเพิ่มเติมที่สำคัญ เช่น ข้อควรระวังพิเศษ, โรคประจำตัว, อาการพิเศษ"
                value={formData.specialNotes}
                variant="bordered"
                onChange={(e) => {
                  handleInputChange("specialNotes", e.target.value);
                }}
              />
            </CardBody>
          </Card>

          {/* การ์ดปุ่มคำสั่ง */}
          <Card className="shadow-lg border border-default-200 w-full">
            <CardFooter className="p-3 flex justify-end gap-4">
              <Button
                size="md"
                type="button"
                variant="flat"
                onPress={() => {
                  setFormData({
                    requesterDepartment: session?.user?.department || "",
                    requesterName: session?.user?.name || "",
                    requesterPhone: "",

                    patientName: "",
                    patientHN: "",

                    pickupLocation: "",
                    pickupLocationDetail: null,
                    deliveryLocation: "",
                    deliveryLocationDetail: null,
                    requestedDateTime: getDateTimeLocal(),
                    urgencyLevel: "ปกติ",
                    vehicleType: "",
                    equipment: [],
                    hasVehicle: "",
                    returnTrip: "",

                    transportReason: "",
                    specialNotes: "",
                    patientCondition: [],
                  });
                  setValidationErrors({});
                }}
              >
                ล้างข้อมูล
              </Button>
              <Button
                color="primary"
                isLoading={isSubmitting}
                size="md"
                startContent={
                  !isSubmitting && <AmbulanceIcon className="w-5 h-5" />
                }
                type="submit"
              >
                {isSubmitting ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}
              </Button>
            </CardFooter>
          </Card>
        </Form>

        {/* Right Summary */}
        <aside className="space-y-4">
          <Card className="shadow-lg border border-default-200">
            <CardHeader className="pl-0">
              <div className="flex items-center justify-between gap-2 pl-2">
                <div className="flex items-center gap-2">
                  <ClipboardListIcon className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    สรุปคำขอ
                  </h2>
                </div>
                <Chip
                  color={
                    (URGENCY_OPTIONS.find(
                      (o) => o.value === formData.urgencyLevel,
                    )?.color as "default" | "warning" | "danger" | "success") ||
                    "default"
                  }
                  size="sm"
                  variant="bordered"
                >
                  {formData.urgencyLevel}
                </Chip>
              </div>
            </CardHeader>
            <CardBody className="pt-4 text-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-default-600">หน่วยงานผู้แจ้ง</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.requesterDepartment ? "text-danger-600" : "")
                    }
                  >
                    {formData.requesterDepartment || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-default-600">เบอร์โทรผู้แจ้ง</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.requesterPhone ? "text-danger-600" : "")
                    }
                  >
                    {formData.requesterPhone || "-"}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-default-600 mb-1">สถานที่รับ</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.pickupLocationDetail ? "text-danger-600" : "")
                    }
                  >
                    {formData.pickupLocationDetail
                      ? formatLocationString(formData.pickupLocationDetail)
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-default-600 mb-1">สถานที่ส่ง</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.deliveryLocationDetail
                        ? "text-danger-600"
                        : "")
                    }
                  >
                    {formData.deliveryLocationDetail
                      ? formatLocationString(formData.deliveryLocationDetail)
                      : "-"}
                  </div>
                </div>
              </div>
              <div>
                <div>
                  <div className="text-default-600">เหตุผลการเคลื่อนย้าย</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.transportReason ? "text-danger-600" : "")
                    }
                  >
                    {formData.transportReason || "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-default-600">ประเภทรถ</div>
                  <div className="font-medium">{formData.vehicleType}</div>
                </div>
                <div>
                  <div className="text-default-600">มีรถแล้วหรือยัง</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.hasVehicle ? "text-danger-600" : "")
                    }
                  >
                    {formData.hasVehicle ? formData.hasVehicle : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-default-600">ส่งกลับหรือไม่</div>
                  <div
                    className={
                      "font-medium " +
                      (!formData.returnTrip ? "text-danger-600" : "")
                    }
                  >
                    {formData.returnTrip ? formData.returnTrip : "-"}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-default-600">ผู้ป่วย</div>
                <div
                  className={
                    "font-medium " +
                    (!formData.patientHN || !formData.patientName
                      ? "text-danger-600"
                      : "")
                  }
                >
                  {formData.patientHN || "-"}
                  {formData.patientName ? ` - ${formData.patientName}` : ""}
                </div>
              </div>

              <div>
                <div className="text-default-600">เวลานัด</div>
                <div
                  className={
                    "font-medium " +
                    (!formData.requestedDateTime ? "text-danger-600" : "")
                  }
                >
                  {formData.requestedDateTime
                    ? formatThaiDateTimeShort(
                        new Date(formData.requestedDateTime),
                      )
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-default-600">อุปกรณ์ที่ต้องการ</div>
                <div className="flex flex-wrap gap-1">
                  {formData.equipment.length > 0 ? (
                    formData.equipment.map((eq) => (
                      <Chip
                        key={eq}
                        color="warning"
                        size="sm"
                        variant="bordered"
                      >
                        {eq}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-default-500">-</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-default-600">อาการ / สภาพผู้ป่วย</div>
                <div className="flex flex-wrap gap-1">
                  {formData.patientCondition.length > 0 ? (
                    formData.patientCondition.map((condition) => (
                      <Chip
                        key={condition}
                        color="primary"
                        size="sm"
                        variant="bordered"
                      >
                        {condition}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-default-500">-</span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
