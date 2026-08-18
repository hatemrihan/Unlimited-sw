import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminEmails } from '@/lib/admins';
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from '@/login/adminCookie';

/**
 * Reports whether the caller is signed in, and whether they are an admin.
 *
 * Deliberately public: it answers about the caller's own cookies and returns no
 * data either way, so there is nothing here to protect.
 *
 * Both checks below match `requireAdmin` exactly. When these three disagreed,
 * the UI and the API disagreed about who was an admin — which is how a removed
 * admin kept API access while losing the dashboard.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    // The LIVE admin list, not the `isAdmin` stamped into the token at sign-in.
    const email = session.user.email?.toLowerCase();
    const role = email && adminEmails.includes(email) ? 'admin' : null;

    return NextResponse.json(
      { authenticated: true, role },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Emergency password cookie — verified by signature and age, as everywhere else.
  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (await verifyAdminCookie(adminCookie, process.env.ADMIN_COOKIE_SECRET)) {
    return NextResponse.json(
      { authenticated: true, role: 'admin' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { authenticated: false, role: null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
