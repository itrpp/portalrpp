import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// ========================================
// NEXT AUTH CONFIGURATION
// ========================================

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
        authMethod: {
          label: 'Auth Method',
          type: 'text',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const endpoint = credentials.authMethod === 'ldap'
          ? '/api-gateway/auth/login-ldap'
          : '/api-gateway/auth/login';

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            credentials.authMethod === 'ldap'
              ? {
                username: credentials.email,
                password: credentials.password,
              }
              : {
                email: credentials.email,
                password: credentials.password,
                authMethod: credentials.authMethod || 'local',
              }
          ),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        const data = await response.json();

        if (data.success && data.user) {
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            accessToken: data.accessToken || data.data?.token,
            refreshToken: data.refreshToken || data.data?.refreshToken,
            sessionToken: data.sessionToken,
          };
        }

        throw new Error('การเข้าสู่ระบบไม่สำเร็จ');
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // เมื่อมีการ login ใหม่
      if (user) {
        if (user.accessToken) token.accessToken = user.accessToken;
        if (user.refreshToken) token.refreshToken = user.refreshToken;
        if (user.sessionToken) token.sessionToken = user.sessionToken;
        if (user.role) token.role = user.role;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }

      // ตรวจสอบ token expiration และ refresh ถ้าจำเป็น
      if (token.accessToken && token.refreshToken) {
        try {
          const [, payload] = (token.accessToken as string).split('.');
          if (!payload) throw new Error('Invalid JWT payload');

          const tokenData = JSON.parse(atob(payload));
          const currentTime = Date.now() / 1000;
          const bufferTime = 5 * 60; // 5 minutes buffer

          if (tokenData.exp < (currentTime + bufferTime)) {
            // Token จะหมดอายุใน 5 นาที หรือหมดอายุแล้ว
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            const response = await fetch(`${API_BASE_URL}/api-gateway/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refreshToken: token.refreshToken,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                token.accessToken = data.data?.token || data.accessToken;
                token.refreshToken = data.data?.refreshToken || data.refreshToken;
                token.sessionToken = data.sessionToken;
              }
            } else {
              // Refresh token หมดอายุ ให้ logout
              delete token.accessToken;
              delete token.refreshToken;
              delete token.sessionToken;
            }
          }
        } catch {
          // ถ้าเกิด error ให้ clear tokens
          delete token.accessToken;
          delete token.refreshToken;
          delete token.sessionToken;
        }
      }

      // จัดการ session update
      if (trigger === 'update' && session) {
        Object.assign(token, session);
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.sessionToken = token.sessionToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here-change-in-production',
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 