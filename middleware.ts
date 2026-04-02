import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminAuth = request.cookies.get('adminAuthenticated');
    const adminSecret = process.env.ADMIN_COOKIE_SECRET;

    if (!adminSecret || !adminAuth || adminAuth.value !== adminSecret) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
