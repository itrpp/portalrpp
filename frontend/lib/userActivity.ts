import { prisma } from '@/lib/prisma';
import { DeviceType } from '@/generated/prisma/enums';

/**
 * อัปเดต lastActivityAt ของผู้ใช้ใน user_activity table
 * ใช้เมื่อผู้ใช้มีการใช้งานระบบ (เช่น เรียก API, navigate หน้า)
 *
 * @param userId - ID ของผู้ใช้ที่ต้องการอัปเดต
 */
export async function updateUserActivity(userId: string): Promise<void> {
  try {
    if (!userId) {
      return;
    }

    await prisma.user_activity.updateMany({
      where: { userId },
      data: {
        lastActivityAt: new Date(),
      },
    });
  } catch (error) {
    // ไม่ throw error เพื่อไม่ให้กระทบการทำงานของระบบหลัก
    // ถ้าไม่มี record ใน user_activity ก็ไม่เป็นไร (อาจจะยังไม่ได้ login)
    console.info('Failed to update user activity:', error);
  }
}

/**
 * อัปเดต lastActivityAt ของผู้ใช้โดยไม่ throw error
 * ใช้ใน middleware หรือ places ที่ไม่ต้องการให้ error กระทบการทำงานหลัก
 *
 * @param userId - ID ของผู้ใช้ที่ต้องการอัปเดต
 */
export async function updateUserActivitySafe(userId: string | undefined): Promise<void> {
  if (!userId) {
    return;
  }

  await updateUserActivity(userId);
}

/**
 * upsert user_activity เมื่อผู้ใช้ login สำเร็จ
 * ใช้ร่วมกันทั้งใน NextAuth signIn event และ /api/auth/login
 *
 * @param userId - ID ของผู้ใช้ที่ต้องการบันทึก activity
 * @param date - วันที่และเวลาที่ login (default: ตอนนี้)
 * @param deviceType - ประเภทของอุปกรณ์ที่ใช้ login (MOBILE_APP หรือ WEB_APP)
 */
export async function upsertUserActivityOnLogin(
  userId: string,
  date: Date = new Date(),
  deviceType?: DeviceType,
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    // ปิด session เดิมที่ยังไม่ logout (ถ้ามี) เพื่อให้มีเพียง 1 session ปัจจุบันที่ active
    await prisma.user_activity.updateMany({
      where: {
        userId,
        logoutAt: null,
      },
      data: {
        logoutAt: date,
      },
    });

    // สร้าง record ใหม่สำหรับการ login ครั้งนี้
    await prisma.user_activity.create({
      data: {
        userId,
        loginAt: date,
        lastActivityAt: date,
        deviceType,
      },
    });
  } catch (error) {
    // ไม่ให้ error นี้ทำให้ flow การ login ล้มเหลว
    console.info('Failed to upsert user_activity on login:', error);
  }
}
