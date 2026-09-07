import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { decodeSessionToken } from '@/lib/nextAuthJwt';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      decode: decodeSessionToken,
    });
    const user = token?.sub ?? (token as { email?: string } | null)?.email ?? 'anonymous';

    console.info(`[API] ${req.method} ${pathname} user=${user}`);

    return NextResponse.next();
  }

  if (pathname === '/login') {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    decode: decodeSessionToken,
  });

  if (!token) {
    const loginUrl = new URL('/login', req.url);

    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|public|images|favicon.ico).*)'],
};
