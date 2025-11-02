"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/react";
import {
  Button,
  Chip,
  Divider,
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

import { PorterJobItem } from "@/types/porter";
import {
  PorterRequestFormData,
  UrgencyLevel,
  VehicleType,
  EquipmentType,
} from "@/types";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  AmbulanceIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

interface JobDetailDrawerProps {
  isOpen: boolean;
  job: PorterJobItem | null;
  onClose: () => void;
  onAcceptJob?: (jobId: string, staffId: string, staffName: string) => void;
  onCancelJob?: (jobId: string) => void;
  onUpdateJob?: (jobId: string, updatedForm: PorterRequestFormData) => void;
}

interface StaffMember {
  id: string;
  name: string;
  department?: string;
  title?: string;
}

const urgencyOptions: {
  value: UrgencyLevel;
  label: string;
  color: "default" | "warning" | "danger" | "success";
}[] = [
  { value: "ปกติ", label: "ปกติ", color: "success" },
  { value: "ด่วน", label: "ด่วน", color: "warning" },
  { value: "ฉุกเฉิน", label: "ฉุกเฉิน", color: "danger" },
];

const vehicleTypeOptions: VehicleType[] = ["รถนั่ง", "รถนอน", "รถกอล์ฟ"];

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

const transportReasonOptions = [
  "ผ่าตัด",
  "ตรวจพิเศษ (CT/MRI/X-Ray)",
  "รับการรักษา",
  "ย้ายห้อง/ตึก",
  "จำหน่ายผู้ป่วย",
  "ฉุกเฉิน",
  "อื่นๆ",
];

// รายการเจ้าหน้าที่ (ตัวอย่างข้อมูล - ในระบบจริงควรดึงมาจาก API)
const staffMembers: StaffMember[] = [
  {
    id: "staff-1",
    name: "นายอริญชย์ ศรีชูเปี่ยม",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-2",
    name: "นายสมชาย ใจดี",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-3",
    name: "นางสาวสุดา รักงาน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-4",
    name: "นายวิชัย ขยัน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
  {
    id: "staff-5",
    name: "นางมาลี เก่งงาน",
    department: "ศูนย์เปล",
    title: "พนักงานเปล",
  },
];

export default function JobDetailDrawer({
  isOpen,
  job,
  onClose,
  onAcceptJob,
  onCancelJob,
  onUpdateJob,
}: JobDetailDrawerProps) {
  const [formData, setFormData] = useState<PorterRequestFormData | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

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

    const selectedStaff = staffMembers.find(
      (staff) => staff.id === selectedStaffId,
    );

    if (!selectedStaff) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลเจ้าหน้าที่ที่เลือก",
        color: "danger",
      });

      return;
    }

    if (onAcceptJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onAcceptJob(job.id, selectedStaff.id, selectedStaff.name);
        addToast({
          title: "รับงานสำเร็จ",
          description: `รับงานสำเร็จ ผู้ดำเนินการ: ${selectedStaff.name}`,
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

  const handleCancelJob = async () => {
    if (onCancelJob) {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onCancelJob(job.id);
        addToast({
          title: "ยกเลิกงานสำเร็จ",
          description: "งานนี้ได้ถูกยกเลิกเรียบร้อยแล้ว",
          color: "warning",
        });
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
  const canEdit = job.status === "waiting" || job.status === "in-progress";

  return (
    <Drawer isOpen={isOpen} placement="right" size="xl" onClose={onClose}>
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
                <p className="text-foreground">
                  {formData.patientCondition || "-"}
                </p>
              </div>
            </section>

            <Divider />

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
                  {transportReasonOptions.map((reason) => (
                    <SelectItem key={reason}>{reason}</SelectItem>
                  ))}
                </Select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Autocomplete
                    defaultSelectedKey={formData.pickupLocation}
                    isDisabled={!canEdit}
                    label="จุดรับ"
                    placeholder="เลือกจุดรับ"
                    selectedKey={formData.pickupLocation}
                    variant="bordered"
                    onSelectionChange={(key) =>
                      handleInputChange("pickupLocation", key || "")
                    }
                  >
                    {locationOptions.map((loc) => (
                      <AutocompleteItem key={loc}>{loc}</AutocompleteItem>
                    ))}
                  </Autocomplete>
                  <Autocomplete
                    defaultSelectedKey={formData.deliveryLocation}
                    isDisabled={!canEdit}
                    label="จุดส่ง"
                    placeholder="เลือกจุดส่ง"
                    selectedKey={formData.deliveryLocation}
                    variant="bordered"
                    onSelectionChange={(key) =>
                      handleInputChange("deliveryLocation", key || "")
                    }
                  >
                    {locationOptions.map((loc) => (
                      <AutocompleteItem key={loc}>{loc}</AutocompleteItem>
                    ))}
                  </Autocomplete>
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
                      {vehicleTypeOptions.map((type) => (
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
                    {urgencyOptions.map((option) => (
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
                    onValueChange={(values) =>
                      handleInputChange("equipment", values as EquipmentType[])
                    }
                  >
                    {equipmentOptions.map((eq) => (
                      <Checkbox key={eq} value={eq}>
                        {equipmentLabels[eq]}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>
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
                    label="ผู้ดำเนินการ"
                    placeholder="เลือกเจ้าหน้าที่ผู้ดำเนินการ"
                    selectedKey={selectedStaffId || job.assignedTo || ""}
                    variant="bordered"
                    onSelectionChange={(key) => {
                      setSelectedStaffId((key as string) || "");
                    }}
                  >
                    {staffMembers.map((staff) => (
                      <AutocompleteItem key={staff.id} textValue={staff.name}>
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">
                            {staff.name}
                          </span>
                          {staff.department && (
                            <span className="text-default-500 text-sm">
                              {staff.department}
                              {staff.title ? ` • ${staff.title}` : ""}
                            </span>
                          )}
                        </div>
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>
                )}
              </div>
            </section>
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
    </Drawer>
  );
}
