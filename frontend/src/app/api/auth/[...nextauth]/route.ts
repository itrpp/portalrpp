/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  providers: [
    // Local Credentials Provider
    CredentialsProvider({
      id: "credentials",
      name: "Local Account",
      credentials: {
        email: { label: "Email", type: "email" },
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
              authType: "local",
            }),
          });

          if (!response.ok) {
            // eslint-disable-next-line no-console
            console.error(
              "Local login failed:",
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
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.role = (user as any).role;
        token.authType = (user as any).authType;
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
      return session;
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
