import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// ========================================
// NEXT AUTH MIDDLEWARE
// ========================================

export default withAuth(
  (req) => {
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.nextauth.token;

    // ตรวจสอบ role สำหรับหน้า admin
    if (pathname.startsWith('/admin') && req.nextauth.token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // ตรวจสอบ role สำหรับหน้า dashboard
    if (pathname.startsWith('/dashboard') && !isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // อนุญาตให้เข้าถึงหน้า login และหน้าแรกได้เสมอ
        if (pathname === '/login' || pathname === '/') {
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