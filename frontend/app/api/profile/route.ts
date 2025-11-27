import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/profile";

function normalizeStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("INVALID_TYPE");
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function validatePhone(value: string | null, field: string) {
  if (!value) {
    return;
  }

  const pattern = /^[0-9+\-\s]{6,20}$/;

  if (!pattern.test(value)) {
    throw new Error(`${field.toUpperCase()}_INVALID_FORMAT`);
  }
}

export async function GET() {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const user = await getUserProfile(session.user.id);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: user });
}

export async function PUT(request: Request) {
  const session = (await getServerSession(
    authOptions as any,
  )) as import("@/types/ldap").ExtendedSession;

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const payload = await request.json();
  const editableFields = [
    "phone",
    "mobile",
    "lineDisplayName",
    "image",
  ] as const;
  const updateData: Record<string, string | null> = {};

  try {
    for (const field of editableFields) {
      if (field in payload) {
        const normalized = normalizeStringValue(payload[field]);

        if (field === "phone" || field === "mobile") {
          validatePhone(normalized, field);
        }

        if (
          field === "lineDisplayName" &&
          normalized &&
          normalized.length > 120
        ) {
          throw new Error("LINE_DISPLAY_NAME_TOO_LONG");
        }

        if (field === "image" && normalized && normalized.length > 255) {
          throw new Error("IMAGE_URL_TOO_LONG");
        }

        updateData[field] = normalized;
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, error: "NO_MUTATIONS" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  const user = await getUserProfile(session.user.id);

  return NextResponse.json({
    success: true,
    data: user,
  });
}
