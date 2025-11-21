import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Admin password (you can move this to environment variable for better security)
const ADMIN_PASSWORD = '012345';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if it's an admin route (excluding login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Check for admin authentication cookie
    const adminAuth = request.cookies.get('adminAuthenticated');
    
    if (!adminAuth || adminAuth.value !== 'true') {
      // Redirect to login page if not authenticated
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};



























