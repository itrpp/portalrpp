"use client";

import React from "react";
import { Chip } from "@heroui/react";

import { getStatusLabel, getStatusColor } from "./designTokens";

import { PorterJobItem } from "@/types/porter";

interface PorterStatusBadgeProps {
  status: PorterJobItem["status"];
  size?: "sm" | "md";
  variant?: "flat" | "bordered" | "dot";
  showStaffInfo?: boolean;
  staffName?: string | null;
  staffId?: string | null;
  className?: string;
}

/**
 * Component สำหรับแสดงสถานะงาน Porter
 * ใช้ design tokens เพื่อให้สี/ข้อความสอดคล้องกันทุกที่
 */
export function PorterStatusBadge({
  status,
  size = "sm",
  variant = "flat",
  showStaffInfo = false,
  staffName,
  staffId,
  className,
}: PorterStatusBadgeProps) {
  const label = getStatusLabel(status);
  const color = getStatusColor(status);

  // เพิ่มข้อมูลเจ้าหน้าที่สำหรับ IN_PROGRESS และ CANCELLED
  let displayLabel = label;

  if (showStaffInfo) {
    if (status === "IN_PROGRESS" && (staffName || staffId)) {
      const staffInfo = staffName || (staffId ? `ID: ${staffId}` : null);

      displayLabel = staffInfo ? `${label} [${staffInfo}]` : label;
    } else if (status === "CANCELLED" && (staffName || staffId)) {
      const staffInfo = staffName || (staffId ? `ID: ${staffId}` : "");

      displayLabel = staffInfo ? `${label} [${staffInfo}]` : label;
    }
  }

  return (
    <Chip className={className} color={color} size={size} variant={variant}>
      {displayLabel}
    </Chip>
  );
}
