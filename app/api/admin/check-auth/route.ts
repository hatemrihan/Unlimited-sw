import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const adminAuth = request.cookies.get('adminAuthenticated');
  
  if (adminAuth && adminAuth.value === 'true') {
    return NextResponse.json({ authenticated: true });
  } else {
    return NextResponse.json({ authenticated: false });
  }
}



















