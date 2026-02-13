/**
 * Design Tokens สำหรับ Porter module
 * รวม colors, spacing, typography, component sizes, และ status mappings
 * ใช้เพื่อให้การแสดงผลสอดคล้องกันทุก component ใน Porter module
 */

import { PorterJobItem } from "@/types/porter";

/**
 * Status colors mapping สำหรับ Porter jobs
 */
export const PORTER_STATUS_COLORS = {
  WAITING_CENTER: "default" as const,
  WAITING_ACCEPT: "default" as const,
  IN_PROGRESS: "warning" as const,
  COMPLETED: "success" as const,
  CANCELLED: "danger" as const,
} as const;

/**
 * Status labels mapping สำหรับ Porter jobs
 */
export const PORTER_STATUS_LABELS: Record<PorterJobItem["status"], string> = {
  WAITING_CENTER: "รอศูนย์รับ",
  WAITING_ACCEPT: "รอผู้ปฏิบัติรับงาน",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
} as const;

/**
 * Urgency colors mapping
 */
export const PORTER_URGENCY_COLORS = {
  ปกติ: "default" as const,
  ด่วน: "warning" as const,
  ฉุกเฉิน: "danger" as const,
} as const;

/**
 * Urgency container styles สำหรับ JobTable cards
 */
export const PORTER_URGENCY_STYLES = {
  ปกติ: {
    containerClass: "border-default-200",
    chipColor: "default" as const,
  },
  ด่วน: {
    containerClass: "border-warning-300",
    chipColor: "warning" as const,
  },
  ฉุกเฉิน: {
    containerClass: "border-danger-400",
    chipColor: "danger" as const,
  },
} as const;

/**
 * Helper functions สำหรับ status และ urgency
 */
export function getStatusLabel(status: PorterJobItem["status"]): string {
  return PORTER_STATUS_LABELS[status] ?? status;
}

export function getStatusColor(
  status: PorterJobItem["status"],
): "default" | "warning" | "success" | "danger" {
  return PORTER_STATUS_COLORS[status] ?? "default";
}

export function getUrgencyColor(
  urgencyLevel: string,
): "default" | "warning" | "danger" {
  return (
    (PORTER_URGENCY_COLORS[
      urgencyLevel as keyof typeof PORTER_URGENCY_COLORS
    ] as "default" | "warning" | "danger") ?? "default"
  );
}

export function getUrgencyStyle(urgencyLevel: string) {
  return (
    PORTER_URGENCY_STYLES[urgencyLevel as keyof typeof PORTER_URGENCY_STYLES] ??
    PORTER_URGENCY_STYLES.ปกติ
  );
}

/**
 * Design Tokens หลักสำหรับ Porter module
 */
export const PORTER_DESIGN_TOKENS = {
  // Colors
  colors: {
    // Semantic colors (ใช้จาก HeroUI theme)
    primary: "primary",
    danger: "danger",
    warning: "warning",
    success: "success",
    default: "default",

    // Text colors
    foreground: "text-foreground",
    secondary: "text-default-500",
    muted: "text-default-400",
    headerText: "text-default-700",
    cellText: "text-foreground",

    // Background colors
    headerBg: "bg-default-100/80",
    rowHover: "bg-default-100/50",
    loadingRow: "bg-default-50/50",
  },

  // Spacing
  spacing: {
    // Gap sizes
    gapSmall: "gap-1.5", // สำหรับ flex items-center
    gapMedium: "gap-2", // สำหรับ flex-col
    gapLarge: "gap-4", // สำหรับ spacing ใหญ่

    // Padding
    cellPadding: "py-4 px-4", // td padding
    headerPadding: "py-3 px-4", // th padding
    cardPadding: "p-4", // card padding
    buttonPadding: "px-4 py-2", // button padding (default)

    // Margin
    sectionMargin: "mt-8", // margin ระหว่าง sections
  },

  // Typography
  typography: {
    // Font sizes
    base: "text-base", // สำหรับเนื้อหาหลัก
    small: "text-sm", // สำหรับข้อมูลรอง
    tiny: "text-tiny", // สำหรับข้อมูลเล็ก
    large: "text-lg", // สำหรับ headers

    // Font weights
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",

    // Special
    tabularNums: "tabular-nums", // สำหรับตัวเลขที่ต้อง align
  },

  // Component sizes
  sizes: {
    // Button sizes
    button: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },

    // Chip sizes
    chip: {
      sm: "sm",
      md: "md",
    },

    // Icon sizes (in pixels)
    icon: {
      small: 16, // small/inline
      medium: 20, // medium/buttons
      large: 24, // large/headers
    },
  },

  // Border radius
  borderRadius: {
    md: "rounded-md", // สำหรับ cards, inputs
    full: "rounded-full", // สำหรับ chips, badges
  },

  // Shadows & elevation (ใช้จาก Tailwind)
  shadows: {
    card: "shadow-lg", // สำหรับ cards
    modal: "shadow-2xl", // สำหรับ modals, drawers
  },

  // Status & Urgency mappings (re-export จากข้างบน)
  status: {
    colors: PORTER_STATUS_COLORS,
    labels: PORTER_STATUS_LABELS,
    getLabel: getStatusLabel,
    getColor: getStatusColor,
  },

  urgency: {
    colors: PORTER_URGENCY_COLORS,
    styles: PORTER_URGENCY_STYLES,
    getColor: getUrgencyColor,
    getStyle: getUrgencyStyle,
  },
} as const;

/**
 * Re-export PORTER_TABLE_STYLES สำหรับ backward compatibility
 */
export { PORTER_TABLE_STYLES } from "./tableStyles";
