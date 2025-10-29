// NextAuthOptions type is not exported from next-auth in this version
import type {
  ExtendedUser,
  ExtendedToken,
  ExtendedSession,
  LDAPErrorCode,
} from "@/types/ldap";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import LineProvider from "next-auth/providers/line";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { createLDAPService } from "@/lib/ldap";
import { prisma } from "@/lib/prisma";

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
        // eslint-disable-next-line no-console
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
];

if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
  providers.push(
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  );
}

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
        const name = user.name as string | undefined;
        const department = (user.department ?? null) as string | null;
        const title = (user.title ?? null) as string | null;
        const groups = (user.groups ?? null) as string | null;
        const role = (user.role ?? "user") as "admin" | "user";

        // หากไม่มีอีเมล ให้ fallback ใช้ ldapId เพื่อป้องกัน unique constraint
        const whereEmail = email ?? `ldap-${ldapId}`;

        const dbUser = await prisma.user.upsert({
          where: { email: whereEmail },
          update: {
            name,
            department,
            title,
            groups,
            role,
            providerType: "ldap",
            ldapId,
          },
          create: {
            email: whereEmail,
            name,
            department,
            title,
            groups,
            role,
            providerType: "ldap",
            ldapId,
          },
        });

        // บังคับให้ NextAuth ใช้ id ของเรคคอร์ดในฐานข้อมูลเป็น user.id (จะไปอยู่ใน token.sub)
        user.id = dbUser.id;
      }

      return true;
    },
    async jwt({
      token,
      user,
      account,
    }: {
      token: any;
      user: any;
      account: any;
    }): Promise<ExtendedToken> {
      if (user) {
        const extendedUser = user as ExtendedUser;

        token.department = extendedUser.department;
        token.title = extendedUser.title;
        token.groups = extendedUser.groups;
        token.role = extendedUser.role;
        // ตั้งค่า provider_type จาก account เมื่อมีการล็อกอินครั้งนี้
        if (account?.provider) {
          token.provider_type =
            account.provider === "credentials" ? "ldap" : account.provider;
        }
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
        session.user.id = token.sub!;
        session.user.department = token.department as string;
        session.user.title = token.title as string;
        session.user.groups = token.groups as string;
        session.user.role = token.role as "admin" | "user";
        session.user.provider_type = token.provider_type as string;
      }

      return session as ExtendedSession;
    },
  },
  events: {
    // อัปเดต providerType ใน DB หลังจากเชื่อมบัญชี OAuth/LINE สำเร็จ
    async linkAccount({ user, account }: { user: any; account: any }) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            providerType:
              account?.provider === "credentials"
                ? "ldap"
                : (account?.provider as string | undefined),
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
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

const handler = (NextAuth as any)(authOptions);

export { handler as GET, handler as POST };
