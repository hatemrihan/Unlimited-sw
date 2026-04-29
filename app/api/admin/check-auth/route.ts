import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (session && session.user) {
    // Map the NextAuth isAdmin boolean to the RBAC 'admin' string
    const role = (session.user as any).isAdmin ? 'admin' : null;
    return NextResponse.json(
      { authenticated: true, role: role },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  
  // Restore Native Cookie Fallback resolving `api/admin/auth` static passwords
  const staticLegacyToken = request.cookies.get('adminAuthenticated')?.value;
  const adminSecret = process.env.ADMIN_COOKIE_SECRET;
  if (staticLegacyToken && adminSecret && staticLegacyToken === adminSecret) {
    return NextResponse.json(
      { authenticated: true, role: 'admin' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Final Guard Rejection
  return NextResponse.json(
    { authenticated: false, role: null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}




























