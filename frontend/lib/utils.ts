import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function สำหรับรวม CSS classes
 * รองรับ conditional classes และ merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ฟังก์ชันสำหรับ format วันที่ (ภาษาไทย)
 * แสดงผลรูปแบบ: วัน เดือน ปี ชั่วโมง:นาที (ระบบไทย)
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * ฟังก์ชันสำหรับการคำนวณและแสดงขนาดไฟล์
 * รองรับหน่วย: Bytes, KB, MB, GB
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const base = 1024;
  const units = ["Bytes", "KB", "MB", "GB"] as const;
  const unitIndex = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(base)),
  );

  const value = bytes / Math.pow(base, unitIndex);

  return `${parseFloat(value.toFixed(2))} ${units[unitIndex]}`;
}
