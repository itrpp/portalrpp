/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  providers: [
    // Local Credentials Provider
    CredentialsProvider({
      id: "local",
      name: "Local Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== LOCAL PROVIDER AUTHORIZE CALLED ===");
        if (!credentials?.email || !credentials?.password) {
          console.log("Local auth: Missing credentials");
          return null;
        }

        try {
          const API_BASE_URL =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:3001";

          console.log("Local auth: Attempting login with", {
            email: credentials.email,
            API_BASE_URL,
          });

          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              authType: "local",
            }),
          });

          console.log("Local auth: Response status", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Local login failed:", {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
            return null;
          }

          const data = await response.json();
          console.log("Local auth: Response data", data);

          if (data.user && data.token) {
            const user = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              authType: data.user.authType,
              accessToken: data.token,
              refreshToken: data.refreshToken,
            };
            console.log("Local auth: Returning user", user);
            return user;
          }

          console.log("Local auth: No user or token in response");
          return null;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Local auth error:", error);
          return null;
        }
      },
    }),
    // LDAP Credentials Provider
    CredentialsProvider({
      id: "ldap",
      name: "LDAP",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const API_BASE_URL =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:3001";

          const response = await fetch(`${API_BASE_URL}/api/auth/ldap`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            // eslint-disable-next-line no-console
            console.error(
              "LDAP login failed:",
              response.status,
              response.statusText,
            );
            return null;
          }

          const data = await response.json();

          if (data.user && data.token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              authType: data.user.authType,
              accessToken: data.token,
              refreshToken: data.refreshToken,
            };
          }

          return null;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("LDAP auth error:", error);
          return null;
        }
      },
    }),
    // Auto Provider (tries LDAP first, then local)
    CredentialsProvider({
      id: "auto",
      name: "Auto Login",
      credentials: {
        email: { label: "Email/Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const API_BASE_URL =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:3001";

          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              authType: "auto",
            }),
          });

          if (!response.ok) {
            // eslint-disable-next-line no-console
            console.error(
              "Auto login failed:",
              response.status,
              response.statusText,
            );
            return null;
          }

          const data = await response.json();

          if (data.user && data.token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              authType: data.user.authType,
              accessToken: data.token,
              refreshToken: data.refreshToken,
            };
          }

          return null;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Auto auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.role = (user as any).role;
        token.authType = (user as any).authType;
      }

      // Log for debugging
      if (trigger === "signIn") {
        console.log("JWT callback - signIn:", { token, user });
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session as any).accessToken = token.accessToken;
        (session as any).refreshToken = token.refreshToken;
        (session.user as any).role = token.role;
        (session.user as any).authType = token.authType;
        (session.user as any).id = token.sub;
      }

      // Log for debugging
      console.log("Session callback:", session);

      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback:", { url, baseUrl });

      // ป้องกัน infinite redirect loop
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // ถ้า url มี callbackUrl ที่ซ้ำกัน ให้ redirect ไปยัง dashboard
      if (url.includes("callbackUrl") && url.includes("/auth/login")) {
        console.log("Preventing infinite redirect, going to dashboard");
        return `${baseUrl}/dashboard`;
      }

      // ถ้า url เป็น baseUrl หรือ login page ให้ redirect ไปยัง dashboard
      if (url === baseUrl || url === `${baseUrl}/auth/login`) {
        return `${baseUrl}/dashboard`;
      }

      // สำหรับ external URLs ที่ไม่ปลอดภัย
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch (error) {
        console.error("Invalid URL in redirect:", url, error);
      }

      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
