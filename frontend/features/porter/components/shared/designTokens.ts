/**
 * Design Tokens สำหรับ Porter module
 * รวม colors, spacing, typography, component sizes, และ status mappings
 * ใช้เพื่อให้การแสดงผลสอดคล้องกันทุก component ใน Porter module
 */

import { PorterJobItem } from '@/types/porter';

export const PORTER_STATUS_COLORS = {
  WAITING_CENTER: 'default' as const,
  WAITING_ACCEPT: 'default' as const,
  IN_PROGRESS: 'warning' as const,
  COMPLETED: 'success' as const,
  CANCELLED: 'danger' as const,
} as const;

export const PORTER_STATUS_LABELS: Record<PorterJobItem['status'], string> = {
  WAITING_CENTER: 'รอศูนย์รับ',
  WAITING_ACCEPT: 'รอผู้ปฏิบัติรับงาน',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
} as const;

export const PORTER_URGENCY_COLORS = {
  ปกติ: 'default' as const,
  ด่วน: 'warning' as const,
  ฉุกเฉิน: 'danger' as const,
} as const;

export const PORTER_URGENCY_STYLES = {
  ปกติ: {
    containerClass: 'border-default-200',
    chipColor: 'default' as const,
  },
  ด่วน: {
    containerClass: 'border-warning-300',
    chipColor: 'warning' as const,
  },
  ฉุกเฉิน: {
    containerClass: 'border-danger-400',
    chipColor: 'danger' as const,
  },
} as const;

export function getStatusLabel(status: PorterJobItem['status']): string {
  return PORTER_STATUS_LABELS[status] ?? status;
}

export function getStatusColor(
  status: PorterJobItem['status'],
): 'default' | 'warning' | 'success' | 'danger' {
  return PORTER_STATUS_COLORS[status] ?? 'default';
}

export function getUrgencyColor(urgencyLevel: string): 'default' | 'warning' | 'danger' {
  return (
    (PORTER_URGENCY_COLORS[urgencyLevel as keyof typeof PORTER_URGENCY_COLORS] as
      | 'default'
      | 'warning'
      | 'danger') ?? 'default'
  );
}

export function getUrgencyStyle(urgencyLevel: string) {
  return (
    PORTER_URGENCY_STYLES[urgencyLevel as keyof typeof PORTER_URGENCY_STYLES] ??
    PORTER_URGENCY_STYLES.ปกติ
  );
}

export const PORTER_DESIGN_TOKENS = {
  colors: {
    primary: 'primary',
    danger: 'danger',
    warning: 'warning',
    success: 'success',
    default: 'default',
    foreground: 'text-foreground',
    secondary: 'text-default-500',
    muted: 'text-default-400',
    headerText: 'text-default-700',
    cellText: 'text-foreground',
    headerBg: 'bg-default-100/80',
    rowHover: 'bg-default-100/50',
    loadingRow: 'bg-default-50/50',
  },
  spacing: {
    gapSmall: 'gap-1.5',
    gapMedium: 'gap-2',
    gapLarge: 'gap-4',
    cellPadding: 'py-4 px-4',
    headerPadding: 'py-3 px-4',
    cardPadding: 'p-4',
    buttonPadding: 'px-4 py-2',
    sectionMargin: 'mt-8',
  },
  typography: {
    base: 'text-base',
    small: 'text-sm',
    tiny: 'text-tiny',
    large: 'text-lg',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    tabularNums: 'tabular-nums',
  },
  sizes: {
    button: { sm: 'sm', md: 'md', lg: 'lg' },
    chip: { sm: 'sm', md: 'md' },
    icon: { small: 16, medium: 20, large: 24 },
  },
  borderRadius: { md: 'rounded-md', full: 'rounded-full' },
  shadows: { card: 'shadow-lg', modal: 'shadow-2xl' },
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
