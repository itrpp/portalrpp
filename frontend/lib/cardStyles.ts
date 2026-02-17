/**
 * Shared Card styling constants สำหรับทั้งแอป
 * ใช้เพื่อให้การแสดงผล Card สอดคล้องกัน (Setting, Porter)
 */
export const CARD_STYLES = {
  /** Card หลักของหน้า (รายการ, ฟอร์ม) */
  default: 'shadow-lg border border-default-200',
  /** Card ที่เน้นกรอบ (เช่น หน้ารายการคำขอ) */
  highlight: 'border-2 border-default-200',
  /** Card สำหรับ chart / stat (shadow น้อย + hover) */
  chart: 'shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300',
  /** Card ใน drawer/modal (shadow น้อย) */
  inset: 'shadow-xs border border-default-200 bg-content1',
} as const;
