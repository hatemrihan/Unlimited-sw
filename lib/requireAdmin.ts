import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminEmails } from '@/lib/admins';
import { cookies } from 'next/headers';
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from '@/login/adminCookie';

/**
 * The guard every admin API route must call.
 *
 * REVOCATION — why this checks the email and not `session.user.isAdmin`:
 *
 * `isAdmin` is stamped into the JWT once, when the person signs in, and the
 * token then lives for the whole session. Trusting it meant that removing
 * somebody from ADMIN_EMAILS took away the dashboard immediately (middleware
 * re-checks the list on every request) but left their API access intact until
 * the token expired — up to 30 days of editing products and prices after being
 * removed.
 *
 * Reading `adminEmails` here makes removal take effect on the very next request,
 * and makes the page guard and the API guard agree with each other.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (email && adminEmails.includes(email)) {
    return null; // Google admin — authorized against the live list
  }

  // Emergency door: the signed password cookie. Its age is verified on the
  // server, so a copied cookie stops working after 24 hours.
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (await verifyAdminCookie(adminCookie, process.env.ADMIN_COOKIE_SECRET)) {
    return null;
  }

  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
