import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session && (session.user as any)?.isAdmin) {
    return null; // NextAuth admin — authorized
  }

  // Fallback: legacy cookie-based admin (simple password login)
  const cookieStore = await cookies();
  const legacyCookie = cookieStore.get('adminAuthenticated')?.value;
  const adminSecret = process.env.ADMIN_COOKIE_SECRET;
  
  if (adminSecret && legacyCookie === adminSecret) {
    return null; // Cookie admin — authorized
  }

  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
