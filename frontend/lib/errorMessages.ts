/**
 * Mapping จาก error code (ฝั่ง backend / API) → ข้อความภาษาไทย
 */
export const API_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
  FORBIDDEN: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  PORTER_SERVICE_UNAVAILABLE: 'บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  INVALID_ARGUMENT: 'ข้อมูลไม่ถูกต้อง',
  VALIDATION_ERROR: 'ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  CREATION_FAILED: 'ไม่สามารถสร้างคำขอได้ กรุณาลองอีกครั้ง',
  UPDATE_FAILED: 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองอีกครั้ง',
  INTERNAL_SERVER_ERROR: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  INTERNAL_ERROR: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
};

/**
 * ดึงข้อความ error เป็นภาษาไทย โดยลำดับ:
 * 1. ถ้ามี code → ใช้ message จาก map
 * 2. ถ้าไม่มี → ใช้ fallback
 * 3. ถ้าไม่มีทั้งคู่ → ใช้ข้อความ generic
 */
export function getApiErrorMessage(code?: string | null, fallback?: string | null): string {
  if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
  if (fallback) return fallback;

  return 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
}
