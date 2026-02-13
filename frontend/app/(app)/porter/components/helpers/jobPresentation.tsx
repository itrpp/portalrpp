import React from "react";

import { PorterStatusBadge } from "../shared/PorterStatusBadge";

import { PorterJobItem } from "@/types/porter";

// Re-export getUrgencyStyle จาก designTokens
export { getUrgencyStyle } from "../shared/designTokens";

/**
 * Render status chip component
 * ใช้ PorterStatusBadge จาก design tokens
 */
export const renderStatusChip = (job: PorterJobItem) => {
  // แสดง badge เฉพาะ status ที่มี visual indicator
  if (
    job.status === "IN_PROGRESS" ||
    job.status === "COMPLETED" ||
    job.status === "CANCELLED"
  ) {
    return (
      <PorterStatusBadge
        showStaffInfo
        size="sm"
        staffId={
          job.status === "IN_PROGRESS"
            ? job.assignedTo
            : (job.cancelledById ?? undefined)
        }
        staffName={
          job.status === "IN_PROGRESS"
            ? job.assignedToName
            : job.cancelledByName
        }
        status={job.status}
        variant="flat"
      />
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
