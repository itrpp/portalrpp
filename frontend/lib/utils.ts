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
 * หมายเหตุ: ฟังก์ชันนี้ใช้ Intl.DateTimeFormat ซึ่งแสดงปีเป็น ค.ศ.
 * สำหรับการแสดงปี พ.ศ. ควรใช้ formatDateThai หรือ formatDateTimeThai
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
 * ฟังก์ชันสำหรับแปลงปี ค.ศ. เป็น พ.ศ.
 * @param year ปี ค.ศ. (จำนวนเต็ม)
 * @returns ปี พ.ศ. (จำนวนเต็ม)
 */
export function toBuddhistEra(year: number): number {
  return year + 543;
}

/**
 * ฟังก์ชันสำหรับ format วันที่และเวลาเป็นภาษาไทยพร้อมปี พ.ศ.
 * แสดงผลรูปแบบ: วัน[ชื่อวัน] ที่ [วัน] [เดือน] [ปี พ.ศ.] [ชั่วโมง]:[นาที]:[วินาที]
 * @param date วันที่ที่ต้องการ format
 * @returns string ที่ถูก format แล้ว เช่น "วันจันทร์ ที่ 15 มกราคม 2567 14:30:45"
 */
export function formatDateTimeThai(date: Date): string {
  const days = [
    "อาทิตย์",
    "จันทร์",
    "อังคาร",
    "พุธ",
    "พฤหัสบดี",
    "ศุกร์",
    "เสาร์",
  ];
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  const day = days[date.getDay()];
  const dayNum = date.getDate();
  const month = months[date.getMonth()];
  const buddhistYear = toBuddhistEra(date.getFullYear());
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `วัน${day} ที่ ${dayNum} ${month} ${buddhistYear} ${hours}:${minutes}:${seconds}`;
}

/**
 * ฟอร์แมตรูปแบบวันที่แบบย่อ ภาษาไทย เช่น "29 ตุลาคม 2568 22:54"
 * ไม่มีชื่อวัน และไม่มีวินาที
 */
export function formatThaiDateTimeShort(date: Date): string {
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  const dayNum = date.getDate();
  const month = months[date.getMonth()];
  const buddhistYear = toBuddhistEra(date.getFullYear());
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${dayNum} ${month} ${buddhistYear} ${hours}:${minutes}`;
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

/**
 * ฟังก์ชันสำหรับแปลง Date เป็นรูปแบบ datetime-local string
 * ใช้สำหรับ input type="datetime-local"
 * @param date วันที่ที่ต้องการแปลง (ถ้าไม่ระบุจะใช้เวลาปัจจุบัน)
 * @returns string ในรูปแบบ "YYYY-MM-DDTHH:mm"
 */
export function getDateTimeLocal(date?: Date): string {
  const d = date ? new Date(date) : new Date();

  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

  return d.toISOString().slice(0, 16);
}
