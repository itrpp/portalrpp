"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
  Textarea,
  Chip,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  addToast,
} from "@heroui/react";

import {
  AmbulanceIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";
import {
  PorterRequestFormData,
  VehicleType,
  UrgencyLevel,
  EquipmentType,
} from "@/types";

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
    patientAge: "",
    patientGender: "ไม่ระบุ",
    patientWeight: "",

    pickupLocation: "",
    deliveryLocation: "",
    requestedDateTime: "",
    urgencyLevel: "ปกติ",
    vehicleType: "รถนั่ง",
    equipment: [],
    assistanceCount: "",
    hasVehicle: "",

    transportReason: "",
    medicalAllergies: "",
    specialNotes: "",
    patientCondition: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof PorterRequestFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ตัวเลือกสำหรับ dropdown
  const urgencyOptions: {
    value: UrgencyLevel;
    label: string;
    color: "default" | "warning" | "danger";
  }[] = [
    { value: "ปกติ", label: "ปกติ", color: "default" },
    { value: "ด่วน", label: "ด่วน", color: "warning" },
    { value: "ฉุกเฉิน", label: "ฉุกเฉิน", color: "danger" },
  ];

  const vehicleTypeOptions: VehicleType[] = ["รถนั่ง", "รถนอน"];

  const equipmentOptions: EquipmentType[] = [
    "Oxygen",
    "Tube",
    "IV Pump",
    "Ventilator",
    "Monitor",
    "Suction",
  ];

  const equipmentLabels: Record<EquipmentType, string> = {
    Oxygen: "Oxygen (ออกซิเจน)",
    Tube: "Tube (สายให้อาหาร)",
    "IV Pump": "IV Pump (เครื่องปั๊มสารน้ำ)",
    Ventilator: "Ventilator (เครื่องช่วยหายใจ)",
    Monitor: "Monitor (เครื่องวัดสัญญาณชีพ)",
    Suction: "Suction (เครื่องดูดเสมหะ)",
  };

  const transportReasonOptions = [
    "ผ่าตัด",
    "ตรวจพิเศษ (CT/MRI/X-Ray)",
    "รับการรักษา",
    "ย้ายห้อง/ตึก",
    "จำหน่ายผู้ป่วย",
    "ฉุกเฉิน",
    "อื่นๆ",
  ];

  // ตัวอย่างสถานที่ (ในระบบจริงควรดึงมาจาก API หรือ database)
  const locationOptions = [
    "ห้อง 101",
    "ห้อง 205",
    "ห้อง 302",
    "วอร์ด 4A",
    "ICU",
    "ER",
    "[188] [อาคารเฉลิมพระเกียรติ] X-ray",
    "[191] [อาคารเมตตาธรรม] X-ray",
    "OR-3",
    "OPD",
    "แผนกเภสัช",
    "คลังเวชภัณฑ์",
  ];

  // ตัวอย่างหน่วยงาน (ในระบบจริงควรดึงมาจาก API หรือ database)
  const departmentOptions = [
    "แผนกอายุรกรรม",
    "แผนกศัลยกรรม",
    "แผนกสูติ-นรีเวช",
    "แผนกกุมารเวช",
    "แผนกฉุกเฉิน",
    "แผนกไอซียู",
    "แผนกคลัง",
    "แผนกเภสัชกรรม",
  ];

  // ใช้ Autocomplete ของ HeroUI ในการค้นหา/กรอง

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PorterRequestFormData, string>> = {};

    if (!formData.requesterDepartment.trim()) {
      newErrors.requesterDepartment = "กรุณากรอกหน่วยงานผู้แจ้ง";
    }

    if (!formData.requesterName.trim()) {
      newErrors.requesterName = "กรุณากรอกชื่อผู้แจ้ง";
    }

    if (!formData.requesterPhone.trim()) {
      newErrors.requesterPhone = "กรุณากรอกเบอร์โทรติดต่อ";
    } else if (
      !/^[0-9]{9,10}$/.test(formData.requesterPhone.replace(/[- ]/g, ""))
    ) {
      newErrors.requesterPhone = "รูปแบบเบอร์โทรไม่ถูกต้อง";
    }

    if (!formData.patientName.trim()) {
      newErrors.patientName = "กรุณากรอกชื่อผู้ป่วย";
    }

    if (!formData.patientHN.trim()) {
      newErrors.patientHN = "กรุณากรอกหมายเลข HN";
    }

    if (!formData.pickupLocation.trim()) {
      newErrors.pickupLocation = "กรุณาระบุสถานที่รับ";
    }

    if (!formData.deliveryLocation.trim()) {
      newErrors.deliveryLocation = "กรุณาระบุสถานที่ส่ง";
    }

    if (!formData.requestedDateTime.trim()) {
      newErrors.requestedDateTime =
        "กรุณาระบุวันที่และเวลาที่ต้องการเคลื่อนย้าย";
    }

    if (formData.assistanceCount === "") {
      newErrors.assistanceCount = "กรุณาระบุจำนวนผู้ช่วยเหลือ";
    }

    if (!formData.transportReason.trim()) {
      newErrors.transportReason = "กรุณากรอกรายการเหตุการเคลื่อนย้าย";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง",
        color: "danger",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: ส่งข้อมูลไปยัง API
      // const response = await fetch('/api/porter/request', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });

      // จำลองการส่งข้อมูล (รอ 1 วินาที)
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
        patientAge: "",
        patientGender: "ไม่ระบุ",
        patientWeight: "",

        pickupLocation: "",
        deliveryLocation: "",
        requestedDateTime: "",
        urgencyLevel: "ปกติ",
        vehicleType: "รถนั่ง",
        equipment: [],
        assistanceCount: "",
        hasVehicle: "",

        transportReason: "",
        medicalAllergies: "",
        specialNotes: "",
        patientCondition: "",
      });

      setErrors({});
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleInputChange = (
    field: keyof PorterRequestFormData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Format datetime-local input
  const getDateTimeLocal = (): string => {
    const now = new Date();

    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    return now.toISOString().slice(0, 16);
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
        <form className="space-y-6 md:col-span-2" onSubmit={handleSubmit}>
          {/* รวมเป็นการ์ดเดียว */}
          <Card className="shadow-lg border border-default-200">
            <CardBody className="space-y-8 pt-4">
              {/* ส่วนที่ 1: ข้อมูลหน่วยงานผู้แจ้ง */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    ข้อมูลหน่วยงานผู้แจ้ง
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    isRequired
                    errorMessage={errors.requesterDepartment}
                    isInvalid={!!errors.requesterDepartment}
                    label="หน่วยงานผู้แจ้ง"
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
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept}>{dept}</SelectItem>
                    ))}
                  </Select>

                  <Input
                    isRequired
                    errorMessage={errors.requesterName}
                    isInvalid={!!errors.requesterName}
                    label="ชื่อผู้แจ้ง"
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
                    errorMessage={errors.requesterPhone}
                    isInvalid={!!errors.requesterPhone}
                    label="เบอร์โทรติดต่อ"
                    placeholder="เช่น 0812345678"
                    startContent={
                      <PhoneIcon className="w-4 h-4 text-default-400" />
                    }
                    value={formData.requesterPhone}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("requesterPhone", e.target.value);
                    }}
                  />
                </div>
              </section>

              <div className="border-t border-default-200" />

              {/* ส่วนที่ 2: ข้อมูลผู้ป่วย */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    ข้อมูลผู้ป่วย
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    isRequired
                    errorMessage={errors.patientHN}
                    isInvalid={!!errors.patientHN}
                    label="หมายเลข HN / AN"
                    placeholder="เช่น 123456/68"
                    value={formData.patientHN}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("patientHN", e.target.value);
                    }}
                  />

                  <Input
                    isRequired
                    errorMessage={errors.patientName}
                    isInvalid={!!errors.patientName}
                    label="ชื่อผู้ป่วย"
                    placeholder="กรอกชื่อผู้ป่วย"
                    value={formData.patientName}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("patientName", e.target.value);
                    }}
                  />
                </div>
                <div className="mt-4">
                  <Textarea
                    classNames={{
                      input: "resize-y min-h-[40px]",
                    }}
                    label="สภาพผู้ป่วย"
                    minRows={3}
                    placeholder="เช่น ผู้ป่วยไม่รู้สึกตัว, ผู้ป่วยเดินได้เอง ฯลฯ"
                    value={formData.patientCondition}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange("patientCondition", e.target.value);
                    }}
                  />
                </div>
              </section>

              <div className="border-t border-default-200" />

              {/* ส่วนที่ 3: ข้อมูลการเคลื่อนย้าย */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MapPinIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    ข้อมูลการเคลื่อนย้าย
                  </h3>
                </div>
                <Select
                  isRequired
                  errorMessage={errors.transportReason}
                  isInvalid={!!errors.transportReason}
                  label="รายการเหตุผลการเคลื่อนย้าย"
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
                  {transportReasonOptions.map((r) => (
                    <SelectItem key={r}>{r}</SelectItem>
                  ))}
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Autocomplete
                    isRequired
                    errorMessage={errors.pickupLocation}
                    isInvalid={!!errors.pickupLocation}
                    label="สถานที่รับ"
                    placeholder="พิมพ์เพื่อค้นหาและเลือกสถานที่รับ"
                    selectedKey={formData.pickupLocation || undefined}
                    startContent={<MapPinIcon className="w-4 h-4" />}
                    variant="bordered"
                    onSelectionChange={(key) => {
                      handleInputChange("pickupLocation", String(key));
                    }}
                  >
                    {locationOptions.map((location) => (
                      <AutocompleteItem key={location} textValue={location}>
                        {location}
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>

                  <Autocomplete
                    isRequired
                    errorMessage={errors.deliveryLocation}
                    isInvalid={!!errors.deliveryLocation}
                    label="สถานที่ส่ง"
                    placeholder="พิมพ์เพื่อค้นหาและเลือกสถานที่ส่ง"
                    selectedKey={formData.deliveryLocation || undefined}
                    startContent={<MapPinIcon className="w-4 h-4" />}
                    variant="bordered"
                    onSelectionChange={(key) => {
                      handleInputChange("deliveryLocation", String(key));
                    }}
                  >
                    {locationOptions.map((location) => (
                      <AutocompleteItem key={location} textValue={location}>
                        {location}
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Input
                      isRequired
                      errorMessage={errors.requestedDateTime}
                      isInvalid={!!errors.requestedDateTime}
                      label="วันที่และเวลาที่ต้องการเคลื่อนย้าย"
                      placeholder="เลือกวันที่และเวลา"
                      startContent={
                        <CalendarIcon className="w-4 h-4 text-default-400" />
                      }
                      type="datetime-local"
                      value={formData.requestedDateTime || getDateTimeLocal()}
                      variant="bordered"
                      onChange={(e) => {
                        handleInputChange("requestedDateTime", e.target.value);
                      }}
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
                          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

                          handleInputChange(
                            "requestedDateTime",
                            d.toISOString().slice(0, 16),
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
                          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

                          handleInputChange(
                            "requestedDateTime",
                            d.toISOString().slice(0, 16),
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {urgencyOptions.map((option) => (
                        <Chip
                          key={option.value}
                          className="cursor-pointer"
                          color={
                            formData.urgencyLevel === option.value
                              ? option.color
                              : "default"
                          }
                          variant={
                            formData.urgencyLevel === option.value
                              ? "solid"
                              : "flat"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        ประเภทรถ
                      </div>
                      <RadioGroup
                        className="gap-3"
                        orientation="horizontal"
                        value={formData.vehicleType}
                        onValueChange={(val) =>
                          handleInputChange("vehicleType", val as VehicleType)
                        }
                      >
                        {vehicleTypeOptions.map((type) => (
                          <Radio key={type} size="sm" value={type}>
                            {type}
                          </Radio>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground mb-2 block">
                        มีรถแล้วหรือยัง
                      </div>
                      <RadioGroup
                        className="gap-3"
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
                    }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {equipmentOptions.map((equipment) => (
                        <Checkbox key={equipment} size="sm" value={equipment}>
                          {equipmentLabels[equipment]}
                        </Checkbox>
                      ))}
                    </div>
                  </CheckboxGroup>
                </div>
              </section>

              <div className="border-t border-default-200" />

              {/* ส่วนที่ 4: รายละเอียดเพิ่มเติม */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardListIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    รายละเอียดเพิ่มเติม
                  </h3>
                </div>
                <Textarea
                  label="ข้อมูลแพ้ยา/สาร (ถ้ามี)"
                  minRows={2}
                  placeholder="กรอกข้อมูลการแพ้ยาหรือสารต่างๆ"
                  value={formData.medicalAllergies}
                  variant="bordered"
                  onChange={(e) => {
                    handleInputChange("medicalAllergies", e.target.value);
                  }}
                />

                <Textarea
                  className="mt-4"
                  label="หมายเหตุ / ข้อมูลเพิ่มเติม"
                  minRows={2}
                  placeholder="ระบุข้อมูลเพิ่มเติมที่สำคัญ เช่น ข้อควรระวังพิเศษ, โรคประจำตัว, อาการพิเศษ"
                  value={formData.specialNotes}
                  variant="bordered"
                  onChange={(e) => {
                    handleInputChange("specialNotes", e.target.value);
                  }}
                />
              </section>
            </CardBody>
            <CardFooter className="border-t border-default-200 mt-2 p-3 flex justify-end gap-4">
              <Button
                size="md"
                type="button"
                variant="flat"
                onPress={() => {
                  // Reset form
                  setFormData({
                    requesterDepartment: session?.user?.department || "",
                    requesterName: session?.user?.name || "",
                    requesterPhone: "",

                    patientName: "",
                    patientHN: "",
                    patientAge: "",
                    patientGender: "ไม่ระบุ",
                    patientWeight: "",

                    pickupLocation: "",
                    deliveryLocation: "",
                    requestedDateTime: "",
                    urgencyLevel: "ปกติ",
                    vehicleType: "รถนั่ง",
                    equipment: [],
                    assistanceCount: "",
                    hasVehicle: "",

                    transportReason: "",
                    medicalAllergies: "",
                    specialNotes: "",
                    patientCondition: "",
                  });
                  setErrors({});
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
        </form>

        {/* Right Summary */}
        <aside className="space-y-4">
          <Card className="shadow-lg border border-default-200">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <ClipboardListIcon className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  สรุปคำขอ
                </h2>
              </div>
            </CardHeader>
            <CardBody className="pt-4 text-sm space-y-3">
              <div className="space-y-1">
                <div className="text-default-600">หน่วยงานผู้แจ้ง</div>
                <div className="font-medium">
                  {formData.requesterDepartment || "-"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-default-600">สถานที่รับ</div>
                  <div className="font-medium">
                    {formData.pickupLocation || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-default-600">สถานที่ส่ง</div>
                  <div className="font-medium">
                    {formData.deliveryLocation || "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-default-600">ความเร่งด่วน</div>
                  <div className="font-medium">{formData.urgencyLevel}</div>
                </div>
                <div>
                  <div className="text-default-600">ประเภทรถ</div>
                  <div className="font-medium">{formData.vehicleType}</div>
                </div>
              </div>
              <div>
                <div className="text-default-600">ผู้ป่วย</div>
                <div className="font-medium">
                  {formData.patientHN || "-"}
                  {formData.patientName ? ` - ${formData.patientName}` : ""}
                </div>
              </div>
              <div>
                <div className="text-default-600">อุปกรณ์</div>
                <div className="flex flex-wrap gap-1">
                  {formData.equipment.length > 0 ? (
                    formData.equipment.map((eq) => (
                      <Chip key={eq} size="sm" variant="flat">
                        {eq}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-default-500">-</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-default-600">เวลานัด</div>
                <div className="font-medium">
                  {formData.requestedDateTime || "-"}
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
