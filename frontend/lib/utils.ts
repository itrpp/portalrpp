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
 * ฟังก์ชันสำหรับแปลงปี พ.ศ. เป็น ค.ศ.
 * @param year ปี พ.ศ. (จำนวนเต็ม)
 * @returns ปี ค.ศ. (จำนวนเต็ม)
 */
export function fromBuddhistEra(year: number): number {
  return year - 543;
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
 * ฟังก์ชันสำหรับ format วันที่แบบสั้น (วัน เดือน ปี พ.ศ.) สำหรับใช้ใน chart
 * แสดงผลรูปแบบ: วัน เดือนย่อ ปี พ.ศ. เช่น "1 ม.ค. 2567"
 * @param date วันที่ที่ต้องการ format (Date object หรือ string ที่แปลงเป็น Date ได้)
 * @returns string ที่ถูก format แล้ว เช่น "1 ม.ค. 2567"
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = toBuddhistEra(dateObj.getFullYear());

  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  return `${day} ${monthNames[month - 1]} ${year}`;
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

/**
 * ฟังก์ชันสำหรับคำนวณช่วงวันที่ของปีงบประมาณ
 * ปีงบประมาณของไทยเริ่มจาก 1 ตุลาคม ถึง 30 กันยายน ของปีถัดไป
 * @param fiscalYear ปีงบประมาณ (พ.ศ.)
 * @returns object ที่มี start และ end เป็น Date
 */
export function getFiscalYearRange(fiscalYear: number): {
  start: Date;
  end: Date;
} {
  // แปลงปีงบประมาณ (พ.ศ.) เป็น ค.ศ.
  const christianYear = fiscalYear - 543;

  // ปีงบประมาณเริ่มจาก 1 ต.ค. ของปีก่อนหน้า ถึง 30 ก.ย. ของปีปัจจุบัน
  const start = new Date(christianYear - 1, 9, 1); // เดือน 9 = ตุลาคม (0-indexed)
  const end = new Date(christianYear, 8, 30); // เดือน 8 = กันยายน (0-indexed)

  return { start, end };
}

/**
 * ฟังก์ชันสำหรับคำนวณช่วงวันที่ของเดือน
 * @param year ปี ค.ศ.
 * @param month เดือน (1-12)
 * @returns object ที่มี start และ end เป็น Date
 */
export function getMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  // เดือนแรกของเดือน
  const start = new Date(year, month - 1, 1);

  // วันสุดท้ายของเดือน
  const end = new Date(year, month, 0);

  return { start, end };
}

/**
 * ฟังก์ชันสำหรับ format ช่วงวันที่เป็นภาษาไทย
 * แสดงผลรูปแบบ: "1 ธันวาคม 2568 - 31 ธันวาคม 2568"
 * @param start วันที่เริ่มต้น
 * @param end วันที่สิ้นสุด
 * @returns string ที่ถูก format แล้ว
 */
export function formatDateRangeThai(start: Date, end: Date): string {
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

  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const startYear = toBuddhistEra(start.getFullYear());

  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];
  const endYear = toBuddhistEra(end.getFullYear());

  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

/**
 * ฟังก์ชันสำหรับแปลง FilterState เป็น date range string
 * @param filterState FilterState object
 * @returns object ที่มี startDate และ endDate เป็น string ในรูปแบบ "YYYY-MM-DD" หรือ undefined
 */
export function getDateRangeFromFilter(filterState: {
  mode: "date-range" | "month" | "fiscal-year";
  dateRange?: {
    start?: { toString: () => string };
    end?: { toString: () => string };
  };
  month?: number;
  year?: number;
  fiscalYear?: number;
}): { startDate?: string; endDate?: string } {
  if (!filterState) {
    return {};
  }

  if (filterState.mode === "date-range" && filterState.dateRange) {
    const start = filterState.dateRange.start?.toString();
    const end = filterState.dateRange.end?.toString();

    return {
      startDate: start,
      endDate: end,
    };
  }

  if (filterState.mode === "month" && filterState.month && filterState.year) {
    const { start, end } = getMonthRange(filterState.year, filterState.month);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  if (filterState.mode === "fiscal-year" && filterState.fiscalYear) {
    const { start, end } = getFiscalYearRange(filterState.fiscalYear);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  return {};
}
