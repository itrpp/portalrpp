"use client";

import React from "react";
import { Button } from "@heroui/react";

import { PORTER_DESIGN_TOKENS } from "./designTokens";

interface PorterEmptyStateProps {
  variant?: "no-data" | "no-results" | "error";
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * Component สำหรับแสดง empty state ที่มีรูปแบบสอดคล้องกัน
 */
export function PorterEmptyState({
  variant = "no-data",
  message,
  actionLabel,
  onAction,
  icon,
}: PorterEmptyStateProps) {
  const defaultMessages = {
    "no-data": "ยังไม่มีข้อมูล",
    "no-results": "ไม่พบผลลัพธ์ที่ค้นหา",
    error: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
  };

  const displayMessage = message ?? defaultMessages[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center ${PORTER_DESIGN_TOKENS.spacing.sectionMargin} py-12`}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={`mb-4 ${PORTER_DESIGN_TOKENS.colors.muted}`}
        >
          {icon}
        </div>
      )}
      <p
        className={`${PORTER_DESIGN_TOKENS.typography.base} ${PORTER_DESIGN_TOKENS.colors.secondary} mb-4`}
      >
        {displayMessage}
      </p>
      {onAction && actionLabel && (
        <Button color="primary" size="md" variant="solid" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
