import type { ExtendedSession } from "@/types/ldap";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import ProfileClient from "./ProfileClient";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserProfile } from "@/lib/profile";

export default async function ProfilePage() {
  const session = (await getServerSession(
    authOptions as any,
  )) as ExtendedSession;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile")}`);
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">โปรไฟล์ผู้ใช้งาน</h1>
        <p className="text-default-600 mt-2">
          ปรับปรุงข้อมูลติดต่อ และเชื่อมบัญชี LINE หลังผ่านการยืนยันด้วย LDAP
        </p>
      </div>

      <ProfileClient initialProfile={profile} />
    </div>
  );
}
