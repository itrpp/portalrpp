// NextAuthOptions type is not exported from next-auth in this version
import type {
  ExtendedUser,
  ExtendedToken,
  ExtendedSession,
  LDAPErrorCode,
} from "@/types/ldap";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { createLDAPService } from "@/lib/ldap";

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
    // eslint-disable-next-line no-console
    console.error("LDAP authentication error:", error);

    // Re-throw error เพื่อให้ NextAuth จัดการต่อ
    throw error;
  } finally {
    await ldapService.disconnect();
  }
}

export const authOptions: any = {
  providers: [
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
            throw new Error(
              "การเข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง",
            );
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
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: any;
      user: any;
    }): Promise<ExtendedToken> {
      if (user) {
        const extendedUser = user as ExtendedUser;

        token.department = extendedUser.department;
        token.title = extendedUser.title;
        token.groups = extendedUser.groups;
        token.role = extendedUser.role;
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
      if (token) {
        const extendedSession = session as ExtendedSession;

        extendedSession.user.id = token.sub!;
        extendedSession.user.department = token.department as string;
        extendedSession.user.title = token.title as string;
        extendedSession.user.groups = token.groups as string;
        extendedSession.user.role = token.role as "admin" | "user";
      }

      return session as ExtendedSession;
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
