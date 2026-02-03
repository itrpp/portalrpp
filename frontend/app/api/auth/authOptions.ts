// NextAuthOptions type is not exported from next-auth in this version
import type {
  ExtendedUser,
  ExtendedToken,
  ExtendedSession,
  LDAPErrorCode,
} from "@/types/ldap";

import CredentialsProvider from "next-auth/providers/credentials";
import LineProvider from "next-auth/providers/line";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

import { createLDAPService } from "@/lib/ldap";
import { prisma } from "@/lib/prisma";
import { callPorterService } from "@/lib/grpcClient";

const LINE_PROVIDER_ID = "line";
const LINE_LOGIN_GUARD_CODE = "LINE_LDAP_REQUIRED";

type MinimalUserRecord = {
  id: string;
  ldapId: string | null;
  lineDisplayName: string | null;
  lineUserId: string | null;
  displayName: string | null;
};

async function findUserById(
  userId?: string,
): Promise<MinimalUserRecord | null> {
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      ldapId: true,
      lineDisplayName: true,
      lineUserId: true,
      displayName: true,
    },
  });
}

async function findUserByLineAccount(
  providerAccountId?: string,
): Promise<MinimalUserRecord | null> {
  if (!providerAccountId) {
    return null;
  }

  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: LINE_PROVIDER_ID,
        providerAccountId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          ldapId: true,
          lineDisplayName: true,
          lineUserId: true,
          displayName: true,
        },
      },
    },
  });

  return account?.user ?? null;
}

async function getSessionUser(): Promise<MinimalUserRecord | null> {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("__Secure-next-auth.session-token")?.value ||
    cookieStore.get("next-auth.session-token")?.value;

  const secret = process.env.NEXTAUTH_SECRET || "your-secret-key-here";

  if (!sessionToken || !secret) {
    return null;
  }

  const decoded = await decode({
    token: sessionToken,
    secret,
  });

  if (!decoded?.sub) {
    return null;
  }

  return findUserById(decoded.sub);
}

async function assertLineOwnership({
  targetLineUserId,
  currentUserId,
}: {
  targetLineUserId?: string | null;
  currentUserId?: string | null;
}) {
  if (!targetLineUserId || !currentUserId) {
    return;
  }

  const existing = await prisma.user.findFirst({
    where: {
      lineUserId: targetLineUserId,
      NOT: { id: currentUserId },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("LINE_ACCOUNT_IN_USE");
  }
}

function extractLineProfileInfo(account: any, profile: any) {
  const lineUserId =
    account?.providerAccountId ?? profile?.userId ?? profile?.sub ?? null;
  const lineDisplayName = profile?.displayName ?? profile?.name ?? null;
  const pictureFromProfile =
    typeof profile?.picture === "string"
      ? profile.picture
      : (profile?.picture?.url ?? null);
  const lineAvatar =
    profile?.pictureUrl ??
    pictureFromProfile ??
    account?.pictureUrl ??
    account?.profile?.pictureUrl ??
    account?.image_url ??
    null;

  return { lineUserId, lineDisplayName, lineAvatar };
}

/**
 * LDAP Authentication Function - ใช้ LDAPService ใหม่
 */
async function authenticateLDAP(
  username: string,
  password: string,
): Promise<ExtendedUser | null> {
  const ldapService = createLDAPService();

  try {
    const result = await ldapService.authenticate(username, password);

    if (result.success && result.user) {
      return result.user;
    }

    // ถ้าไม่สำเร็จ ให้ throw error ด้วย error code เท่านั้น
    if (result.errorCode) {
      throw new Error(result.errorCode);
    }

    return null;
  } catch (error) {
    // Re-throw error เพื่อให้ NextAuth จัดการต่อ
    throw error;
  } finally {
    await ldapService.disconnect();
  }
}

// เตรียม providers โดยเปิด LINE แบบมีเงื่อนไขตาม env
const providers: any[] = [
  CredentialsProvider({
    id: "credentials",
    name: "RPP Hospital Login",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials): Promise<ExtendedUser | null> {
      if (!credentials?.username || !credentials?.password) {
        // ข้อความสำหรับผู้ใช้ (UI) เมื่อข้อมูลไม่ครบ
        throw new Error("กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
      }

      try {
        // ใช้ LDAP Authentication เท่านั้น
        const user = await authenticateLDAP(
          credentials.username,
          credentials.password,
        );

        if (!user) {
          // ใช้ generic error message เพื่อความปลอดภัย
          throw new Error("การเข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
        }

        return user;
      } catch (error) {
        console.error("Authentication error:", error);

        // แปลง error code -> ข้อความภาษาไทยสำหรับผู้ใช้
        const mapErrorCodeToMessage = (code: LDAPErrorCode): string => {
          switch (code) {
            case "MISSING_CREDENTIALS":
              return "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน";
            case "USER_NOT_FOUND":
              return "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
            case "ACCOUNT_DISABLED":
              return "บัญชีผู้ใช้นี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
            case "USER_NOT_AUTHORIZED":
              return "ผู้ใช้ไม่อยู่ในกลุ่มที่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ";
            case "INVALID_CREDENTIALS":
              return "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง";
            case "CONNECTION_ERROR":
              return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AD ได้ กรุณาติดต่อผู้ดูแลระบบ";
            case "INTERNAL_ERROR":
            default:
              return "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง";
          }
        };

        if (error instanceof Error) {
          const code = error.message as LDAPErrorCode;

          const message = mapErrorCodeToMessage(code);

          throw new Error(message);
        }

        throw new Error("เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง");
      }
    },
  }),
  LineProvider({
    clientId: process.env.LINE_CLIENT_ID as string,
    clientSecret: process.env.LINE_CLIENT_SECRET as string,
  }),
];

export const authOptions: any = {
  // ใช้ PrismaAdapter เพื่อบันทึก/ซิงค์ข้อมูลผู้ใช้ใน MySQL (ยังใช้ JWT สำหรับ session)
  adapter: PrismaAdapter(prisma as any),
  providers,
  session: {
    strategy: "jwt", // ใช้ JWT strategy เพื่อรองรับ LDAP authentication
    maxAge: 1 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({
      user,
      account,
      profile: _profile,
    }: {
      user: any;
      account: any;
      profile: any;
    }) {
      // สำหรับ LDAP users: กำหนด provider_type และ upsert ผู้ใช้ลงฐานข้อมูล
      if (account?.provider === "credentials") {
        // upsert โดยอิงจาก email เป็นหลัก (และเก็บ ldapId หากมี)
        const email = user.email as string | undefined;
        const ldapId = user.id as string | undefined;
        const ldapDisplayName = user.displayName as string | undefined;
        const department = (user.department ?? null) as string | null;
        const position = (user.position ?? null) as string | null;
        const memberOf = (user.memberOf ?? null) as string | null;
        const role = (user.role ?? "user") as "admin" | "user";

        // หากไม่มีอีเมล ให้ fallback ใช้ ldapId เพื่อป้องกัน unique constraint
        const whereEmail = email ?? `ldap-${ldapId}`;

        const dbUser = await prisma.user.upsert({
          where: { email: whereEmail },
          update: {
            ldapDisplayName,
            memberOf,
            ldapId,
          },
          create: {
            email: whereEmail,
            ldapDisplayName,
            department,
            position,
            memberOf,
            role,
            ldapId,
          },
        });

        // บังคับให้ NextAuth ใช้ id ของเรคคอร์ดในฐานข้อมูลเป็น user.id (จะไปอยู่ใน token.sub)
        user.id = dbUser.id;

        return true;
      }

      if (account?.provider === LINE_PROVIDER_ID) {
        const linkedUser =
          (await getSessionUser()) ??
          (await findUserById(user?.id)) ??
          (await findUserByLineAccount(account.providerAccountId));

        const hasLdapProof = Boolean(linkedUser?.ldapId);

        if (!linkedUser || !hasLdapProof) {
          throw new Error(LINE_LOGIN_GUARD_CODE);
        }

        const ldapService = createLDAPService();
        const check = await ldapService.checkAccountStatusByLdapId(
          linkedUser.ldapId!,
        );

        if (!check.success) {
          throw new Error(check.errorCode);
        }

        const { lineUserId, lineDisplayName, lineAvatar } =
          extractLineProfileInfo(account, _profile);

        if (!lineUserId) {
          throw new Error("LINE_ACCOUNT_ID_MISSING");
        }

        if (linkedUser.lineUserId && linkedUser.lineUserId !== lineUserId) {
          throw new Error("LINE_ACCOUNT_ALREADY_LINKED");
        }

        await assertLineOwnership({
          targetLineUserId: lineUserId,
          currentUserId: linkedUser.id,
        });

        const updateData: any = {
          lineUserId,
        };

        if (lineDisplayName) {
          updateData.lineDisplayName = lineDisplayName;
        }

        if (lineAvatar) {
          updateData.image = lineAvatar;
        }

        await prisma.user.update({
          where: { id: linkedUser.id },
          data: updateData,
        });

        user.id = linkedUser.id;

        return true;
      }

      return true;
    },
    async jwt({
      token,
      user,
      account: _account,
    }: {
      token: any;
      user: any;
      account: any;
    }): Promise<ExtendedToken> {
      const possibleUser = user as ExtendedUser | undefined;
      const userId = possibleUser?.id ?? token.sub;

      if (!userId) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          department: true,
          position: true,
          memberOf: true,
          role: true,
          phone: true,
          mobile: true,
          lineDisplayName: true,
          lineUserId: true,
          image: true,
          ldapDisplayName: true,
          // โครงสร้างองค์กรอิง ID จาก HRD
          personTypeId: true,
          positionId: true,
          departmentId: true,
          departmentSubId: true,
          departmentSubSubId: true,
        },
      });

      if (!dbUser) {
        return token;
      }

      token.displayName = dbUser.displayName ?? undefined;
      token.sub = dbUser.id;
      token.department = dbUser.department ?? undefined;
      token.position = dbUser.position ?? undefined;
      token.memberOf = dbUser.memberOf ?? undefined;
      token.role = (dbUser.role as "admin" | "user") ?? token.role;
      token.phone = dbUser.phone ?? null;
      token.mobile = dbUser.mobile ?? null;
      token.lineDisplayName = dbUser.lineDisplayName ?? null;
      token.lineUserId = dbUser.lineUserId ?? null;
      token.image = dbUser.image ?? null;
      token.ldapDisplayName = dbUser.ldapDisplayName ?? null;
      // โครงสร้างองค์กรอิง ID จาก HRD
      token.personTypeId = dbUser.personTypeId ?? null;
      token.positionId = dbUser.positionId ?? null;
      token.departmentId = dbUser.departmentId ?? null;
      token.departmentSubId = dbUser.departmentSubId ?? null;
      token.departmentSubSubId = dbUser.departmentSubSubId ?? null;

      // ดึง PorterEmployee ที่ผูกกับ user นี้ (ถ้ามี) จาก backend porter
      try {
        const porterResponse = await callPorterService<{
          success: boolean;
          data?: Array<{ id: string }>;
        }>("ListEmployees", { user_id: dbUser.id });

        if (
          porterResponse?.success &&
          Array.isArray(porterResponse.data) &&
          porterResponse.data.length > 0
        ) {
          token.porterEmployee = { id: porterResponse.data[0].id };
        } else {
          token.porterEmployee = null;
        }
      } catch {
        token.porterEmployee = null;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: any;
      token: any;
    }): Promise<ExtendedSession> {
      // สำหรับ JWT session (LDAP และ LINE users)
      if (token) {
        session.user.name = token.displayName ?? undefined;
        session.user.id = token.sub!;
        session.user.department = (token.department as string) ?? null;
        session.user.position = (token.position as string) ?? null;
        session.user.memberOf = (token.memberOf as string) ?? null;
        session.user.role = token.role as "admin" | "user";
        session.user.phone = token.phone ?? null;
        session.user.mobile = token.mobile ?? null;
        session.user.lineDisplayName = token.lineDisplayName ?? null;
        session.user.lineUserId = token.lineUserId ?? null;
        session.user.image = token.image ?? null;
        session.user.ldapDisplayName = token.ldapDisplayName ?? null;
        // โครงสร้างองค์กรอิง ID จาก HRD
        session.user.personTypeId = token.personTypeId ?? null;
        session.user.positionId = token.positionId ?? null;
        session.user.departmentId = token.departmentId ?? null;
        session.user.departmentSubId = token.departmentSubId ?? null;
        session.user.departmentSubSubId = token.departmentSubSubId ?? null;
        session.user.porterEmployee = token.porterEmployee ?? null;
      }

      return session as ExtendedSession;
    },
  },
  events: {
    // อัปเดต providerType ใน DB หลังจากเชื่อมบัญชี OAuth/LINE สำเร็จ
    async linkAccount({
      user,
      account,
      profile,
    }: {
      user: any;
      account: any;
      profile?: any;
    }) {
      try {
        const data: any = {};

        if (account?.provider === LINE_PROVIDER_ID) {
          const { lineUserId, lineDisplayName, lineAvatar } =
            extractLineProfileInfo(account, profile);

          if (lineUserId) {
            await assertLineOwnership({
              targetLineUserId: lineUserId,
              currentUserId: user?.id,
            });
            data.lineUserId = lineUserId;
          }

          if (lineDisplayName) {
            data.lineDisplayName = lineDisplayName;
          }

          if (lineAvatar) {
            data.image = lineAvatar;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data,
        });
      } catch (e) {
        console.warn("Failed to update providerType on linkAccount:", e);
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here",
};
