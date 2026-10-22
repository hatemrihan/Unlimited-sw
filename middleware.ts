import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { adminEmails } from '@/lib/admins';
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from '@/login/adminCookie';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Skip the login page and access-denied page
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/access-denied')) {
    return NextResponse.next();
  }

  // 2. Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Check A: the emergency password cookie.
    //
    // Verified with the same signature check the API guard uses, so a page and
    // an API route can never disagree about whether a cookie is valid. It used
    // to be compared directly against ADMIN_COOKIE_SECRET, which meant the
    // cookie WAS the secret and never actually expired.
    const adminAuth = request.cookies.get(ADMIN_COOKIE_NAME);

    if (await verifyAdminCookie(adminAuth?.value, process.env.ADMIN_COOKIE_SECRET)) {
      return NextResponse.next();
    }

    // Check B: NextAuth JWT session (Google OAuth)
    // NextAuth on Netlify Edge sometimes struggles to detect if the request is secure
    // due to missing or altered x-forwarded-proto headers. We will explicitly check both.
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';

    let token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: cookieName,
    });

    // Fallback if the automatic detection failed (common on edge networks)
    if (!token) {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: isSecure ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
      });
    }

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
  /**
   * The admin branch only.
   *
   * It used to match every public page too, to stamp the path into a header
   * the root layout read for the language. Each language now has its own root
   * layout (see app/components/StoreShell.tsx), so shoppers' page views no
   * longer pass through middleware at all.
   */
  matcher: ['/admin/:path*'],
};
