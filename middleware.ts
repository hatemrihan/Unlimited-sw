import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { adminEmails } from '@/lib/admins';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Skip the login page and access-denied page
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/access-denied')) {
    return NextResponse.next();
  }

  // 2. Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Check A: Legacy cookie-based auth (password login)
    const adminAuth = request.cookies.get('adminAuthenticated');
    const adminSecret = process.env.ADMIN_COOKIE_SECRET;

    if (adminSecret && adminAuth && adminAuth.value === adminSecret) {
      return NextResponse.next();
    }

    // Check B: NextAuth JWT session (Google OAuth)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Case 1: Not logged in at all
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Case 2: Logged in but not an admin
    if (!token.email || !adminEmails.includes(token.email.toLowerCase())) {
      // Redirect to access-denied instead of login to PREVENT LOOPS
      const deniedUrl = new URL('/access-denied', request.url);
      return NextResponse.redirect(deniedUrl);
    }

    // Case 3: Logged in and IS an admin
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
