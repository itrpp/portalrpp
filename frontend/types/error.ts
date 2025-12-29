/**
 * ========================================
 * ERROR TYPES
 * ========================================
 * Types สำหรับ error boundary components
 */

/**
 * Props สำหรับ Error component (Next.js error boundary)
 * รองรับ digest property ที่ Next.js เพิ่มเข้ามา
 */
export interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

