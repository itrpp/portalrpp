import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ป้องกัน infinite redirect สำหรับ auth pages
    if (pathname.startsWith("/auth/")) {
      if (token) {
        // ถ้ามี token แล้วและพยายามเข้า auth pages ให้ redirect ไป dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // ถ้าไม่มี token ให้เข้า auth pages ได้
      return NextResponse.next();
    }

    // สำหรับ protected routes
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // อนุญาตให้เข้า auth pages โดยไม่ต้องมี token
        if (pathname.startsWith("/auth/")) {
          return true;
        }

        // สำหรับ protected routes ต้องมี token
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/auth/:path*",
  ],
};
