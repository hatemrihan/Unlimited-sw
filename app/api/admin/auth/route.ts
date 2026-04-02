import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const adminSecret = process.env.ADMIN_COOKIE_SECRET;

    if (!ADMIN_PASSWORD || !adminSecret) {
      console.error('[auth] Missing ADMIN_PASSWORD or ADMIN_COOKIE_SECRET env var');
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const { password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('adminAuthenticated', adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('adminAuthenticated', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
