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
 * ฟังก์ชันสำหรับแปลงปี ค.ศ. เป็น พ.ศ.
 * @param year ปี ค.ศ. (จำนวนเต็ม)
 * @returns ปี พ.ศ. (จำนวนเต็ม)
 */
export function toBuddhistEra(year: number): number {
  return year + 543;
}

/**
 * แปลง Date เป็น string รูปแบบ ISO date เท่านั้น "YYYY-MM-DD"
 * ใช้สำหรับเปรียบเทียบหรือส่ง API แทนการเขียน toISOString().split("T")[0] ซ้ำ
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * ดึงส่วนวันที่ "YYYY-MM-DD" จาก ISO datetime string (เช่น "2024-01-15T10:30:00.000Z")
 * ใช้เมื่อ input เป็น string ไม่ใช่ Date เพื่อไม่ต้อง parse เป็น Date
 */
export function getISODatePart(isoDateTime: string): string {
  const idx = isoDateTime.indexOf("T");

  return idx === -1 ? isoDateTime : isoDateTime.slice(0, idx);
}

/**
 * แยกชื่อเต็มเป็น firstName และ lastName (คั่นด้วยช่องว่าง)
 * ส่วนแรกเป็น firstName ส่วนที่เหลือรวมเป็น lastName
 */
export function parseFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";

  return { firstName, lastName };
}

/**
 * แปลง route param id เป็นจำนวนเต็มบวก สำหรับ API [id] routes
 * @returns จำนวนเต็มบวก หรือ null ถ้า parse ไม่ได้/ไม่ใช่จำนวนบวก
 */
export function parsePositiveIntId(id: string): number | null {
  const n = Number.parseInt(id, 10);

  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
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
 * แปลง string วันที่/เวลา (หรือ undefined/null) เป็นข้อความรูปแบบ th-TH
 * ใช้ใน UI เมื่อรับค่าจาก API เป็น string
 * @param value ISO date string หรือ undefined/null
 * @returns ข้อความเช่น "15 ม.ค. 2568 14:30" หรือ "-" ถ้าไม่ถูกต้อง
 */
export function formatDateTimeFromString(
  value: string | undefined | null,
): string {
  if (value == null || String(value).trim() === "") return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * แปลงจำนวนนาทีเป็นข้อความ "X ชม. Y นาที" หรือ "Y นาที"
 * @param minutes จำนวนนาที (อาจเป็นทศนิยม)
 * @returns ข้อความเช่น "1 ชม. 30 นาที" หรือ "45 นาที" หรือ "-" ถ้า 0
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes === 0) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours > 0) return `${hours} ชม. ${mins} นาที`;

  return `${mins} นาที`;
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
      startDate: toISODateString(start),
      endDate: toISODateString(end),
    };
  }

  if (filterState.mode === "fiscal-year" && filterState.fiscalYear) {
    const { start, end } = getFiscalYearRange(filterState.fiscalYear);

    return {
      startDate: toISODateString(start),
      endDate: toISODateString(end),
    };
  }

  return {};
}

/**
 * ========================================
 * AUTHENTICATION ERROR MAPPING
 * ========================================
 */

/**
 * แปลง error code จาก authentication เป็นข้อความภาษาไทย
 * @param code - Error code จาก authentication system
 * @returns ข้อความภาษาไทยที่อธิบาย error
 */
export function mapAuthErrorToMessage(code: string): string {
  switch (code) {
    case "LINE_LDAP_REQUIRED":
      return "กรุณาเข้าสู่ระบบด้วยบัญชีโรงพยาบาล (LDAP) อย่างน้อยหนึ่งครั้งก่อน แล้วค่อยเชื่อมบัญชี LINE";
    case "LINE_ACCOUNT_IN_USE":
      return "บัญชี LINE นี้ถูกผูกไว้กับผู้ใช้อื่นแล้ว กรุณาให้เจ้าของบัญชีนั้นยกเลิกก่อน";
    case "LINE_ACCOUNT_ALREADY_LINKED":
      return "บัญชีของคุณมีการเชื่อม LINE อยู่แล้ว กรุณายกเลิกการเชื่อมเดิมก่อน";
    case "LINE_ACCOUNT_ID_MISSING":
      return "ไม่พบข้อมูลผู้ใช้จาก LINE กรุณาลองใหม่หรือแจ้งผู้ดูแลระบบ";
    case "OAuthAccountNotLinked":
      return "บัญชี LINE นี้เชื่อมกับผู้ใช้อื่น หรือยังไม่ได้ยืนยันกับ LDAP";
    case "AccessDenied":
      return "การเข้าถึงถูกปฏิเสธ กรุณาลองใหม่หรือแจ้งผู้ดูแลระบบ";
    case "ACCOUNT_DISABLED":
      return "บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    case "MISSING_CREDENTIALS":
      return "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
    case "USER_NOT_FOUND":
      return "ไม่พบผู้ใช้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้อีกครั้ง";
    case "INVALID_CREDENTIALS":
      return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    case "CONNECTION_ERROR":
      return "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง";
    case "INTERNAL_ERROR":
      return "เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแลระบบ";
    default:
      return "";
  }
}

/**
 * ========================================
 * PROFILE ERROR MESSAGES
 * ========================================
 */

/**
 * แปลง error code จาก profile API เป็นข้อความภาษาไทย
 * @param errorCode - Error code จาก profile API
 * @returns ข้อความภาษาไทยที่อธิบาย error
 */
export function getProfileErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // Display Name
    DISPLAY_NAME_REQUIRED: "กรุณากรอกชื่อที่แสดง",
    DISPLAY_NAME_TOO_SHORT: "ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร",
    DISPLAY_NAME_TOO_LONG: "ชื่อที่แสดงต้องมีความยาวไม่เกิน 100 ตัวอักษร",

    // Phone
    PHONE_REQUIRED: "กรุณากรอกโทรศัพท์ภายใน",
    PHONE_INVALID_FORMAT: "โทรศัพท์ภายในต้องมีตัวเลขอย่างน้อย 3 ตัว",
    MOBILE_INVALID_FORMAT: "รูปแบบหมายเลขมือถือไม่ถูกต้อง",

    // Organization by ID (HRD)
    PERSON_TYPE_REQUIRED: "กรุณาเลือกกลุ่มบุคลากร",
    PERSON_TYPE_NOT_FOUND: "ไม่พบกลุ่มบุคลากรที่เลือก",
    POSITION_REQUIRED: "กรุณาเลือกตำแหน่ง",
    POSITION_NOT_FOUND: "ไม่พบตำแหน่งที่เลือก",
    DEPARTMENT_ID_REQUIRED: "กรุณาเลือกกลุ่มภารกิจ",
    DEPARTMENT_ID_NOT_FOUND: "ไม่พบกลุ่มภารกิจที่เลือก",
    DEPARTMENT_SUB_ID_REQUIRED: "กรุณาเลือกกลุ่มงาน",
    DEPARTMENT_SUB_ID_NOT_FOUND: "ไม่พบกลุ่มงานที่เลือก",
    DEPARTMENT_SUB_SUB_ID_REQUIRED: "กรุณาเลือกหน่วยงาน",
    DEPARTMENT_SUB_SUB_ID_NOT_FOUND: "ไม่พบหน่วยงานที่เลือก",

    // Role
    ROLE_REQUIRED: "กรุณาเลือกบทบาท",
    ROLE_INVALID: "บทบาทไม่ถูกต้อง",

    // General
    INVALID_TYPE: "ประเภทข้อมูลไม่ถูกต้อง",
    INVALID_ID_TYPE: "รูปแบบรหัสอ้างอิงไม่ถูกต้อง",
    INVALID_REQUEST: "ข้อมูลไม่ถูกต้อง",
    NO_MUTATIONS: "ไม่มีการเปลี่ยนแปลงข้อมูล",
    UNAUTHORIZED: "คุณไม่มีสิทธิ์เข้าถึง",
    NOT_FOUND: "ไม่พบข้อมูล",
  };

  return errorMessages[errorCode] || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

/**
 * ========================================
 * LDAP MEMBER OF PARSING
 * ========================================
 */

/**
 * Interface สำหรับ parsed memberOf group (ใช้เฉพาะใน parseMemberOf)
 */
interface MemberOfGroup {
  cn: string;
  fullDn: string;
}

/**
 * แปลง memberOf string จาก LDAP เป็น array ของ groups
 * @param memberOf - memberOf string จาก LDAP (format: "CN=Group1,OU=...;CN=Group2,OU=...")
 * @returns array ของ MemberOfGroup objects
 */
export function parseMemberOf(memberOf: string): MemberOfGroup[] {
  if (!memberOf || memberOf.trim().length === 0) {
    return [];
  }

  // Split by semicolon and process each DN
  const groups = memberOf
    .split(";")
    .map((dn) => dn.trim())
    .filter((dn) => dn.length > 0)
    .map((dn) => {
      // Match CN=value, handling various formats including spaces
      // Pattern: CN= followed by value (can contain spaces) until comma or end
      const cnMatch = dn.match(/^CN=([^,]+?)(?=,|$)/i);

      if (cnMatch && cnMatch[1]) {
        const cn = cnMatch[1].trim();

        return {
          cn,
          fullDn: dn,
        };
      }

      // Fallback: if no CN found, try to extract from the beginning
      const firstPart = dn.split(",")[0];

      if (firstPart) {
        const cn = firstPart.replace(/^CN=/i, "").trim();

        return {
          cn: cn || dn,
          fullDn: dn,
        };
      }

      // Last fallback: use the DN itself
      return {
        cn: dn,
        fullDn: dn,
      };
    })
    .filter((group) => group.cn.length > 0);

  // Remove duplicates based on full DN
  const uniqueGroups = Array.from(
    new Map(groups.map((group) => [group.fullDn, group])).values(),
  );

  // Sort by CN for consistent display
  return uniqueGroups.sort((a, b) => a.cn.localeCompare(b.cn));
}
