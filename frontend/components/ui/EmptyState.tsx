"use client";

import React from "react";
import { Button } from "@heroui/react";

export type EmptyStateVariant = "no-data" | "no-results" | "error";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  message?: string;
  /** ข้อความช่วยเหลือใต้ message (เช่น "คลิกปุ่ม... เพื่อเพิ่มข้อมูล") */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  /** ลด padding สำหรับใช้ใน table/card */
  compact?: boolean;
}

const DEFAULT_MESSAGES: Record<EmptyStateVariant, string> = {
  "no-data": "ยังไม่มีข้อมูล",
  "no-results": "ไม่พบผลลัพธ์ที่ค้นหา",
  error: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
};

/**
 * Component แสดง empty state ร่วมสำหรับทั้งแอป (Setting, Porter)
 * ใช้ให้รูปแบบ "ยังไม่มีข้อมูล" / "ไม่พบผลลัพธ์" สอดคล้องกันทุกหน้า
 */
export function EmptyState({
  variant = "no-data",
  message,
  description,
  actionLabel,
  onAction,
  icon,
  compact = false,
}: EmptyStateProps) {
  const displayMessage = message ?? DEFAULT_MESSAGES[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-6" : "mt-8 py-12"
      }`}
    >
      {icon && (
        <div aria-hidden="true" className="mb-4 text-default-400">
          {icon}
        </div>
      )}
      <p
        className={`text-base text-default-500 ${description ? "mb-1" : "mb-4"}`}
      >
        {displayMessage}
      </p>
      {description && (
        <p className="text-sm text-default-400 mb-4">{description}</p>
      )}
      {onAction && actionLabel && (
        <Button color="primary" size="md" variant="solid" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
