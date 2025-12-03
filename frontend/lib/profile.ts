import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const profileSelect = {
  id: true,
  displayName: true,
  email: true,
  // legacy text fields (ใช้สำหรับแสดงผลช่วง transition)
  department: true,
  position: true,
  memberOf: true,
  role: true,
  phone: true,
  mobile: true,
  image: true,
  lineUserId: true,
  lineDisplayName: true,
  ldapDisplayName: true,
  // โครงสร้างองค์กรแบบอิง ID จาก HRD
  personTypeId: true,
  positionId: true,
  departmentId: true,
  departmentSubId: true,
  departmentSubSubId: true,
} satisfies Prisma.userSelect;

export type ProfileDTO = Prisma.userGetPayload<{
  select: typeof profileSelect;
}>;

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
}
