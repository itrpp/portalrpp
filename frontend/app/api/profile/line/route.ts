import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/profile";

const LINE_PROVIDER_ID = "line";

export async function DELETE() {
  const auth = await getAuthSession();

  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      lineUserId: true,
      ldapId: true,
    },
  });

  if (!user?.lineUserId) {
    return NextResponse.json(
      { success: false, error: "LINE_NOT_LINKED" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.account.deleteMany({
        where: {
          userId: user.id,
          provider: LINE_PROVIDER_ID,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          lineUserId: null,
        },
      }),
    ]);
  } catch (error) {
    console.error("Failed to disconnect LINE:", error);

    return NextResponse.json(
      { success: false, error: "LINE_DISCONNECT_FAILED" },
      { status: 500 },
    );
  }

  const profile = await getUserProfile(user.id);

  return NextResponse.json({
    success: true,
    data: profile,
  });
}
