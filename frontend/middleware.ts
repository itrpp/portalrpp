import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// ========================================
// NEXT AUTH MIDDLEWARE
// ========================================

export default withAuth(
  (req) => {
    const { pathname } = req.nextUrl;
    const {token} = req.nextauth;
    const isLoggedIn = !!token;

    // ตรวจสอบ role สำหรับหน้า admin
    if (pathname.startsWith('/admin')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // ตรวจสอบ authentication สำหรับหน้า dashboard
    if (pathname.startsWith('/dashboard')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // ตรวจสอบ authentication สำหรับหน้า revenue
    if (pathname.startsWith('/revenue')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // ตรวจสอบ authentication สำหรับหน้า theme
    if (pathname.startsWith('/theme')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // อนุญาตให้เข้าถึงหน้า login/signin/error และหน้าแรกได้เสมอ (ป้องกันลูป redirect ของ NextAuth)
        if (pathname === '/login' || pathname === '/' || pathname === '/signin' || pathname === '/error') {
          return true;
        }

        // อนุญาตให้เข้าถึง API routes ได้เสมอ
        if (pathname.startsWith('/api/')) {
          return true;
        }

        // อนุญาตให้เข้าถึง static files ได้เสมอ
        if (pathname.startsWith('/_next/') ||
          pathname.startsWith('/images/') ||
          pathname === '/favicon.ico') {
          return true;
        }

        // ตรวจสอบ authentication สำหรับหน้าอื่นๆ
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}; 