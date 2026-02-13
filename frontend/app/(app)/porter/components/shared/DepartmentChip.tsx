"use client";

import React from "react";
import { Chip } from "@heroui/react";

import { PORTER_DESIGN_TOKENS } from "./designTokens";

interface DepartmentChipProps {
  departmentName: string | null | undefined;
  isLoading?: boolean;
  className?: string;
}

/**
 * Component สำหรับแสดงชื่อแผนก
 * รองรับ loading state และใช้ design tokens
 */
export function DepartmentChip({
  departmentName,
  isLoading = false,
  className,
}: DepartmentChipProps) {
  if (isLoading) {
    return (
      <Chip
        className={`${PORTER_DESIGN_TOKENS.colors.muted} ${className ?? ""}`}
        color="default"
        size="sm"
        variant="bordered"
      >
        กำลังโหลด...
      </Chip>
    );
  }

  return (
    <Chip className={className} color="default" size="sm" variant="bordered">
      {departmentName || "-"}
    </Chip>
  );
}
