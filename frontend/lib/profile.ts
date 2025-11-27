import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  title: true,
  groups: true,
  role: true,
  providerType: true,
  phone: true,
  mobile: true,
  image: true,
  lineUserId: true,
  lineDisplayName: true,
} satisfies Prisma.UserSelect;

export type ProfileDTO = Prisma.UserGetPayload<{
  select: typeof profileSelect;
}>;

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
}
