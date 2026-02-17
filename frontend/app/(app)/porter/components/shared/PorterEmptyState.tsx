"use client";

import React from "react";

import { EmptyState, type EmptyStateProps } from "@/components/ui/EmptyState";

/**
 * Empty state component สำหรับ Porter module
 * ใช้ EmptyState ร่วมจาก @/components/ui/EmptyState เพื่อให้รูปแบบสอดคล้องทั้งแอป
 * @deprecated ถ้า import ใหม่ให้ใช้ EmptyState จาก @/components/ui/EmptyState โดยตรง
 */
export function PorterEmptyState(props: EmptyStateProps) {
  return <EmptyState {...props} />;
}
