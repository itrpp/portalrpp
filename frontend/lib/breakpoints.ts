/**
 * มาตรฐาน Responsive Breakpoints ของโปรเจกต์ (สอดคล้อง Tailwind CSS)
 * ใช้เป็น single source of truth สำหรับ class responsive (sm:, md:, lg:, xl:, 2xl:)
 * และสำหรับ logic ที่ใช้ matchMedia / useMediaQuery
 *
 * ตารางขนาดและการจับคู่กับอุปกรณ์:
 * - default (0px+)   : Mobile ทุกรุ่น
 * - sm (640px)       : มือถือแนวนอน / Tablet ขนาดเล็ก
 * - md (768px)       : Tablet แนวตั้ง (เช่น iPad)
 * - lg (1024px)      : Notebook / Tablet แนวนอน
 * - xl (1280px)      : PC (Desktop จอมาตรฐาน)
 * - 2xl (1536px)     : PC จอใหญ่ / Ultrawide
 */
export const BREAKPOINTS = {
  /** 640px — มือถือแนวนอน / Tablet ขนาดเล็ก */
  sm: 640,
  /** 768px — Tablet แนวตั้ง (เช่น iPad) */
  md: 768,
  /** 1024px — Notebook / Tablet แนวนอน */
  lg: 1024,
  /** 1280px — PC (Desktop จอมาตรฐาน) */
  xl: 1280,
  /** 1536px — PC จอใหญ่ / Ultrawide */
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/** ค่า min-width เป็น px สำหรับใช้กับ matchMedia("(min-width: Npx)") */
export const BREAKPOINT_PX = {
  sm: `${BREAKPOINTS.sm}px`,
  md: `${BREAKPOINTS.md}px`,
  lg: `${BREAKPOINTS.lg}px`,
  xl: `${BREAKPOINTS.xl}px`,
  '2xl': `${BREAKPOINTS['2xl']}px`,
} as const;

/** คำอธิบายประเภทอุปกรณ์ (ใช้ใน UI/เอกสาร) */
export const BREAKPOINT_DEVICE_LABELS: Record<BreakpointKey, string> = {
  sm: 'มือถือแนวนอน / Tablet ขนาดเล็ก',
  md: 'Tablet แนวตั้ง (เช่น iPad)',
  lg: 'Notebook / Tablet แนวนอน',
  xl: 'PC (Desktop จอมาตรฐาน)',
  '2xl': 'PC จอใหญ่ / Ultrawide',
};
