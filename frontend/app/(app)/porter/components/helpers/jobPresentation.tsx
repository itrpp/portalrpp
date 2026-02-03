import { Chip } from "@heroui/react";

import { PorterJobItem } from "@/types/porter";

type UrgencyStyle = {
  containerClass: string;
  chipColor: "default" | "warning" | "danger";
};

const urgencyStyleMap: Record<string, UrgencyStyle> = {
  ฉุกเฉิน: {
    containerClass: "bg-danger-50/30 border-danger-200",
    chipColor: "danger",
  },
  ด่วน: {
    containerClass: "bg-warning-50/30 border-warning-200",
    chipColor: "warning",
  },
  ปกติ: {
    containerClass: "bg-content1 border-default-200",
    chipColor: "default",
  },
};

export const getUrgencyStyle = (urgencyLevel: string | undefined) =>
  urgencyStyleMap[urgencyLevel || "ปกติ"] ?? urgencyStyleMap["ปกติ"];

export const renderStatusChip = (job: PorterJobItem) => {
  if (job.status === "IN_PROGRESS") {
    // แสดงชื่อเจ้าหน้าที่ถ้ามี ถ้าไม่มีให้ fallback ไปใช้ ID

    const staffInfo =
      job.assignedToName || (job.assignedTo ? `ID: ${job.assignedTo}` : null);
    const label = staffInfo
      ? `กำลังดำเนินการ [${staffInfo}]`
      : "กำลังดำเนินการ";

    return (
      <Chip color="warning" size="sm" variant="flat">
        {label}
      </Chip>
    );
  }

  if (job.status === "COMPLETED") {
    return (
      <Chip color="success" size="sm" variant="flat">
        เสร็จสิ้น
      </Chip>
    );
  }

  if (job.status === "CANCELLED") {
    const staffInfo =
      job.cancelledByName ||
      (job.cancelledById ? `ID: ${job.cancelledById}` : "");
    const label = staffInfo ? `ยกเลิก [${staffInfo}]` : "ยกเลิก";

    return (
      <Chip color="danger" size="sm" variant="flat">
        {label}
      </Chip>
    );
  }

  return null;
};

export const buildMetaChipData = (
  job: PorterJobItem,
  departmentName?: string | null,
) => {
  const chips: string[] = [];

  // ใช้ชื่อหน่วยงานถ้ามี ถ้าไม่มีให้แสดง ID หรือ "-"
  if (departmentName) {
    chips.push(departmentName);
  } else if (job.form.requesterDepartment !== null) {
    chips.push(`หน่วยงาน ID: ${job.form.requesterDepartment}`);
  } else {
    chips.push("-");
  }
  chips.push(job.form.vehicleType);

  if (job.form.hasVehicle) {
    chips.push(`มีรถแล้ว: ${job.form.hasVehicle}`);
  }

  if (job.form.returnTrip) {
    chips.push(job.form.returnTrip);
  }

  if (job.form.equipment.length > 0) {
    chips.push(`อุปกรณ์ ${job.form.equipment.length} รายการ`);
  }

  return chips;
};
