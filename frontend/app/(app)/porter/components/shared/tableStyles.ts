/**
 * Shared table styling constants สำหรับ Porter module
 * ใช้เพื่อให้การแสดงผลสอดคล้องกันทุกตาราง
 */
export const PORTER_TABLE_STYLES = {
  // Table wrapper
  wrapper: "min-h-[222px]",

  // Header (th) styling
  th: "bg-default-100/80 text-default-700 font-semibold py-3 px-4 text-base",

  // Cell (td) styling
  td: "py-4 px-4 align-top text-base",

  // Row (tr) styling
  tr: "data-[hover=true]:bg-default-100/50 border-b border-default-100",

  // Text sizes
  text: {
    base: "text-base", // สำหรับเนื้อหาหลัก
    small: "text-sm", // สำหรับข้อมูลรอง
    tiny: "text-tiny", // สำหรับข้อมูลเล็ก
  },

  // Spacing
  spacing: {
    cellPadding: "py-4 px-4", // td padding
    headerPadding: "py-3 px-4", // th padding
    gapSmall: "gap-1.5", // สำหรับ flex items-center
    gapMedium: "gap-2", // สำหรับ flex-col
    gapLarge: "gap-4", // สำหรับ spacing ใหญ่
  },

  // Colors
  colors: {
    headerBg: "bg-default-100/80",
    headerText: "text-default-700",
    cellText: "text-foreground",
    secondaryText: "text-default-500",
    mutedText: "text-default-400",
  },

  // Loading state
  loading: {
    content: "กำลังโหลดข้อมูล...",
    rowClassName: "bg-default-50/50",
  },
} as const;
