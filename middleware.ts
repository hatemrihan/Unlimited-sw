import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip the login page itself
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    // Check 1: NextAuth JWT session (Google OAuth)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token?.email) {
      return NextResponse.next();
    }

    // Check 2: Legacy cookie-based auth (password login)
    const adminAuth = request.cookies.get('adminAuthenticated');
    const adminSecret = process.env.ADMIN_COOKIE_SECRET;

    if (adminSecret && adminAuth && adminAuth.value === adminSecret) {
      return NextResponse.next();
    }

    // Neither auth method passed — redirect to login
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
