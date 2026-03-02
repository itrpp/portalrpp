import { LOADING_MESSAGES } from './constants';

/**
 * Shared table styling constants สำหรับทุกตารางในแอป
 * ใช้เพื่อให้การแสดงผลสอดคล้องกัน (Porter, Setting)
 */
export const TABLE_STYLES = {
  // Table wrapper
  wrapper: 'min-h-[222px]',

  // Header (th) styling
  th: 'bg-default-200 text-default-700 font-semibold py-3 px-4 text-sm',

  // Cell (td) styling
  td: 'py-4 px-4 align-top text-sm',

  // Row (tr) styling
  tr: 'data-[hover=true]:bg-default-100/50 border-b border-default-100',

  // Text sizes
  text: {
    base: 'text-base',
    small: 'text-sm',
    tiny: 'text-tiny',
  },

  // Spacing
  spacing: {
    cellPadding: 'py-4 px-4',
    headerPadding: 'py-3 px-4',
    gapSmall: 'gap-1.5',
    gapMedium: 'gap-2',
    gapLarge: 'gap-4',
  },

  // Colors
  colors: {
    headerBg: 'bg-default-100/80',
    headerText: 'text-default-700',
    cellText: 'text-foreground',
    secondaryText: 'text-default-500',
    mutedText: 'text-default-400',
  },

  // Loading state (ใช้ LOADING_MESSAGES จาก lib/constants)
  loading: {
    content: LOADING_MESSAGES.table,
    rowClassName: 'bg-default-50/50',
  },

  // Pagination
  pagination: {
    containerClass: 'flex items-center justify-between mt-4 px-2',
    textClass: 'text-sm text-default-500',
    labelClass: 'text-sm text-default-500',
    selectClass:
      'px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent',
  },
} as const;
