import { prisma } from "@/lib/prisma";

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
    console.debug("Failed to update user activity:", error);
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
