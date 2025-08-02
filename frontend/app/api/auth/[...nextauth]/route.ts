import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// ========================================
// NEXT AUTH CONFIGURATION
// ========================================

export const authOptions = {
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
          return null;
        }

        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const endpoint = credentials.authMethod === 'ldap'
            ? '/api/auth/login-ldap'
            : '/api/auth/login';

          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              credentials.authMethod === 'ldap'
                ? {
                    username: credentials.email, // สำหรับ LDAP ใช้ email เป็น username
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
            return null;
          }

          const data = await response.json();

          if (data.success && data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              sessionToken: data.sessionToken,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.sessionToken = user.sessionToken;
        token.role = user.role;
      }

      // ตรวจสอบ token expiration และ refresh ถ้าจำเป็น
      if (token.accessToken) {
        try {
          const parts = (token.accessToken as string).split('.');
          if (parts.length !== 3) throw new Error('Invalid JWT format');
          const tokenData = JSON.parse(atob(parts[1] as string));
          const currentTime = Date.now() / 1000;

          if (tokenData.exp < currentTime && token.refreshToken) {
            // Token expired, try to refresh
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refreshToken: token.refreshToken,
              }),
            });

            if (!response.ok) {
              return token;
            }

            const data = await response.json();

            if (data.success) {
              token.accessToken = data.data.token;
              token.refreshToken = data.data.refreshToken;
              token.sessionToken = data.sessionToken;
            }
          }
        } catch {
          // ignore
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // ป้องกัน error ถ้า session.user ไม่มี
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
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